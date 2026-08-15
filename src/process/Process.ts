import { Heater} from '../model/Heater.js';
import Bomb from '../model/Bomb.js';
import Space from '../model/Space.js';
import {Plunger} from '../model/Plunger.js';
import View from '../view/View.js';
import Controller from '../controller/Controller.js';
import { glo } from '../globals/globals.js';

import Diag from './Diag.js';


export enum ProcessState {
    Pause = 0,
    Run = 1,
    Abort = 2,
}

export default class Process 
{
    space: Space;
    controller: Controller;
    plunger: Plunger; 
    view: View;
    procState = ProcessState.Run;    // 0-pause,   1-run,   2-abort,

    constructor(controller: Controller) 
    {    
        this.controller = controller;
        this.space = controller.space
        this.view = this.controller.view;        
        this.plunger = this.space.plunger; 
        // draw
        this.view.draw1();  
        this.view.draw2(); 
    }
    
    //#region common

    async whileAsync(
        condition = () => true,
        action = () => {},
        stepAfterAction = true,
    ) {
        return new Promise<void>((resolve, reject) => {
            let timer = setInterval(() => {
                try {
                    if (this.procState == ProcessState.Abort) {
                        clearInterval(timer);
                        resolve();
                        return;
                    }

                    if (this.procState == ProcessState.Pause) {
                        return;
                    }

                    if (!condition()) {
                        clearInterval(timer);
                        resolve();
                        return;
                    }

                    action();
                    if (stepAfterAction) {
                        this.controller.step();
                    }
                } catch (err) {
                    clearInterval(timer);
                    reject(err);
                }
            }, glo.msec);
        });
    }


    async run(time=1e6) {
        
        let stepCount = time;

        await this.whileAsync(
            () => stepCount > 0,
            () => {stepCount--},
        );
        // заміна всіх зроблених вимірів одним середнім значенням
        let avgMet = this.space.plunger.getAvgMetering(time);
        const meterings = this.space.plunger.meterings
        meterings.splice(meterings.length - time, time);
        meterings.push(avgMet);

        this.view.draw2();
    }
    
    //#endregion


    //#region adiabatic 

    async adiabatic(mass: number, time=1500) {
        if (this.plunger.m > mass) {
            await this.adiabaticExtention(mass, time);
        } else if (this.plunger.m < mass) {
            await this.adiabaticCompression(mass, time);
        }
    }

    private async adiabaticExtention(minMass: number, time: number) {
        const plun = this.plunger;
        const deltaV = plun.volume * (1 - Math.sqrt(plun.m / minMass));
        const wanted_velo = deltaV / plun.width / time; 

        await this.whileAsync(
        () => 
            plun.m > minMass, 
        () => {
            // Action
            const eps_m = -1 * (wanted_velo - plun.velo/2) * plun.width / plun.volume;
            plun.m *= 1 - eps_m;

            if (plun.m < minMass) {
               plun.m = minMass; 
            }

            // replace ideal pressure with real one
            if (!glo.pretty) {
                let temperature = plun.volume * plun.pressureM / glo.BOLTZ / this.space.N;
                const last = plun.meterings.length - 1    
                plun.meterings[last].p = plun.pressureM;
                plun.meterings[last].t = temperature;
            }            
        });
    }

    private async adiabaticCompression(maxMass: number, time: number) {
        const plun = this.plunger;
        const deltaV = plun.volume * (1 - Math.sqrt(plun.m / maxMass));
        const wanted_velo = deltaV / plun.width / time;

        await this.whileAsync(
        () => 
            plun.m < maxMass, 
        () => {
            // Action
            const eps_m = 1 * (wanted_velo) * plun.width / plun.volume;
            plun.m *= 1 + eps_m;
            if (plun.m > maxMass) {
               plun.m = maxMass; 
            }

            // replace ideal pressure with real one
            if (!glo.pretty) {
                let temperature =  plun.volume * plun.pressureM / glo.BOLTZ / this.space.N;
                const last = plun.meterings.length - 1                
                plun.meterings[last].p = plun.pressureM;
                plun.meterings[last].t = temperature;
            }
        }); 
    }
    //#endregion
 
    
    //#region isobaric 

    async isobaric(vol: number, time = 2000) {
        if (this.plunger.volume < vol) {
            await this.isobaricExtention(vol, time);
        } else if (this.plunger.volume > vol) {
            await this.isobaricCompression(vol, time);
        }
    }

    // Газ розширюється до певного об'єму за рахунок повільного нагрівання
    // Гасіння коливань за рахунок стабілізації руху поршня
    private async isobaricExtention(maxVolume: number, time: number) {
        const plun = this.plunger;
        const deltaV = plun.volume - maxVolume;
        const wanted_velo = deltaV / plun.width / time;
        const initP = plun.pressureM;

        const heater = new Heater(plun.x1, plun.y1, plun.x2, plun.realBottom, 1, "red");
        this.space.addDevice(heater);

        // баланс тепла для нагрівача
        let takenHeat = this.space.takenHeat;

        await this.whileAsync(
        () => 
            plun.volume < maxVolume, 
        () => {
            // Action.
            heater.y1 =  plun.y1;
            // eps = dV / V 
            const eps_r = - wanted_velo * plun.width / plun.volume;
            heater.rate = 1 + eps_r;
            heater.warm();
            
            // Стабілізація руху поршня
            let diff = wanted_velo - plun.velo;
            let velo = Math.abs(diff) < 0.01 ? wanted_velo : plun.velo + 0.01 * Math.sign(diff);
            plun.velo = velo; 
            let deltaQ = (velo**2 - plun.velo**2) * (plun.m / 2);
            let eps_q = deltaQ / (this.space.N * Plunger.BALL_M);
            heater.rate = 1 + eps_q;
            heater.warm();
            
            // replace real temperature metering with ideal one
            if (glo.pretty) {
                let idealT =  plun.volume * initP / glo.BOLTZ / this.space.N;
                plun.meterings[plun.meterings.length - 1].p = initP;
                plun.meterings[plun.meterings.length - 1].t = idealT;
            }
        }); 
        this.space.removeDevice(heater);
        // баланс тепла для нагрівача
        let dHeat = this.space.takenHeat - takenHeat;
        this.space.givenHeat -= dHeat;
        this.space.takenHeat = takenHeat;
    }
    
    private async isobaricCompression(minVolume: number, time: number) {
        const plun = this.plunger;
        const deltaV = plun.volume - minVolume;
        const wanted_velo = deltaV / plun.width / time;
        const initP = plun.pressureM;

        const heater = new Heater(plun.x1, plun.y1, plun.x2, plun.realBottom, 1, "red");
        this.space.addDevice(heater);

        // баланс тепла для охолоджувача
        let givenHeat = this.space.givenHeat;

        await this.whileAsync(
        () => 
            plun.volume > minVolume, 
        () => {
            // Action
            heater.y1 =  plun.y1;
            const eps_r = wanted_velo * plun.width / plun.volume;
            heater.rate = 1 - eps_r;
            heater.warm();
            
            // Стабілізація руху поршня
            let diff = wanted_velo - plun.velo;
            let velo = Math.abs(diff) < 0.01 ? wanted_velo : plun.velo + 0.01 * Math.sign(diff);
            plun.velo = velo;
            let deltaQ = (velo**2 - plun.velo**2) * (plun.m / 2);
            let eps_q = deltaQ / (this.space.N * Plunger.BALL_M);
            heater.rate = 1 - eps_q;
            heater.warm();            

            // replace real temperature  metering with ideal one
            if (glo.pretty) {
                let idealT =  plun.volume * initP / glo.BOLTZ / this.space.N;
                plun.meterings[plun.meterings.length - 1].p = initP;
                plun.meterings[plun.meterings.length - 1].t = idealT;           
            }
        }); 
        this.space.removeDevice(heater);
        // баланс тепла для охолоджувача
        let dHeat = this.space.givenHeat - givenHeat;
        this.space.takenHeat -= dHeat;
        this.space.givenHeat = givenHeat;
    }      
    //#endregion


    //#region isothermic 
    
    async isothermic(mass: number, time=2000) {
        if (this.plunger.m > mass) {
            await this.isothermicExtention(mass, time);
        } else if (this.plunger.m < mass) {
            await this.isothermicCompression(mass, time);
        }
    }

    // Навантаження повільно зменшується до заданого значення, одночасно газ підігрівається.

    private async isothermicExtention(minMass: number, time: number) {

        const plun = this.plunger;
        const deltaV = plun.volume - plun.volume * plun.m / minMass;
        const wanted_velo = deltaV / plun.width / time; 
        const heater = new Heater(
            plun.x1, 
            plun.realBottom - (plun.realBottom - plun.y1), 
            this.plunger.x2, 
            this.plunger.realBottom,
            1, "red");
        this.space.addDevice(heater);

        let initT = this.plunger.measureTemperature();

        // баланс тепла для нагрівача
        let takenHeat = this.space.takenHeat;
        
        await this.whileAsync(
        () => 
            this.plunger.m > minMass, 
        () => {
            // Action M
            heater.y1 =  plun.realBottom - (plun.realBottom - plun.y1);
            // Формула: eps_m = dV / V
            const eps_m = -wanted_velo * plun.width / plun.volume;
            this.plunger.m *= 1 - eps_m;
            if (plun.m < minMass) {
               plun.m = minMass; 
            }
            // Action warm
            // const eps_r = eps_m / 2;
            // heater.rate = 1 + eps_r;
            // heater.warm();

            // Втручання
            let currT = this.plunger.measureTemperature();
            heater.rate = 1 + (initT - currT) / currT / 2;
            heater.warm();


            // replace real pressure metering with ideal one
            if (glo.pretty) {
                let pressure = initT *  glo.BOLTZ * this.space.N /  this.plunger.volume;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = pressure;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = initT;            
            }
        }); 
        this.space.removeDevice(heater);
        // баланс тепла для нагрівача
        let dHeat = this.space.takenHeat - takenHeat;
        this.space.givenHeat -= dHeat;
        this.space.takenHeat = takenHeat;
    }
    
    private async isothermicCompression(maxMass: number, time: number) {

        const plun = this.plunger;
        const deltaV = plun.volume - plun.volume * plun.m / maxMass;
        const wanted_velo = deltaV / plun.width / time; 
        const heater = new Heater(
            plun.x1, 
            plun.realBottom - (plun.realBottom - plun.y1), 
            this.plunger.x2, 
            this.plunger.realBottom,
            1, "red");
        this.space.addDevice(heater);
        let initT = this.plunger.measureTemperature();

        // баланс тепла для охолоджувача
        let givenHeat = this.space.givenHeat;
        await this.whileAsync(
        () => 
            this.plunger.m < maxMass, 
        () => {
            // Action M
            heater.y1 =  plun.realBottom - (plun.realBottom - plun.y1); 
            // Формула: eps_m = dV / V
            const eps_m = wanted_velo * plun.width / plun.volume;
            this.plunger.m *= 1 + eps_m;
            if (plun.m > maxMass) {
               plun.m = maxMass; 
            }            
            
            // Action warm
            // const eps_r = eps_m / 2;
            // heater.rate *= 1 - eps_r;
            // heater.warm(); 

            // Втручання
            let currT = this.plunger.measureTemperature(); 
            heater.rate = 1 + (initT - currT) / currT / 2;
            heater.warm();

            // replace real pressure metering with ideal one
            if (glo.pretty) {
                let pressure = initT *  glo.BOLTZ * this.space.N /  this.plunger.volume;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = pressure;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = initT; 
            }
        }); 
        this.space.removeDevice(heater);

        // баланс тепла для охолоджувача
        let dHeat = this.space.givenHeat - givenHeat;
        this.space.takenHeat -= dHeat;
        this.space.givenHeat = givenHeat;
    }  
      
    //#endregion
    
    
    //#region isohoric 

    async isohoric(targetM: number, time=1000) {
        if (this.plunger.m > targetM) {
            await this.isohoricExt(targetM, time);
        } else if (this.plunger.m < targetM) {
            await this.isohoricCompr(targetM, time);
        }
    }
    
    // Тиск зменшується до заданого значення за рахунок повільного розвантаження і повільного охолодження.
    private async isohoricExt(minMass: number, time: number) {
        const plun = this.plunger;
        const eps = Math.log(plun.m / minMass) / time;        
        const heater = new Heater(
            plun.x1, 
            plun.realBottom - (plun.realBottom - plun.y1), 
            this.plunger.x2, 
            this.plunger.realBottom,
            1, "red");

        this.space.addDevice(heater);
        const vol = this.plunger.volume
        plun.fixed = true;
        await this.whileAsync(
        () => 
            this.plunger.m > minMass, 
        () => {
            // Action
            heater.y1 =  plun.realBottom - (plun.realBottom - plun.y1); 
            // M
            this.plunger.m *= 1 - eps;
            // T 
            heater.rate = 1 - eps / 2;
            heater.warm();

            // replace real pressure metering with ideal one
            if (glo.pretty) {
                const last = this.plunger.meterings.length - 1;
                let pressure = this.plunger.meterings[last].t *  glo.BOLTZ * this.space.N / vol;
                this.plunger.meterings[last].p = pressure;
                this.plunger.meterings[last].v = vol;
            }
        }); 
        this.space.removeDevice(heater);
        plun.fixed = false;
    }

    // Тиск збільшується до заданого значення за рахунок повільного навантаження і повільного нагрівання.
    private async isohoricCompr(maxMass: number, time: number) {
 
        const plun = this.plunger;
        const eps = Math.log(maxMass / plun.m) / time;  
        const heater = new Heater(
            plun.x1, 
            plun.realBottom - (plun.realBottom - plun.y1), 
            this.plunger.x2, 
            this.plunger.realBottom,
            1, "red");

        this.space.addDevice(heater);
        const vol = this.plunger.volume;
        plun.fixed = true;

        await this.whileAsync(
        () => 
            this.plunger.m < maxMass, 
        () => {
            // Action
            heater.y1 =  plun.realBottom - (plun.realBottom - plun.y1); 
            // M
            this.plunger.m *= 1 + eps;
            // T
            heater.rate = 1 + eps / 2;
            heater.warm();

            // replace real pressure metering with ideal one
            if (glo.pretty) {
                const last = this.plunger.meterings.length - 1;
                let pressure = this.plunger.meterings[last].t *  glo.BOLTZ * this.space.N / vol;
                this.plunger.meterings[last].p = pressure;
                this.plunger.meterings[last].v = vol;
            }
        }); 
        this.space.removeDevice(heater);
        plun.fixed = false;
    }

    //#endregion 


    //#region Otto Cicle

    // vol
    async intake(maxVolume: number, nk=10) {       
        let n = nk * 1000;
        let dn = n / 100,
            x1 = this.plunger.x1 + 1, 
            y1 = this.plunger.realBottom - 10,
            x2 = this.plunger.x1 + 50, 
            y2 = this.plunger.realBottom - 1;

        await this.whileAsync(
        () => 
            this.plunger.volume < maxVolume, 
        () => {
            if (n > 0) {
                //let t = 2.5 * 30 = 75
                let bomb = new Bomb(dn, x1, y1, x2, y2, 0, 0, 75, 0.5, 0.4, "red", )
                this.space.addBomb(bomb)
                n -= dn; 
            }
        });
    }

    // mas | vol
    async compression(mass: number, minVolume: number) {  
        this.plunger.m = mass;
        await this.whileAsync(
        () => 
            this.plunger.volume > minVolume 
        );
    }
    
    // rate | t 
    async ignition(rate: number, maxTemperature: number) {  
        let heater = new Heater(this.plunger.x1, this.plunger.y1, this.plunger.x2, this.plunger.realBottom, rate, "red");
        this.space.addDevice(heater);
        await this.whileAsync(
        () => 
            this.plunger.t < maxTemperature, 
        () => {
            heater.warm();
        });
        this.space.removeDevice(heater);
    }

    // mas | vol  
    async expansion(mass: number, maxVolume: number) { 
        this.plunger.m = mass;
        await this.whileAsync(
        () => 
            this.plunger.volume < maxVolume 
        );
    }

    // mas | vol  
    async exhaust(mass: number) { 
        this.plunger.m = mass;
        this.space.selectLine(this.plunger.x1 + 20, this.plunger.realBottom)
        let bottomLine = this.space.selectedLine!;

        // open bottom anime
        let x1 = bottomLine.x1;
        await this.whileAsync(() => bottomLine.x1 < x1 + this.plunger.width, () => { bottomLine.move(10, 0) } );
        
        // 
        await this.whileAsync(
        () => 
            this.plunger.y1 < this.plunger.bottom - 80, 
        () => {
            if (this.plunger.m > 100) this.plunger.m -= 10;
        });
        
        this.plunger.withFriction = true;
        await this.whileAsync(
        () => 
            this.plunger.y1 < this.plunger.bottom
        );
        this.plunger.withFriction = false;

        // close bottom anime
        await this.whileAsync(() => bottomLine.x1 > x1, () => { bottomLine.move(-10, 0) } );
    }

    //#endregion Otto Cicle
}

