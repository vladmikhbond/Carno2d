import Line from "./Line.js"; 
import Space from './Space.js';
import {glo} from '../globals/globals.js';


// u -outer work, e - enthropy
export type PlungerMetering = { n: number, p: number, v: number, t: number, u: number, q: number, s: number}; 
export type PlungerScales = {v: number, p: number, t: number, s: number, x: number, w: number};

export class Plunger extends Line 
{
   static GAP = 40;
   
   top: number;
   bottom: number;   
   realTop: number;
   realBottom: number;   
 
   m = 100;    // payload
   u = 0;      // outer work
   loss = 0;   // plunger loss
   t = 0;      // temperature
   velo = 0;   // velocity
   impulse = 0;
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

   get pressure(): number {
      return this.m * glo.g / (this.x2 - this.x1);
   }

   get volume(): number {
      return (this.x2 - this.x1) * (this.realBottom - this.y1);
   }

   set volume(vol: number){
      this.y1 = this.realBottom + vol / (this.x2 - this.x1);
   }
   
   // get realBottom(): number {
   //    return this.bottom + Plunger.GAP;
   // }

   payloadRect(): {x: number, y: number, w: number, h: number} {
      let w = this.x2 - this.x1;
      w = w > 120 ? 100 : w - 20;
      let h = 5 * this.m / w;
      let x = (this.x1 + this.x2 - w) / 2;
      let y = this.y1 - h;
      return {x, y, w, h};
   }
   

   // 
   // a = globus.g  + this.impulse / dt / (this.m + Plunger.M0)            WHERE this.impulse / dt = f (сила)
   // dv = a * dt
   //
   moveByForces() {
      // гравітація діє лише на навантаження, а інерція поршня залежить від його загальної маси
      // let dv = (globus.g * this.m + this.impulse) / (this.m + Plunger.M0); 
      
      // гравітація діє на поршень і його навантаження
      let dv = glo.g + this.impulse / this.m;


      this.velo += dv; 

      // обмеження швидкості поршня - втрата енергії
      if (this.withFriction) {         
         const k = 1.1**-((5 * this.velo)**2);
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
      this.impulse = 0;
   }

   private sumEnergyUnderPlunger(): [number, number] {
      if (!this.space) {
         throw Error('No reference to the space in the heater.');
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

   // вимір робиться у прямокутнику під поршнем
   //
   measure()
   {  
      let [sumE, n] = this.sumEnergyUnderPlunger();
      let v = (this.x2 - this.x1) * (this.realBottom - this.y1);
      // t температура - середня кінетична енергія куль
      // p тиск - сумарна кінетична енергія куль в одиниці об'єму
      let p = sumE / v;
      this.t = sumE / n / glo.BOLTZ;
      let u = this.u;

      // сумарна теплота всіх нагрівачів
      let q = this.space!.givenHeat - this.space!.takenHeat; 
      
      let ds = (q - this.lastMetering.q) / this.t;
      if (!ds) 
         ds = 0;
      let s = this.lastMetering.s + ds;

      this.lastMetering = {n, p, v, t: this.t, u, q, s: s};

      this.meterings.push(this.lastMetering);
   }

   private isUnderPlunger(x: number, y: number): boolean 
   {
      return this.x1 < x && x < this.x2 &&  this.y1 < y && y < this.realBottom; 
   }

   clearMeterings() {
      this.meterings = [this.lastMetering];
      this.u = 0;
      this.loss = 0;
      // clear global heat
      this.space!.givenHeat = this.space!.takenHeat = 0;
        
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