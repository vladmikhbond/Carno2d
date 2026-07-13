import { Heater} from '../model/Heaters.js';
import Bomb from '../model/Bomb.js';
import Space from '../model/Space.js';
import {Plunger} from '../model/Plunger.js';
import View from '../view/View.js';
import Controller from '../controller/Controller.js';
import { glo } from '../globals/globals.js';
import { lin } from '../globals/utils.js';



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
    procState = ProcessState.Pause;    // 0-pause,   1-run,   2-stop,

    constructor(controller: Controller) 
    {    
        this.controller = controller;
        this.space = controller.space
        this.view = this.controller.view;        
        this.plunger = this.space.plunger; 
        // draw
        this.view.draw();  
        this.view.drawMeasure(); 
    }

    async whileAsync(
        condition: () => boolean, 
        act = () => {},
        msec = 10 
    ) {
        return new Promise((res, rej) => {
            let timer = setInterval(() => {
                try {
                    if (this.procState == ProcessState.Run) {   
                        this.controller.step();
                        act(); 

                        if (!condition()) {                            
                            clearInterval(timer);
                            res(this.controller.timer);
                        }                 
                    } else if (this.procState == ProcessState.Abort) {
                        throw Error('stop process');
                    }              
                } catch (err) {
                    clearInterval(timer);
                    rej(err);
                }
            }, msec);   // former globus.STEP_PERIOD
        });
    }

    
    async calm(calmTime = 100) {
        let stopStep = this.controller.time + calmTime;
        this.plunger.withFriction = true;
        await this.whileAsync(() => this.controller.time < stopStep, () => {
            this.controller.step();
            this.controller.step();
            this.controller.step();
            this.controller.step();          
        }); 
        this.plunger.withFriction = false;
        this.plunger.clearMeterings();
    }

    async createPlunger(params: any) {
        this.space.clear();

        // default values
        let x1 = 40, y1 = 20, x2 = 240, y2 = 480, m = 100, n = 10000, t = 100,
            gas_m = 0.4, gas_r = 0.5, gas_c = 'red';

        t = params.t ?? t;
        n = params.n ?? n;
        m = params.m ?? m;

        const y = n * glo.BOLTZ * t / (m * glo.g);
        // add plunger
        let plun = this.space.addPlunger(x1, y1, x2, y2, "blue");
        plun.m = m;
        plun.move(0, -y + Plunger.GAP);
        // add gass
        if (n) {
            this.space.addBomb(new Bomb(
                n, x1, plun.realBottom - y, x2, plun.realBottom, 0, 0, t, gas_r, gas_m, gas_c)); 
            await this.calm(500);
        } else {
             plun.move(0, -Plunger.GAP);
        }
    }
    



    //#region adiabatic 

    async adiabaticExtention(minMass: number) {
        await this.whileAsync(() => this.plunger.m > minMass, () => {
            // гасіння коливань зміною маси вантажу
            if (this.plunger.velo < 0) {
                this.plunger.m *= 1 + Math.min(0.001, (-this.plunger.velo) ** 0.5)
            }

            this.plunger.m *= 0.998;
        }); 
    }

    async adiabaticCompression(maxMass: number) {
        await this.whileAsync(() => this.plunger.m < maxMass, () => {
            // гасіння коливань зміною маси вантажу
            if (this.plunger.velo > 0) {
                this.plunger.m *= 1 - Math.min(0.001, this.plunger.velo ** 0.5)
            }

            this.plunger.m *= 1.002;
        }); 

    }
    //#endregion
 
    
    //#region isobaric 
    

    async isobaricExtention(maxVolume: number) {

        let heater = new Heater(this.plunger.x1 - 5,  this.plunger.top, this.plunger.x2 + 5, this.plunger.realBottom + 5, 1, "red");
        this.space.addDevice(heater);
        
        let pressure = this.plunger.pressure;  // replace real
        
        let minVolume = this.space.plunger.volume;

        await this.whileAsync(() => this.plunger.volume < maxVolume, () => {

            let part = (this.plunger.volume - minVolume) / (maxVolume - minVolume);
            let eps = 0.001;
            eps *= lin(part, [0,   0.2, 0.3, 0.5, 0.7, 0.8,  1 ], 
                             [1/8, 1/4, 1/2,  1,  1/2, 1/4, 1/8]);

            heater.rate = 1 + (this.plunger.velo < -0.1 ? eps/2 : eps);

            heater.warm();

            // replace real pressure metering with ideal one
            if (glo.pretty) {
                let temperature =  this.plunger.volume * pressure / glo.BOLTZ / this.space.N;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = pressure;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = temperature;
            }
        }); 
        heater.dispose();
    }
    
    async isobaricCompression(minVolume: number) {

        let heater = new Heater(this.plunger.x1 - 5,  this.plunger.top, this.plunger.x2 + 5, this.plunger.realBottom + 5, 1, "red");
        this.space.addDevice(heater);

        let pressure = this.plunger.pressure;  // replace real
        let maxVolume = this.space.plunger.volume;

        await this.whileAsync(() => this.plunger.volume > minVolume, () => {

            let part = (this.plunger.volume - minVolume) / (maxVolume - minVolume);
            let eps = 0.001;
            eps *= lin(part, [0,   0.2, 0.3, 0.5, 0.7, 0.8,  1 ], 
                             [1/8, 1/4, 1/2,  1,  1/2, 1/4, 1/8]);
                             
            heater.rate = 1 - (this.plunger.velo > 0.1 ? eps/2 : eps);

            heater.warm();

            // replace real pressure  metering with ideal one
            if (glo.pretty) {
                let temperature =  this.plunger.volume * pressure / glo.BOLTZ / this.space.N;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = pressure;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = temperature;           
            }
        }); 
        heater.dispose();
    }      
    //#endregion


    //#region  isothermic 
    
    async isothermicExtention(minMass: number) {
        let heater = new Heater(this.plunger.x1 - 5, this.plunger.top, this.plunger.x2 + 5, this.plunger.realBottom + 5, 1, "red");
        this.space.addDevice(heater);

        let initT = this.plunger.measureTemperature();
        await this.whileAsync(() => this.plunger.m > minMass, () => {
            const k = this.plunger.velo > 0.1 ? 1 : 0.9995;
            this.plunger.m *= k;
            let currT = this.plunger.measureTemperature();  
            heater.rate = (initT - currT) * 0.001 + 1;
            heater.warm();  

            // replace real pressure metering with ideal one
            if (glo.pretty) {
                let pressure = initT *  glo.BOLTZ * this.space.N /  this.plunger.volume;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = pressure;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = initT;            
            }
        }); 
        heater.dispose();
    }
    
    async isothermicCompression(maxMass: number) {
        let heater = new Heater(this.plunger.x1 - 5, this.plunger.top, this.plunger.x2 + 5, this.plunger.realBottom + 5, 1, "red")
        this.space.addDevice(heater);
        let initT = this.plunger.measureTemperature();
        await this.whileAsync(() => this.plunger.m < maxMass, () => {
            const k = this.plunger.velo < -0.1 ? 1 : 0.9995;
            this.plunger.m /= k;
            let currT = this.plunger.measureTemperature(); 
            heater.rate = (initT - currT) * 0.001 + 1;             
            heater.warm(); 

            // replace real pressure metering with ideal one
            if (glo.pretty) {
                let pressure = initT *  glo.BOLTZ * this.space.N /  this.plunger.volume;
                this.plunger.meterings[this.plunger.meterings.length - 1].p = pressure;
                this.plunger.meterings[this.plunger.meterings.length - 1].t = initT; 
            }
        }); 
        heater.dispose();
    }  
      
    //#endregion

    //#region isohoric 

    // охолодження, маса зменшується
    async isohoricCompression(mimMass: number) {
        let heater = new Heater(this.plunger.x1 - 5, this.plunger.top, this.plunger.x2 + 5, this.plunger.realBottom + 5, 1, "red");
        this.space.addDevice(heater);
        const vol = this.plunger.volume
        await this.whileAsync(() => this.plunger.m > mimMass, () => {
            // гасіння коливань зміною маси вантажу
            if (this.plunger.volume > vol) {
                if (this.plunger.velo < 0) {
                    this.plunger.m *= 1 + Math.min(0.002, (-this.plunger.velo) ** 0.5)
                }
            } else if (this.plunger.volume < vol) {
                if (this.plunger.velo > 0) {
                    this.plunger.m *= 1 - Math.min(0.002, this.plunger.velo ** 0.5)
                }
            }
            this.plunger.m *= 0.999;
            heater.rate = 0.999 ;
            heater.warm();

            

            // replace real pressure metering with ideal one
            if (glo.pretty) {
                const last = this.plunger.meterings.length - 1;
                let pressure = this.plunger.meterings[last].t *  glo.BOLTZ * this.space.N / vol;
                this.plunger.meterings[last].p = pressure;
                this.plunger.meterings[last].v = vol;
            }
        }); 
        heater.dispose();      
    }

    // нагрівання, маса збільшується
    async isohoricExtention(maxMass: number) {
        let heater = new Heater(this.plunger.x1 - 5, this.plunger.top, this.plunger.x2 + 5, this.plunger.realBottom + 5, 1, "red");
        this.space.addDevice(heater);
        const vol = this.plunger.volume
        await this.whileAsync(() => this.plunger.m < maxMass, () => {
            // гасіння коливань зміною маси вантажу
            if (this.plunger.volume > vol) {
                if (this.plunger.velo < 0) {
                    this.plunger.m *= 1 + Math.min(0.002, (-this.plunger.velo) ** 0.5)
                }
            } else if (this.plunger.volume < vol) {
                if (this.plunger.velo > 0) {
                    this.plunger.m *= 1 - Math.min(0.002, this.plunger.velo ** 0.5)
                }
            }
            this.plunger.m *= 1.001;

            heater.rate = 1.001;
            heater.warm();
            
            // replace real pressure metering with ideal one
            if (glo.pretty) {
                const last = this.plunger.meterings.length - 1;
                let pressure = this.plunger.meterings[last].t *  glo.BOLTZ * this.space.N / vol;
                this.plunger.meterings[last].p = pressure;
                this.plunger.meterings[last].v = vol;
            }
        }); 
        heater.dispose();
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
        this.space.removeSelectedDevice();
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
        await this.whileAsync(() => line.x1 >= x1, () => { line.move(-10, 0) } );

        // await this.calm();
    }

    //#endregion Otto Cicle
}

