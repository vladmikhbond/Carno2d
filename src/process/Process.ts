import { Heater} from '../model/Heater.js';
import Bomb from '../model/Bomb.js';
import Space from '../model/Space.js';
import {Plunger} from '../model/Plunger.js';
import View from '../view/View.js';
import Controller from '../controller/Controller.js';
import { glo } from '../globals/globals.js';


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
        this.view.draw();  
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
        this.view.showWord("Wait");

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
        let diag_p = 0, diag_t = 0, diag_i = 0; 
        let wanted_velo = -eps * 100;
        await this.whileAsync(
        () => 
            plun.m > minMass, 
        () => {
            // Формула: eps_m = dv / v = wanted_velo * plun.width / plun.volume ;
            const eps_m = -wanted_velo * plun.width / plun.volume;
            console.log(eps_m);
            plun.m *= 1 - eps_m;
            // replace ideal pressure with real one
            if (!glo.pretty) {
                let temperature = plun.volume * plun.pressure / glo.BOLTZ / this.space.N;
                diag_p += (plun.meterings[plun.meterings.length - 1].p - plun.pressure)**2;
                diag_t += (plun.meterings[plun.meterings.length - 1].t - temperature)**2;
                diag_i++;
                plun.meterings[plun.meterings.length - 1].p = plun.pressure;
                plun.meterings[plun.meterings.length - 1].t = temperature;
            }            
        });
        console.log("EXT: p = ", diag_p/diag_i, "t = ", diag_t/diag_i, diag_i);
    }

    private async adiabaticCompression(maxMass: number, eps: number) {
        let diag_p = 0, diag_t = 0, diag_i = 0;
        const plun = this.plunger;
        let wanted_velo = eps * 100;
        await this.whileAsync(
        () => 
            plun.m < maxMass, 
        () => {

            const eps_m = wanted_velo * plun.width / plun.volume;
            console.log(eps_m);
            plun.m *= 1 + eps_m;

            // replace ideal pressure with real one
            if (!glo.pretty) {
                let temperature =  plun.volume * plun.pressure / glo.BOLTZ / this.space.N;
                diag_p += (plun.meterings[plun.meterings.length - 1].p - plun.pressure)**2;
                diag_t += (plun.meterings[plun.meterings.length - 1].t - temperature)**2;
                diag_i++;
                plun.meterings[plun.meterings.length - 1].p = plun.pressure;
                plun.meterings[plun.meterings.length - 1].t = temperature;
            }
        }); 
        console.log("CMP: p = ", diag_p/diag_i, "t = ", diag_t/diag_i, diag_i);
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
        const wanted_velo = -eps * 100;
        let initP = plun.pressure;
        
        const heater = new Heater(plun.x1, plun.y1, plun.x2, plun.realBottom, 1, "red");
        this.space.addDevice(heater);
        await this.whileAsync(
        () => 
            plun.volume < maxVolume, 
        () => {
            heater.y1 =  plun.y1;

            // Формула: eps = dv / v = wanted_velo * plun.width / (2 * plun.volume) ;
            const eps_r = ((2)) * wanted_velo * plun.width / 2 / plun.volume;
            heater.rate = 1 - eps_r;
            heater.warm(); 

            // Втручання
            let q = (plun.velo**2 - wanted_velo**2) * (plun.m / 2);
            let eps_e = q / (this.space.N * 0.4);
            plun.velo = wanted_velo;
            heater.rate = 1 - eps_e;
            heater.warm();
        
            // replace real temperature metering with ideal one
            if (glo.pretty) {
                let temperature =  plun.volume * initP / glo.BOLTZ / this.space.N;
                plun.meterings[plun.meterings.length - 1].p = initP;
                plun.meterings[plun.meterings.length - 1].t = temperature;
            }
        }); 
        this.space.removeDevice(heater);
    }
    
    private async isobaricCompression(minVolume: number, eps: number) {
        const wanted_velo = eps * 100;

        const plun = this.plunger;
        let initP = plun.pressure;  
        const heater = new Heater(plun.x1, plun.y1, plun.x2, plun.realBottom, 1, "red");
        this.space.addDevice(heater);

        await this.whileAsync(
        () => 
            plun.volume > minVolume, 
        () => {
            heater.y1 =  plun.y1;
            const eps_r = 2 * wanted_velo * plun.width / 2 / plun.volume;
            heater.rate = 1 - eps_r;
            heater.warm(); 

            // Втручання
            let q = (plun.velo**2 - wanted_velo**2) * (plun.m / 2);
            let eps_e = q / (this.space.N  * 0.4);
            plun.velo = wanted_velo;
            heater.rate = 1 + eps_e;
            heater.warm();            

            // replace real temperature  metering with ideal one
            if (glo.pretty) {
                let temperature =  plun.volume * initP / glo.BOLTZ / this.space.N;
                plun.meterings[plun.meterings.length - 1].p = initP;
                plun.meterings[plun.meterings.length - 1].t = temperature;           
            }
        }); 
        this.space.removeDevice(heater);
    }      
    //#endregion


    //#region isohoric 

    async isohoric(mass: number, eps=0.001) {
        if (this.plunger.m < mass) {
            await this.isohoricExtention(mass, eps);
        } else if (this.plunger.m > mass) {
            await this.isohoricCompression(mass, eps);
        }
    }

    // Тиск збільшується до заданого значення за рахунок повільного навантаження і повільного нагрівання.
    // Гасіння коливань за рахунок зменшення охолодження.
    private async isohoricExtention(maxMass: number, eps_m: number) {
        const plan = this.plunger;
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
            this.plunger.m < maxMass, 
        () => {
            this.plunger.m *= 1 + eps_m;

            const eps_v = eps_m / 2;
            heater.rate = 1 + eps_v;
            heater.y1 =  plan.realBottom - (plan.realBottom - plan.y1); 
            
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
    }

    // охолодження, маса зменшується
    private async isohoricCompression(mimMass: number, eps_m: number) {
        const plan = this.plunger;
        const heater = new Heater(
            plan.x1, 
            plan.realBottom - (plan.realBottom - plan.y1), 
            this.plunger.x2, 
            this.plunger.realBottom,
            1, "red");

        this.space.addDevice(heater);
        const vol = this.plunger.volume
        await this.whileAsync(() => this.plunger.m > mimMass, () => {

            this.plunger.m *= 1 - eps_m;
            
            const eps_v = eps_m / 2;
            heater.rate = 1 - eps_v ;
            heater.y1 =  plan.realBottom - (plan.realBottom - plan.y1); 
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
            heater.y1 =  plun.realBottom - (plun.realBottom - plun.y1);
            // Формула: eps_m = dv / v = wanted_velo * plun.width / plun.volume ;
            const eps_m = -wanted_velo * plun.width / plun.volume;

            this.plunger.m *= 1 - eps_m;
            const eps_r = eps_m / 2; 

            let currT = this.plunger.measureTemperature();  
            heater.rate = 1 + (initT - currT) * eps_m;
            heater.warm();
            

            heater.rate = 1 - eps_r;
            heater.warm();  

            // replace real pressure metering with ideal one
            if (glo.pretty) {
                let pressure = initT *  glo.BOLTZ * this.space.N /  this.plunger.volume;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = pressure;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = initT;            
            }
        }); 
        this.space.removeDevice(heater);
    }
    
    private async isothermicCompression(maxMass: number, eps: number) {
        const wanted_velo = eps * 100;
        const plun = this.plunger;
        const heater = new Heater(
            plun.x1, 
            plun.realBottom - (plun.realBottom - plun.y1), 
            this.plunger.x2, 
            this.plunger.realBottom,
            1, "red");
        this.space.addDevice(heater);
        let initT = this.plunger.measureTemperature();
        await this.whileAsync(() => this.plunger.m < maxMass, () => {
            // Формула: eps_m = dv / v = wanted_velo * plun.width / plun.volume ;
            const eps_m = wanted_velo * plun.width / plun.volume;
            this.plunger.m *= 1 + eps_m;

            let currT = this.plunger.measureTemperature(); 
            heater.rate = 1 + (initT - currT) * eps_m; 

            heater.y1 =  plun.realBottom - (plun.realBottom - plun.y1); 
            heater.warm();

            heater.rate = 1 - eps_m / 2;
            heater.warm(); 

            // replace real pressure metering with ideal one
            if (glo.pretty) {
                let pressure = initT *  glo.BOLTZ * this.space.N /  this.plunger.volume;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = pressure;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = initT; 
            }
        }); 
        this.space.removeDevice(heater);
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

