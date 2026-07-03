export default class Bomb {
    n: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    vx: number;
    vy: number;
    t: number;
    r: number;
    m: number;
    c: string;

    constructor(n: number, x1: number, y1: number,  x2: number, y2: number, vx: number, vy: number, t: number, r: number, m: number, c: string) {
        this.n = n;
        this.x1 = x1;
        this.x2 = x2;
        this.y1 = y1;
        this.y2 = y2;
        this.vx = vx;
        this.vy = vy;
        this.t = t;
        this.r = r;
        this.m = m;
        this.c = c;
    }


}
