import Space from './Space.js';
import {glo} from '../globals/globals.js';
import { quanty } from '../globals/utils.js';

export default class Device
{
   x1: number;
   y1: number;
   x2: number;
   y2: number;
   c: string;  // колір куль, на які діє пристрій

   // встановлюється при додаванні девайса до простіру
   space: Space | null = null;

   constructor(x1: number, y1: number, x2: number, y2: number, c = '')
   {
      // нормалізація і квантифікація
      if (x1 > x2) [x1, x2] = [x2, x1];
      if (y1 > y2) [y1, y2] = [y2, y1];
      [x1, x2, y1, y2] = [x1, x2, y1, y2].map(x => quanty(x));
      
      this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2; 
      this.c = c;
   }
   
   isInside(x:number, y: number) {
      return this.x1 < x && x < this.x2 &&  this.y1 < y && y < this.y2 
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

   measure(){return {n: 0, t: 0, p: 0}}

   get avatar() {return ""}

   dispose() {
      if (this.space) {
         let oldSelectedDevice = this.space.selectedDevice;
         this.space.selectedDevice = this;
         this.space.removeSelectedDevice();
         this.space.selectedDevice = oldSelectedDevice;
      }
   }

}

