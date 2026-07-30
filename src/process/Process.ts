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
            const zero = (Math.min(...arr) + Math.max(...arr)) / 2;
            const sign0 = Math.sign(plun.y1 - zero);
            await this.whileAsync(
                () => Math.sign(plun.y1 - zero) == sign0,
                () => {
                    this.space.step();
                },
                false,
            );
        }

        plun.loss += plun.m * plun.velo * plun.velo / 2;
        plun.velo = 0;
    }


    //#region adiabatic 

    async adiabatic(mass: number) {
        if (this.plunger.m > mass) {
            await this.adiabaticExtention(mass);
        } else if (this.plunger.m < mass) {
            await this.adiabaticCompression(mass);
        }
    }

    private async adiabaticExtention(minMass: number) {
        let diag_p = 0, diag_t = 0, diag_i = 0; 
        await this.whileAsync(
        () => 
            this.plunger.m > minMass, 
        () => {
            let eps_m = 0.0005;
            // if (this.plunger.m - minMass < minMass / 5)
            //     eps_m = 0.0001;
            this.plunger.m *= 1 - eps_m;
            
            // replace ideal metering pressure with real one
            if (!glo.pretty) {
                let temperature =  this.plunger.volume * this.plunger.pressure / glo.BOLTZ / this.space.N;
                diag_p += (this.plunger.meterings[this.plunger.meterings.length - 1].p - this.plunger.pressure)**2;
                diag_t += (this.plunger.meterings[this.plunger.meterings.length - 1].t - temperature)**2;
                diag_i++;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = this.plunger.pressure;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = temperature;
            }            
        });
        console.log("EXT: p = ", diag_p/diag_i, "t = ", diag_t/diag_i, diag_i);
    }

    private async adiabaticCompression(maxMass: number) {
        let diag_p = 0, diag_t = 0, diag_i = 0;
        await this.whileAsync(
        () => 
            this.plunger.m < maxMass, 
        () => {
            let eps_m = 0.0005;
            // if (maxMass - this.plunger.m < maxMass / 5)
            //     eps_m = 0.0001;
            this.plunger.m *= 1 + eps_m;;

            // replace ideal metering pressure with real one
            if (!glo.pretty) {
                let temperature =  this.plunger.volume * this.plunger.pressure / glo.BOLTZ / this.space.N;
                diag_p += (this.plunger.meterings[this.plunger.meterings.length - 1].p - this.plunger.pressure)**2;
                diag_t += (this.plunger.meterings[this.plunger.meterings.length - 1].t - temperature)**2;
                diag_i++;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = this.plunger.pressure;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = temperature;
            }
        }); 
        console.log("CMP: p = ", diag_p/diag_i, "t = ", diag_t/diag_i, diag_i);
    }
    //#endregion
 
    
    //#region isobaric 

    async isobaric(vol: number) {
        if (this.plunger.volume < vol) {
            await this.isobaricExtention(vol);
        } else if (this.plunger.volume > vol) {
            await this.isobaricCompression(vol);
        }
    }

    // Газ розширюється до певного об'єму за рахунок повільного нагрівання
    // Гасіння коливань за рахунок втручання в швидкість поршня
    private async isobaricExtention(maxVolume: number) {
        const plun = this.plunger;
        const wanted = -0.1;
        let initP = this.plunger.pressure;
        
        const heater = new Heater(plun.x1, plun.y1, plun.x2, plun.realBottom, 1, "red");
        this.space.addDevice(heater);
        await this.whileAsync(
        () => 
            this.plunger.volume < maxVolume, 
        () => {
            heater.y1 =  plun.y1;

            // let eps = dv / v = wanted_velo * width / 2 * this.plunger.volume ;
            const eps = ((2)) * wanted * 100 / this.plunger.volume;
            heater.rate = 1 - eps;
            heater.warm(); 

            // Втручання
            let q = (plun.velo**2 - wanted**2) * (plun.m / 2);
            let eps_e = q / (this.space.N  * 0.4);
            plun.velo = wanted;
            heater.rate = 1 - eps_e;
            heater.warm();
        
            // replace real temperature metering with ideal one
            if (glo.pretty) {
                let temperature =  this.plunger.volume * initP / glo.BOLTZ / this.space.N;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = initP;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = temperature;
            }
        }); 
        this.space.removeDevice(heater);
    }
    
    private async isobaricCompression(minVolume: number) {
        const wanted = 0.1;

        const plun = this.plunger;
        let initP = this.plunger.pressure;  
        const heater = new Heater(plun.x1, plun.y1, plun.x2, plun.realBottom, 1, "red");
        this.space.addDevice(heater);

        await this.whileAsync(
        () => 
            this.plunger.volume > minVolume, 
        () => {
            heater.y1 =  plun.y1;
            const eps = 2 * wanted * 100 / this.plunger.volume;
            heater.rate = 1 - eps;
            heater.warm(); 

            // Втручання
            let q = (plun.velo**2 - wanted**2) * (plun.m / 2);
            let eps_e = q / (this.space.N  * 0.4);
            plun.velo = wanted;
            heater.rate = 1 + eps_e;
            heater.warm();            

            // replace real temperature  metering with ideal one
            if (glo.pretty) {
                let temperature =  this.plunger.volume * initP / glo.BOLTZ / this.space.N;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = initP;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = temperature;           
            }
        }); 
        this.space.removeDevice(heater);
    }      
    //#endregion


    //#region isohoric 

    async isohoric(mass: number) {
        if (this.plunger.m < mass) {
            await this.isohoricExtention(mass);
        } else if (this.plunger.m > mass) {
            await this.isohoricCompression(mass);
        }
    }

    // охолодження, маса зменшується
    private async isohoricCompression(mimMass: number) {
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
            const eps_m = 0.001;
            this.plunger.m *= 1 - eps_m;
            
            const eps_v = eps_m / 2;
            if (this.plunger.volume > vol) {
                heater.rate = 1 - eps_v ;
            } else if (this.plunger.volume < vol) {
                heater.rate = 1 - eps_v * 5/6;
            }
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
        this.space.removeDevice(heater);    }



    // Тиск збільшується до заданого значення за рахунок повільного навантаження і повільного нагрівання.
    // Гасіння коливань за рахунок зменшення охолодження.
    private async isohoricExtention(maxMass: number) {
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
            const eps_m = 0.001;
            this.plunger.m *= 1 + eps_m;

            const eps_v = eps_m / 2;
    
            if (this.plunger.volume < vol) {
                heater.rate = 1 + eps_v;
            } else if (this.plunger.volume > vol) {
                heater.rate = 1 + eps_v * 5/6;
            }
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
    
    async isothermic(mass: number) {
        if (this.plunger.m > mass) {
            await this.isothermicExtention(mass);
        } else if (this.plunger.m < mass) {
            await this.isothermicCompression(mass);
        }
    }

    // Навантаження повільно зменшується до заданого значення, одночасно газ підігрівається.
    // Гасіння коливань за рахунок зменшення навантаження і за рахунок підігріву.
    private async isothermicExtention(minMass: number) {
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
            this.plunger.m /= 1.0005;

            let currT = this.plunger.measureTemperature();  
            heater.rate = 1 + (initT - currT) * 0.0005;
            heater.y1 =  plun.realBottom - (plun.realBottom - plun.y1) 
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
    
    private async isothermicCompression(maxMass: number) {
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
            this.plunger.m *= 1.0005;

            let currT = this.plunger.measureTemperature(); 
            heater.rate = 1 + (initT - currT) * 0.0005; 
            heater.y1 =  plun.realBottom - (plun.realBottom - plun.y1);      
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

