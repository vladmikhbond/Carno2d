import {glo} from '../globals/globals.js';
import {dist, angle, turnV, cross, inside, crossSegSeg, crossSegLine, Point} from './Geometry.js'
import Space from './Space.js';
import Line from './Line.js';
import {Plunger} from './Plunger.js';

type StrikeData = {p1: Point, p2: Point, v: Point, prevLine: Line | null };

export default class Ball {
    private static id = 0;

    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    c: string;
    m: number;
    space: Space | null = null;
    moved = false;
    id = 0;
    // попередні координати (для виміру вільного пробігу)
    prevX: number;
    prevY: number;
    

    constructor(x: number, y: number, vx: number, vy: number, r=1, m=1, c='lightgray') {
        this.x = this.prevX = x; 
        this.y = this.prevY = y; 
        this.vx = vx; this.vy = vy; 
        this.r = r; this.c = c; this.m = m; 
        this.id = ++Ball.id;
    }

    isInside(x:number, y: number) {
        return dist(this, {x, y}) <= 3;        
    }
  
    move(dx:number, dy: number) {
        this.x += dx;
        this.y += dy;
    }

    justify() { }    // virtual

    step() {
        
        if (this.space == null)
           throw new Error('Ball is out of a box.');

    
        // зміна швидкості при пружному зіткненні з іншими кулями
        let neighbours = this.space.population(this);
        let i = neighbours.indexOf(this);
        for (let j = i + 1; j < neighbours.length; j++ ) {
             this.ballStriking(neighbours[j]);
        }
        
        // зміна швидкості під впливом тяжіння
        if (glo.gBall) {
            this.vy += glo.g;
        }

        // позначка, що зміна швидкості і координат частки вже відбулася
        let moved = this.wallStriking();

        // зміна координат кулі
        if (!moved) {
            this.prevX = this.x;
            this.prevY = this.y;
            
            this.x += this.vx;
            this.y += this.vy;
        }
        
    }

    ballStriking(b2: Ball) 
    {
        let b1 = this;
        let d = dist(b1, b2);
        // кулі далеко
        if (d > b1.r + b2.r)
            return;
        // кулі близько, але розходяться
        let dx = b2.x - b1.x, dy = b2.y - b1.y;
        let dvx = b2.vx - b1.vx, dvy = b2.vy - b1.vy;
        let scalar = dx * dvx + dy * dvy;
        if (scalar >= 0  )
            return; 

        // кут між прямою через центри куль і віссю Ox
        let alpha = angle(b1, b2);
        // поворот швидкостей
        turnV(b1, alpha);
        turnV(b2, alpha);

         // обмін швидкостей уздовж Ох
        let avx = ((b1.m - b2.m) * b1.vx + 2 * b2.m * b2.vx) / (b1.m + b2.m);
        let bvx = ((b2.m - b1.m) * b2.vx + 2 * b1.m * b1.vx) / (b1.m + b2.m);
        b1.vx = avx;
        b2.vx = bvx;

        // зворотний поворот швидкостей
        turnV(b1, -alpha);
        turnV(b2, -alpha);
      
        // підрахунок зіткнень
        glo.strikes++;
    }

    // Вибудовує траекторю декількох зіткнень зі стінками.
    // Повертає true, коли є хоч одне зіткнення.
    //
    wallStriking(): boolean 
    {       
        const ball = this;
        let sdata0: StrikeData = {
            p1: {x: ball.x, y: ball.y},
            p2: {x: ball.x + ball.vx, y: ball.y + ball.vy},
            v: {x: ball.vx, y: ball.vy},
            prevLine: null
        }

        const FUSE = 10;
        for (let i = 0; i < FUSE; i++) {
            let sdata = this.strikeOneWall(sdata0);

            // остача тректорії стінок не зустрічає
            if (sdata == null) {
                if (i > 0) {
                    // знайдена хоч одна стінка
                    ball.prevX = ball.x;
                    ball.prevY = ball.y;
                            
                    ball.x = sdata0.p2.x; 
                    ball.y = sdata0.p2.y;
                    
                    ball.vx = sdata0.v.x; 
                    ball.vy = sdata0.v.y;
                    return true;
                } else {
                    // жодної стінки не знайдено
                    return false;
                }
            }
            sdata0 = sdata;
        }
        return true;
    }

    // Будує траекторю зіткнення з одною стінкою.
    // коли зіткнення немає, повертає в p1 значення null
    strikeOneWall(strikeData: StrikeData): StrikeData | null
    {
        let {p1, p2, v, prevLine} = strikeData;
        // знаходимо першу найближчу стінку і точку перетину
        let crossPoint: Point | null = null;
        let nearestLine: Line | null = null;
        let minDist = Number.MAX_VALUE;
        for (let line of this.space!.lines()) {
            if (prevLine == line) 
                continue;
            let c = crossSegSeg({x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y}, line);
            if (c) {
                let d = dist(p1, c);
                if (d < minDist) {
                    minDist = d;
                    crossPoint = c;
                    nearestLine = line;
                }
            }
        }
        if (crossPoint == null) 
            return null;

        // оновлює положення і швидкість кулі        
        if (nearestLine!.isHor) {
            p2 = {x: p2.x, y: 2 * crossPoint.y - p2.y}
            v.y = -v.y;
        } else {
            p2 = {y: p2.y, x: 2 * crossPoint.x - p2.x}
            v.x = -v.x;
        }
        p1 = crossPoint;
        
        // стінка є поршнем, накопичується імпульс на поршні 
        if (nearestLine instanceof Plunger && !nearestLine.fixed) 
        {
            // точний обмін швидкостей між кулею і поршнем уздовж Оy
            const M = nearestLine.m;
            const m = this.m;
            v.y = -v.y;  // відміняємо попередню зміну швидкості кулі
            // обмін швидкостей уздовж Оy
            const plung_vy = ((M - m) * nearestLine.velo + 2 * m * v.y) / (M + m);  
            const ball_vy = ((m - M) * v.y + 2 * M * nearestLine.velo) / (M + m);
            nearestLine.impulse += M * (plung_vy - nearestLine.velo);
            
            v.y = ball_vy;
        }        
                
        return {p1, p2, v, prevLine:nearestLine }
    }
     
}
