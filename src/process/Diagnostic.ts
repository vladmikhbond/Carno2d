import { glo } from "../globals/globals.js";
import { Plunger } from "../model/Plunger.js";

export default class Diagnostic {
    ps: number[] = []
    ts: number[] = []
    vs: number[] = []
    p = ""
    t = ""
    v = ""
    n = ""

    plunger: Plunger

    constructor(plunger: Plunger) {
        if (!plunger) {
            throw new Error()
        }
        this.plunger = plunger;  
    }

    checkPT() {
        const plun = this.plunger;
        // V
        const V = plun.volume;
        // P = M * g / s 
        const P = plun.pressure;
        // T = P * V / (Bo * N) 
        const T = plun.volume * P / glo.BOLTZ / plun.space!.N;
        //
        const last = plun.meterings.length - 1;  
        this.ps.push(plun.meterings[last].p - P);
        this.ts.push(plun.meterings[last].t - T);
        this.vs.push(plun.meterings[last].v - V);       
    }

    resume() {
        let avgP = 0, avgT = 0, avgV = 0, n = this.ps.length;
        for (let i = 0; i < n; i++) {
            avgP += this.ps[i];
            avgT += this.ts[i];
            avgV += this.vs[i];
        }
        avgP /= n;
        avgT /= n;
        avgV /= n;

        let stdP = 0, stdT = 0, stdV = 0;
        for (let i = 0; i < n; i++) {
            stdP += (this.ps[i] - avgP)**2;
            stdT += (this.ts[i] - avgT)**2;
            stdV += (this.vs[i] - avgV)**2;
        }        
        stdP = Math.sqrt(stdP / n);
        stdT = Math.sqrt(stdT / n);
        stdV = Math.sqrt(stdV / n);
        
        this.p = `P:${avgP.toFixed(4)}|${stdP.toFixed(4)}`;
        this.t = `T:${avgT.toFixed(4)}|${stdT.toFixed(4)}`;
        this.v = `V:${avgP.toFixed(1)}|${stdP.toFixed(1)}`;
        this.n = "n:" + n;
        
    }

}
