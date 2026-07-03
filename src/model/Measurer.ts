import Device from './Device.js';
import Space from './Space.js'
import {glo} from '../globals/globals.js';

type Metering = { n: number, t: number, p: number, mfp: number};   // mfp - mean free path

export class Measurer extends Device
{
   static HIST_COLUMNS = 100;
   static METERING_NUMBER = 50;  // макс кількість замірів для усереднення

   shift = 0;  // зсув гарфиків по вертикалі

   histogram: number[] = [];
   meanFreePath: number = 0;

   meterings: Metering[] = [];

   space: Space | null = null;
   
   get avatar() {
      return "M";
   }

   avg(): Metering
   {
      const meterings = this.meterings.slice(-Measurer.METERING_NUMBER);
      let accum = [0, 0, 0, 0]; 
      accum = meterings.reduce((ac, m) => [ac[0] + m.n,  ac[1] + m.t, ac[2] + m.p, ac[3] + m.mfp], accum)
      let len = meterings.length;
      
      if (len) {
         return {n: accum[0]/len, t: accum[1]/len, p: accum[2]/len, mfp: accum[3]/len};
      } else {
         return {n: 0, t:0, p:0, mfp: 0};
      } 
   }
     
   measure(): Metering
   {  
      // truncate meterings
      if (this.meterings.length > Measurer.METERING_NUMBER * 2) {
         this.meterings.splice(0,  Measurer.METERING_NUMBER);
      } 

      let ballCount = 0, sumE = 0;

      let maxVV = -1;
      for (let ball of this.space!.balls()) {
         if (this.isInside(ball.x, ball.y) && (this.c == '' || this.c == ball.c)) {
            ballCount++;
            let vv = ball.vx**2 + ball.vy**2;
            sumE += ball.m * vv;
            if (maxVV  < vv) maxVV = vv;
         }          
      }
      sumE /= 2;
      
      // гістограмма швидкостей і довжина пробігу
      this.histogram = new Array(Measurer.HIST_COLUMNS).fill(0);
      let maxV = maxVV ** 0.5;
      let sumPath = 0;
      
      for (let ball of this.space!.balls()) {
         if (this.isInside(ball.x, ball.y) && (this.c == '' || this.c == ball.c)) {
            let v = (ball.vx**2 + ball.vy**2)**0.5;
            let idx = (Measurer.HIST_COLUMNS * v / maxV) | 0;
            this.histogram[idx]++;
            sumPath += ((ball.x - ball.prevX)**2 + (ball.y - ball.prevY)**2) ** 0.5;            
         }
      }
      let strikes = glo.strikes * ballCount / this.space!.N; 
      this.meanFreePath = sumPath / (2 * strikes);

      let metering: Metering = {
         n: ballCount,
         t: sumE / ballCount / glo.BOLTZ,                      // t температура - середня кінетична енергія куль                                      
         p: sumE / (this.x2 - this.x1) / (this.y2 - this.y1),  // p тиск - сумарна кінетична енергія куль в одиниці об'єму
         mfp: this.meanFreePath,
      };
      this.meterings.push(metering);

      return metering
   }

}
