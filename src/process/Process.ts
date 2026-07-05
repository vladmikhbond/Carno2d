import { Heater} from '../model/Heaters.js';
import ProcessBase from './ProcessBase.js';
import Bomb from '../model/Bomb.js';

export default class Process extends ProcessBase {

    //#region adiabatic 

    async adiabaticExtention(minMass: number) {
        await this.whileAsync(() => this.plunger.m > minMass, () => {
            const k = this.plunger.velo < -0.2 ? 0.9999 : 0.999;
            this.plunger.m *= k;
        }); 
    }

    async adiabaticCompression(maxMass: number) {
        await this.whileAsync(() => this.plunger.m < maxMass, () => {
            const k = this.plunger.velo > 0.2 ? 0.9999 : 0.999;
            this.plunger.m /= k;
        }); 

    }
    //#endregion
    
    //#region  isothermic 
    
    // тиск (маса) зменшується, об'їм зростає, енергія додається, але t = const
    async isothermicExtention(minMass: number) {
        let heater = new Heater(this.plunger.x1 - 5, this.plunger.top, this.plunger.x2 + 5, this.plunger.realBottom + 5, 1, "red");
        this.space.addDevice(heater);
        let initT = this.plunger.measureTemperature();
        await this.whileAsync(() => this.plunger.m > minMass, () => {
            const k = this.plunger.velo > 0.2 ? 0.9999 : 0.999;
            this.plunger.m *= k;
            let currT = this.plunger.measureTemperature();
            heater.rate = currT < initT ? 1.001 :  0.999; 
              
            heater.warm();  
        }); 
        heater.dispose();
    }
    
    async isothermicCompression(maxMass: number) {
        let heater = new Heater(this.plunger.x1 - 5, this.plunger.top, this.plunger.x2 + 5, this.plunger.realBottom + 5, 1, "red")
        this.space.addDevice(heater);
        let initT = this.plunger.measureTemperature();
        await this.whileAsync(() => this.plunger.m < maxMass, () => {
            const k = this.plunger.velo < -0.2 ? 0.9999 : 0.999;
            this.plunger.m /= 0.999;
            let currT = this.plunger.measureTemperature();
            heater.rate = currT < initT ? 1.001 :  0.999;              
            heater.warm();    
        }); 
        heater.dispose();
    }  
      
    //#endregion

    //#region isohoric

    // нагрівання
    async isohoricExtention(maxMass: number) {
        let heater = new Heater(this.plunger.x1 - 5, this.plunger.top, this.plunger.x2 + 5, this.plunger.realBottom + 5, 1, "red");
        this.space.addDevice(heater);
        this.plunger.fixed = true;
        await this.whileAsync(() => this.plunger.m < maxMass, () => {
            let k = this.plunger.velo > 0.2 ? 1.001 : 0.999;
            this.plunger.m /= k;        
            heater.rate = k**-0.5;
            heater.warm();
        }); 
        this.plunger.fixed = false;
        heater.dispose();

    }
    
    // охолодження
    async isohoricCompression(mimMass: number) {
        let heater = new Heater(this.plunger.x1 - 5, this.plunger.top, this.plunger.x2 + 5, this.plunger.realBottom + 5, 1, "red");
        this.space.addDevice(heater);
        this.plunger.fixed = true;
        await this.whileAsync(() => this.plunger.m > mimMass, () => {
            let k = this.plunger.velo < -0.2 ? 1.001 : 0.999;
            this.plunger.m *= k;
            heater.rate = k**0.5;
            heater.warm();
        }); 
        this.plunger.fixed = false;
        heater.dispose();       
    }
    //#endregion
    
    //#region isobaric

    async isobaricExtention(maxVolume: number) {
        let heater = new Heater(this.plunger.x1 - 5,  this.plunger.top, this.plunger.x2 + 5, this.plunger.realBottom + 5, 1.0005, "red");
        this.space.addDevice(heater);
        let pressure = this.plunger.pressure;
        await this.whileAsync(() => this.plunger.volume < maxVolume, () => {
            heater.warm();
            // replace real pressure metering
            this.plunger.meterings[this.plunger.meterings.length - 1].p = pressure;
        }); 
        heater.dispose();
    }
    
    
    async isobaricCompression(minVolume: number) {
        let heater = new Heater(this.plunger.x1 - 5,  this.plunger.top, this.plunger.x2 + 5, this.plunger.realBottom + 5, 0.9995, "red");
        this.space.addDevice(heater);

        let pressure = this.plunger.pressure;
        await this.whileAsync(() => this.plunger.volume > minVolume, () => {
            heater.warm();
            // replace real pressure  metering
            this.plunger.meterings[this.plunger.meterings.length - 1].p = pressure;            
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
        await this.whileAsync(() => line.x1 > x1, () => { line.move(-10, 0) } );

        await this.calm(100);
    }

    //#endregion Otto Cicle
}

