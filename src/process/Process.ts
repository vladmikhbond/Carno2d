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

    async whileAsync(
        condition: () => boolean,
        action: () => void = () => {},
        stepAfterAction: boolean = true,
    ) {
        return new Promise<number>((res, rej) => {
            let timer = setInterval(() => {
                try {
                    if (this.procState == ProcessState.Abort) {
                        clearInterval(timer);
                        rej(new Error('stop process'));
                        return;
                    }

                    if (this.procState != ProcessState.Run) {
                        return;
                    }

                    if (!condition()) {
                        clearInterval(timer);
                        res(this.controller.timer);
                        return;
                    }

                    action();
                    if (stepAfterAction) {
                        this.controller.step();
                    }
                } catch (err) {
                    clearInterval(timer);
                    rej(err);
                }
            }, glo.msec);
        });
    }

    async calm(stepCount: number) {
        const plun = this.plunger;
        this.view.showWord("Calming");

        const arr: number[] = [];
        let remaining = stepCount;

        await this.whileAsync(
            () => remaining > 0,
            () => {
                this.space.step();
                arr.push(plun.y1);
                remaining--;
            },
            false,
        );
        
        if (arr.length > 0) {
            remaining = stepCount;
            const zero = (Math.min(...arr) + Math.max(...arr)) / 2;
            const sign0 = Math.sign(plun.y1 - zero);
            await this.whileAsync(
                () => Math.sign(plun.y1 - zero) == sign0 && remaining > 0,
                () => {
                    this.space.step();
                    remaining--;
                },
                false,
            );
        }

        plun.loss += plun.m * plun.velo * plun.velo / 2;
        plun.velo = 0;
    }


    //#region adiabatic 

    async adiabatic(mass: number, eps=0.001) {
        if (this.plunger.m > mass) {
            await this.adiabaticExtention(mass, eps);
        } else if (this.plunger.m < mass) {
            await this.adiabaticCompression(mass, eps);
        }
    }

    private async adiabaticExtention(minMass: number, eps: number) {
        const plun = this.plunger;
        const diag = new Diag(); 
        const wanted_velo = -eps * 50;
        await this.whileAsync(
        () => 
            plun.m > minMass, 
        () => {
            // Action
            const eps_m = -2 * wanted_velo * plun.width / plun.volume;
            plun.m *= 1 - eps_m;

            // replace ideal pressure with real one
            if (!glo.pretty) {
                let temperature = plun.volume * plun.pressure / glo.BOLTZ / this.space.N;
                const last = plun.meterings.length - 1
                diag.push(temperature - plun.meterings[last].t)       // diag    
                plun.meterings[last].p = plun.pressure;
                plun.meterings[last].t = temperature;
            }            
        });

        console.log("adiabaticExtention: dif_T:", diag.resume, "eps=", eps);
    }

    private async adiabaticCompression(maxMass: number, eps: number) {
        const plun = this.plunger;
        const diag = new Diag(); 
        const wanted_velo = eps * 50;
        await this.whileAsync(
        () => 
            plun.m < maxMass, 
        () => {
            // Action
            const eps_m = 2 * wanted_velo * plun.width / plun.volume;
            plun.m *= 1 + eps_m;

            // replace ideal pressure with real one
            if (!glo.pretty) {
                let temperature =  plun.volume * plun.pressure / glo.BOLTZ / this.space.N;
                const last = plun.meterings.length - 1
                diag.push(temperature - plun.meterings[last].t)       // diag                
                plun.meterings[last].p = plun.pressure;
                plun.meterings[last].t = temperature;
            }
        }); 

        console.log("adiabaticCompression: dif_T:", diag.resume, "eps=", eps);
    }
    //#endregion
 
    
    //#region isobaric 

    async isobaric(vol: number, eps=0.001) {
        if (this.plunger.volume < vol) {
            await this.isobaricExtention(vol, eps);
        } else if (this.plunger.volume > vol) {
            await this.isobaricCompression(vol, eps);
        }
    }

    // Газ розширюється до певного об'єму за рахунок повільного нагрівання
    // Гасіння коливань за рахунок втручання в швидкість поршня
    private async isobaricExtention(maxVolume: number, eps: number) {
        const plun = this.plunger;
        const diag = new Diag(); 
        const wanted_velo = -eps * 100;
        let initP = plun.pressure;
        
        const heater = new Heater(plun.x1, plun.y1, plun.x2, plun.realBottom, 1, "red");
        this.space.addDevice(heater);
        await this.whileAsync(
        () => 
            plun.volume < maxVolume, 
        () => {
            // Втручання
            let q = (wanted_velo**2 - plun.velo**2) * (plun.m / 2);
            let eps_q = q / (this.space.N * Plunger.BALL_M);
            plun.velo = wanted_velo;
            heater.rate = 1 + eps_q;

            // Action.
            heater.y1 =  plun.y1;
            // eps = dV / V 
            const eps_r = - wanted_velo * plun.width / plun.volume;
            heater.rate *= 1 + eps_r;
            heater.warm();
            
            diag.push(plun.meterings[plun.meterings.length - 1].p);       

            // replace real temperature metering with ideal one
            if (glo.pretty) {
                let temperature =  plun.volume * initP / glo.BOLTZ / this.space.N;
                plun.meterings[plun.meterings.length - 1].p = initP;
                plun.meterings[plun.meterings.length - 1].t = temperature;
            }
        }); 
        this.space.removeDevice(heater);
        console.log("isobaricExtention P", diag.resume, "eps=", eps);
    }
    
    private async isobaricCompression(minVolume: number, eps: number) {
        const plun = this.plunger;
        const diag = new Diag(); 
        const wanted_velo = eps * 100;
        let initP = plun.pressure;  
        const heater = new Heater(plun.x1, plun.y1, plun.x2, plun.realBottom, 1, "red");
        this.space.addDevice(heater);

        await this.whileAsync(
        () => 
            plun.volume > minVolume, 
        () => {
            // Втручання
            let q = (wanted_velo**2 - plun.velo**2) * (plun.m / 2);
            let eps_q = q / (this.space.N * Plunger.BALL_M);
            plun.velo = wanted_velo;
            heater.rate = 1 - eps_q;

            // Action
            heater.y1 =  plun.y1;
            const eps_r = wanted_velo * plun.width / plun.volume;
            heater.rate *= 1 - eps_r;
            heater.warm(); 

            diag.push(plun.meterings[plun.meterings.length - 1].p);

            // replace real temperature  metering with ideal one
            if (glo.pretty) {
                let temperature =  plun.volume * initP / glo.BOLTZ / this.space.N;
                plun.meterings[plun.meterings.length - 1].p = initP;
                plun.meterings[plun.meterings.length - 1].t = temperature;           
            }
        }); 
        this.space.removeDevice(heater);
        console.log("isobaricCompression P", diag.resume, "eps=", eps);
    }      
    //#endregion


    //#region isohoric 

    async isohoric(mass: number, time=1000) {
        if (this.plunger.m < mass) {
            await this.isohoricExtention(mass, time);
        } else if (this.plunger.m > mass) {
            await this.isohoricCompression(mass, time);
        }
    }

    // Тиск збільшується до заданого значення за рахунок повільного навантаження і повільного нагрівання.
    // Гасіння коливань за рахунок зменшення охолодження.
    private async isohoricExtention(maxMass: number, time: number) {
 
        const plan = this.plunger;
        const eps = Math.log(maxMass / plan.m) / time;
        const diag = new Diag();
        const heater = new Heater(
            plan.x1, 
            plan.realBottom - (plan.realBottom - plan.y1), 
            this.plunger.x2, 
            this.plunger.realBottom,
            1, "red");

        this.space.addDevice(heater);
        const vol = this.plunger.volume;
        await this.whileAsync(
        () => 
            this.plunger.m < maxMass, 
        () => {
            // Action
            heater.y1 =  plan.realBottom - (plan.realBottom - plan.y1); 
            this.plunger.m *= 1 + eps;

            const eps_v = eps / 2;
            heater.rate = 1 + eps_v;
            heater.warm();
            
            diag.push(plan.volume);

            // replace real pressure metering with ideal one
            if (glo.pretty) {
                const last = this.plunger.meterings.length - 1;
                let pressure = this.plunger.meterings[last].t *  glo.BOLTZ * this.space.N / vol;
                this.plunger.meterings[last].p = pressure;
                this.plunger.meterings[last].v = vol;
            }
        }); 
        this.space.removeDevice(heater);
        console.log("isohoricExtention: V:", diag.resume, "eps=", eps);
    }

    // охолодження, маса зменшується
    private async isohoricCompression(minMass: number, time: number) {
        const plan = this.plunger;
        const eps = Math.log(plan.m / minMass) / time;
        const diag = new Diag();
        const heater = new Heater(
            plan.x1, 
            plan.realBottom - (plan.realBottom - plan.y1), 
            this.plunger.x2, 
            this.plunger.realBottom,
            1, "red");

        this.space.addDevice(heater);
        const vol = this.plunger.volume
        await this.whileAsync(
        () => 
            this.plunger.m > minMass, 
        () => {
            // Action
            heater.y1 =  plan.realBottom - (plan.realBottom - plan.y1); 
            this.plunger.m *= 1 - eps;

            const eps_v = eps / 2;
            heater.rate = 1 - eps_v ;
            heater.warm();
            
            diag.push(plan.volume);

            // replace real pressure metering with ideal one
            if (glo.pretty) {
                const last = this.plunger.meterings.length - 1;
                let pressure = this.plunger.meterings[last].t *  glo.BOLTZ * this.space.N / vol;
                this.plunger.meterings[last].p = pressure;
                this.plunger.meterings[last].v = vol;
            }
        }); 
        this.space.removeDevice(heater);
        console.log("isohoricCompression: V:", diag.resume, "eps=", eps);
    }

    //#endregion 


    //#region  isothermic 
    
    async isothermic(mass: number, eps=0.001) {
        if (this.plunger.m > mass) {
            await this.isothermicExtention(mass, eps);
        } else if (this.plunger.m < mass) {
            await this.isothermicCompression(mass, eps);
        }
    }

    // Навантаження повільно зменшується до заданого значення, одночасно газ підігрівається.
    // Гасіння коливань за рахунок зменшення навантаження і за рахунок підігріву.
    private async isothermicExtention(minMass: number, eps: number) {
        const wanted_velo = -eps * 100;
        const plun = this.plunger;
        const diag = new Diag(); 
        const heater = new Heater(
            plun.x1, 
            plun.realBottom - (plun.realBottom - plun.y1), 
            this.plunger.x2, 
            this.plunger.realBottom,
            1, "red");
        this.space.addDevice(heater);

        let initT = this.plunger.measureTemperature();
        await this.whileAsync(
        () => 
            this.plunger.m > minMass, 
        () => {
            // Action M
            heater.y1 =  plun.realBottom - (plun.realBottom - plun.y1);
            // Формула: eps_m = dV / V
            const eps_m = -wanted_velo * plun.width / plun.volume;
            this.plunger.m *= 1 - eps_m;
  
            // Втручання
            let currT = this.plunger.measureTemperature();  
            heater.rate = 1 + (initT - currT) / currT / 2;

            // Action warm
            const eps_r = eps_m / 2;
            heater.rate *= 1 - eps_r;
            heater.warm();

            diag.push(plun.meterings[plun.meterings.length - 1].t);

            // replace real pressure metering with ideal one
            if (glo.pretty) {
                let pressure = initT *  glo.BOLTZ * this.space.N /  this.plunger.volume;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = pressure;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = initT;            
            }
        }); 
        this.space.removeDevice(heater);
        console.log("isothermicExtention T", diag.resume, "eps=", eps);

    }
    
    private async isothermicCompression(maxMass: number, eps: number) {
        const wanted_velo = eps * 100;
        const plun = this.plunger;
        const diag = new Diag(); 
        const heater = new Heater(
            plun.x1, 
            plun.realBottom - (plun.realBottom - plun.y1), 
            this.plunger.x2, 
            this.plunger.realBottom,
            1, "red");
        this.space.addDevice(heater);
        let initT = this.plunger.measureTemperature();
        await this.whileAsync(() => this.plunger.m < maxMass, () => {
            // Action M
            heater.y1 =  plun.realBottom - (plun.realBottom - plun.y1); 
            // Формула: eps_m = dV / V
            const eps_m = wanted_velo * plun.width / plun.volume;
            this.plunger.m *= 1 + eps_m;
            
            // Втручання
            let currT = this.plunger.measureTemperature(); 
            heater.rate = 1 + (initT - currT) / currT / 2;
           
            // Action warm
            const eps_r = eps_m / 2;
            heater.rate *= 1 - eps_r;
            heater.warm(); 

            diag.push(plun.meterings[plun.meterings.length - 1].t);

            // replace real pressure metering with ideal one
            if (glo.pretty) {
                let pressure = initT *  glo.BOLTZ * this.space.N /  this.plunger.volume;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = pressure;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = initT; 
            }
        }); 
        this.space.removeDevice(heater);
        console.log("isothermicCompression T", diag.resume, "eps=", eps);
    }  
      
    //#endregion
    

    //#region Otto Cicle

    // bomb | vol
    async intake(n: number, maxVolume: number) {       
        let [dn, x1, y1, x2, y2] = [100, this.plunger.x1 + 1, this.plunger.realBottom - 10, this.plunger.x1 + 50, this.plunger.realBottom - 1];
        await this.whileAsync(() => this.plunger.volume < maxVolume, () => {
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
            () => this.plunger.volume > minVolume
        );
    }
    
    // rate | t 
    async ignition(rate: number, maxTemperature: number) {  
        let heater = new Heater(this.plunger.x1, this.plunger.y1, this.plunger.x2, this.plunger.realBottom, rate, "red");
        this.space.addDevice(heater);
        await this.whileAsync(() => this.plunger.t < maxTemperature, () => {
            heater.warm();
        });
        this.space.removeDevice(heater);
    }

    // mas | vol  
    async expansion(mass: number, maxVolume: number) { 
        this.plunger.m = mass;
        await this.whileAsync(
            () => this.plunger.volume < maxVolume
        );
    }

    // mas | vol  
    async exhaust(mass: number, minVolume: number) { 
        this.plunger.m = mass;
        this.space.selectLine(this.plunger.x1 + 20, this.plunger.realBottom)
        let line = this.space.selectedLine!;
        let width = this.plunger.x2 - this.plunger.x1;

        // open bottom anime
        let x1 = line.x1;
        await this.whileAsync(() => line.x1 < x1 + width, () => { line.move(10, 0) } );
        
        // 
        await this.whileAsync(() => this.plunger.volume > minVolume * 2 , () => {
            if (this.plunger.m > 100) this.plunger.m -= 10;
        } );
        
        this.plunger.withFriction = true;
        await this.whileAsync(() => this.plunger.volume > minVolume);
        this.plunger.withFriction = false;

        // close bottom anime
        await this.whileAsync(() => line.x1 > x1, () => { line.move(-10, 0) } );
    }

    //#endregion Otto Cicle
}

