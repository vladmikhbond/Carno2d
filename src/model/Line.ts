import {distToInfiniteLine, inside} from './Geometry.js'
import {glo} from '../globals/globals.js';
import { quanty } from '../globals/utils.js';

export default class Line {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    c: string;
    
    constructor(x1: number, y1: number, x2: number, y2: number, c: string) {

        // нормалізація і квантифікація
        if (x1 > x2) [x1, x2] = [x2, x1];
        if (y1 > y2) [y1, y2] = [y2, y1];
        [x1, x2, y1, y2] = [x1, x2, y1, y2].map(x => quanty(x));

        this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2; this.c = c;
    }

    // вспомогательные параметры линии для разных формул
    get A() { return this.y2 - this.y1; }
    get B() { return this.x1 - this.x2; }
    get C() { return this.x2 * this.y1 - this.x1 * this.y2; }
    get k() { return (this.y1 - this.y2) / (this.x1 - this.x2); }
    get b() { return this.y1 + this.x1 * (this.y2 - this.y1) / (this.x1 - this.x2); }

    get p1() { return { x: this.x1, y: this.y1 } }
    get p2() { return { x: this.x2, y: this.y2 } }


    isInside(x: number, y: number) {
        // TODO це приблизно
        let d = distToInfiniteLine({x, y}, this);
        return d < 5 && inside(this.x1, this.y1, this.x2, this.y2, x, y); 
    }

    get isHor() {
        return Math.abs(this.y1 - this.y2) < glo.quant;
    }
        
    move(dx:number, dy: number) {
        //[dx, dy] = [dx, dy].map(x => globus.quanty(x));
        this.x1 += dx;
        this.x2 += dx;
        this.y1 += dy;
        this.y2 += dy;
    }

    justify() {
        this.x1 = quanty(this.x1);
        this.x2 = quanty(this.x2);
        this.y1 = quanty(this.y1);
        this.y2 = quanty(this.y2);        
    }
    
    // virtuals for Plunger
    clearMeterings() {}
    measure() {}
}
