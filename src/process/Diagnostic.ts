import { glo } from "../globals/globals.js";
import { Plunger } from "../model/Plunger.js";

export default class Diagnostic {
    pp = 0;
    tt = 0; 
    i = 0;
    plunger: Plunger;

    constructor(plunger: Plunger) {
        if (!plunger) {
            throw new Error()
        }
        this.plunger = plunger;  
    }

    checkPT() {
        const plun = this.plunger;
        // P = M * g / s 
        let P = plun.pressure;
        // T = P * V / (Bo * N) 
        let T = plun.volume * P / glo.BOLTZ / plun.space!.N;

        const last = plun.meterings.length - 1;  
        this.pp += (plun.meterings[last].p - P)**2;
        this.tt += (plun.meterings[last].t - T)**2;
        this.i++;
    }

    get stdP() {
        return Math.sqrt(this.pp / this.i).toFixed(4);
    }

    get stdT() {
        return Math.sqrt(this.tt / this.i).toFixed(4);
    }

}
