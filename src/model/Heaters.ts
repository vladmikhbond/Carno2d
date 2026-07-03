import Device from './Device.js';

export class Heater extends Device 
{
   erg = 0;             // given amount of heat
   rate: number;        // speed of heating 

   constructor(x1: number, y1: number, x2: number, y2: number,  rate: number, c: string)
   {
      super(x1, y1, x2, y2, c);
      this.rate = rate;
   }

   get avatar() {return "H"}

   warm() {
      const k = this.rate;

      for (let ball of this.space!.balls()) 
      {
         if (this.c && ball.c != this.c)
            continue;
         if (this.isInside(ball.x, ball.y)) {                        
            // зміна енергії
            ball.vx *= k;
            ball.vy *= k; 
            let ball_e = (ball.vx**2 + ball.vy**2) * ball.m / 2;
            // облік тепла
            let dE = (k**2 - 1) * ball_e;
            this.erg += dE;
            this.space!.heatAccounting(dE);
         }          
      }
   }

}
