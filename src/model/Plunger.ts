import Line from "./Line.js"; 
import Space from './Space.js';
import {glo} from '../globals/globals.js';


// u -outer work, e - enthropy
export type PlungerMetering = { n: number, p: number, v: number, t: number, u: number, q: number, s: number}; 
export type PlungerScales = {v: number, p: number, t: number, s: number, x: number, w: number};

export class Plunger extends Line 
{
   static GAP = 40;
   static BALL_M = 0.4;

   top: number;
   bottom: number;   
   realTop: number;
   realBottom: number;   
 
   m = 0;      // payload
   u = 0;      // робота газу при розширенні (при стисканні вона від'ємна)
   loss = 0;   // plunger loss

   velo = 0;   // velocity
   impulseFromBalls = 0;  // допоміжне тимчасове значення, не є імпульсом
   withFriction = false;
   fixed = false;

   space: Space | null = null;
   
   lastMetering: PlungerMetering;
   meterings: PlungerMetering[];

   scales: PlungerScales = {v:1, p:6, t:21, s:1, x:1, w:1};  // default values
   
   constructor(x1: number, y1: number, x2: number, y2: number, y: number, )
   {
      super(x1, y, x2, y, "green");
      this.top = y1 + Plunger.GAP / 4;
      this.bottom = y2 - Plunger.GAP; 
      this.realTop = y1;
      this.realBottom = y2; 
      
      this.lastMetering = {n: 0, p: 0, v: this.volume, t: 0, u: 0, q: 0, s:0};
      this.meterings = [this.lastMetering];
   }

   // temperature 
   get t() {
      return this.lastMetering.t
   }      

   // фактично маса на поршні, а не енергія до об'єму
   get pressureM(): number {
      return this.m * glo.g / (this.x2 - this.x1);
   }

   getPressure(): number {
      const [sumE, _ ] = this.sumEnergyUnderPlunger();
      const v = (this.x2 - this.x1) * (this.realBottom - this.y1);
      return sumE / v;
   }

   get volume(): number {
      return (this.x2 - this.x1) * (this.realBottom - this.y1);
   }

   set volume(vol: number){
      this.y1 = this.realBottom + vol / (this.x2 - this.x1);
   }

   get width() {
      return this.x2 - this.x1;
   }

   getPayloadRect(): {x: number, y: number, w: number, h: number} {
      let m = 4 * this.m;
      if (m < 1000) m = 1000;
      
      const wMax = this.x2 - this.x1 - 10;
      let w = Math.sqrt(m/1.5);
      if (w > wMax) w = wMax;
      if (w < 40) w = 40;
      let h = m / w

      let x = (this.x1 + this.x2 - w) / 2;
      let y = this.y1 - h - 6;
      return {x, y, w, h};
   }
   
   moveByForces() {

      // M dv = imp = M g dt + ifb ,    ifb = impulseFromBalls
      // dv = g dt + ifb / M 
      let dv = glo.g /* *1 */ + this.impulseFromBalls / this.m;
      this.velo += dv; 

      // обмеження швидкості поршня - втрата енергії
      if (this.withFriction) {         
         const k = 1 - 0.01;
         this.velo *= k;
         // підрахунок втрат    
         this.loss += (1 - k**2) * this.velo**2 * this.m / 2;
      }

      // обмеження координат поршня
      let y = this.y1 + this.velo; 
      if (y < this.top && this.velo < 0) {
         this.y1 = this.y2 = this.top;
         // підрахунок втрат    
         this.loss += this.velo**2 * this.m / 2;
         this.velo = 0;
      }
      if (y > this.bottom && this.velo > 0 ) {
         this.y1 = this.y2 = this.bottom;
         // підрахунок втрат    
         this.loss += this.velo**2 * this.m / 2;
         this.velo = 0;
      }
      this.move(0, this.velo);
   }
   
   
   move(dx:number, dy: number) 
   {  
      // зсув куль з-під поршня
      let xLeft = this.x1;
      let xRight = this.x2;
      let yTop = dy > 0  ? this.y1 : this.y1 + dy; 
      let yBottom = dy <= 0 ? this.y1 : this.y1 + dy; 

      for (let ball of this.space!.balls()) {
         if (xLeft <= ball.x && ball.x <= xRight && yTop <= ball.y && ball.y <= yBottom) {
            const delta = dy < 0 ? -0.001 : 0.001;
            ball.y = this.y1 + dy + delta;
         } 
      }

      // зсув поршня
      this.y2 = this.y1 += dy; 
      this.u -= dy * this.m * glo.g;

      // очистка накопиченого імпульсу після зсуву поршня
      this.impulseFromBalls = 0;
   }

   sumEnergyUnderPlunger(): [number, number] {
      if (!this.space) {
         throw Error('No reference to the space in the plunger.');
      }
      let n = 0, doublesumE = 0;
      for (let ball of this.space!.balls()) {
         if (this.isUnderPlunger(ball.x, ball.y)) {
            n++;
            let ball_vv = ball.vx**2 + ball.vy**2;
            doublesumE += ball.m * ball_vv;
         }          
      }
      return [doublesumE / 2, n]
   }

   measureTemperature() {
      let [sumE, n] = this.sumEnergyUnderPlunger()
      return sumE / n / glo.BOLTZ;
   }

   // Вклад кінктичної енергії поршня в роботу, виконану газом
   get kinetic() {
      return  Math.sign(-this.velo) * (this.m * this.velo**2 / 2);
   }

   // вимір робиться у прямокутнику під поршнем
   //
   measure()
   {  
      const [sumE, n] = this.sumEnergyUnderPlunger();
      const v = (this.x2 - this.x1) * (this.realBottom - this.y1);
      // t температура - середня кінетична енергія куль
      // p тиск - сумарна кінетична енергія куль в одиниці об'єму
      // u = Mgh + Mv**2/2 
      let p = sumE / v;
      let t = sumE / (n * glo.BOLTZ);
      let u = this.u + this.kinetic; 

      // сумарна теплота всіх нагрівачів
      let q = this.space!.givenHeat - this.space!.takenHeat; 
      
      // ентропія  ds = dq / t
      let ds = (q - this.lastMetering.q) / t;
      if (!ds) { 
         ds = 0;
      }
      let s = this.lastMetering.s + ds;
      
      this.lastMetering = {n, p, v, t, u, q, s};
      this.meterings.push(this.lastMetering);
   }

   private isUnderPlunger(x: number, y: number): boolean 
   {
      return this.x1 < x && x < this.x2 &&  this.y1 < y && y < this.realBottom; 
   }

   clearMeterings() {  
      this.meterings = [];
      this.u = 0;
      this.loss = 0;
      // clear global heat
      this.space!.givenHeat = this.space!.takenHeat = 0; 
      this.velo = 0;
      this.measure();
   }

   getAvgMetering(len: number): PlungerMetering {
      let res: PlungerMetering = {n: 0, p: 0, v: 0, t: 0, u: 0, q: 0, s:0};
      let ms = this.meterings.slice(-len);
      ms.reduce((ac, m) => {
         ac.p += m.p;
         ac.v += m.v;
         ac.t += m.t;
         ac.u += m.u;
         ac.q += m.q;
         ac.s += m.s;
         return ac;
      }, res);
      res.p /= len;
      res.v = this.volume;
      res.t /= len;
      res.u /= len;
      res.q /= len;
      res.s /= len;
     
      return res;
   }

   scale(x: string) {
      const coef = 1.1;
      if (x == 'P') {
         this.scales.p *= coef;
      } else if (x == 'p') {
         this.scales.p /= coef;
      } else if (x == 'T') {
         this.scales.t *= coef;
      } else if (x == 't') {
         this.scales.t /= coef;
      } else if (x == 'V') {
         this.scales.v *= coef;
      } else if (x == 'v') {
         this.scales.v /= coef;
      } else if (x == 'S') {
         this.scales.s *= coef;
      } else if (x == 's') {
         this.scales.s /= coef;
      } else if (x == 'X') {
         this.scales.x *= coef;
      } else if (x == 'x') {
         this.scales.x /= coef;
      } 
   }

}