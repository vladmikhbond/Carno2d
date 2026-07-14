import Space from './Space.js';
import Ball from './Ball.js';
import Line from './Line.js';
import Device from './Device.js';
import {Plunger} from './Plunger.js';

export class BallCont {

    private arr: Ball[][][];  // [r][c][]
    private space: Space;
    private straightPassage = true;   // Напрямок проходження (прямий або зворотний)

    constructor(space: Space) 
    {
        this.space = space;

        let nrows = space.height / this.space.cell | 0 || 1;
        let ncols = space.width  / this.space.cell | 0 || 1;
        let arr: Ball[][][] = new Array(nrows);
        for(let r = 0; r < nrows; r++) {
            arr[r] = new Array(ncols);
            for(let c = 0; c < ncols; c++) {
                arr[r][c] = []; 
            }
        }
        this.arr = arr;
    }

    population(point:  {x: number, y: number}): Ball[] {
        let row = point.y / this.space.cell | 0;
        if (row < 0) row = 0;
        if (row >= this.arr.length) row = this.arr.length - 1;

        let col = point.x / this.space.cell | 0;
        if (col < 0) col = 0;
        if (col >= this.arr[row].length) col = this.arr[row].length - 1;
        
        return this.arr[row][col];
    }

    // Проходить по всім кулям, що в контейнері.
    //
    *values() {
        let arr = this.arr;
        if (this.straightPassage) {
            for(let r = 0; r < arr.length; r++) {
                for(let c = 0; c < arr[0].length; c++) {
                    for(let i = 0; i < arr[r][c].length; i++) {
                        yield arr[r][c][i];
                    }                 
                }
            }
        } else {
            for(let r = arr.length - 1; r >= 0; r--) {
                for(let c = arr[0].length - 1; c >= 0; c--) {
                    for(let i = 0; i < arr[r][c].length; i++) {
                        yield arr[r][c][i];
                    }                 
                }
            }
        }
        this.straightPassage = !this.straightPassage; 
    }

    
    add(ball: Ball) {
        this.population(ball).push(ball);
    }

    select(x: number, y: number) {
        this.space.selectedBall = null;
        let selBolls = [];    
        for (let ball of this.values()) {
            if (ball.isInside(x, y)) {
                selBolls.push(ball);
            }
        }
        selBolls.sort((a, b) => a.r - b.r);
        if (selBolls.length > 0) {
           this.space.selectedBall = selBolls[0];
        }
    }

    removeSelected() {
        if (this.space.selectedBall == null) {
            return;
        }
        let arr = this.arr;
        for(let r = 0; r < arr.length; r++) {
            for(let c = 0; c < arr[0].length; c++) {
                let i = arr[r][c].indexOf(this.space.selectedBall!);
                if (i > -1) {
                    arr[r][c].splice(i, 1);
                    this.space.selectedBall = null;
                    return;
                }              
            }
        }
    }

    clear() {
        for(let r = 0; r < this.arr.length; r++) {
            for(let c = 0; c < this.arr[0].length; c++) {
                this.arr[r][c].length = 0; 
            }
        }        
    }

}

export class WallCont 
{
    private arr: Line[] = []; 
    private space: Space;

    constructor (box: Space) {
        this.space = box;
    }

    values() { return this.arr; }

    add(line: Line) {        
        // нормалізація напряму ліній
        if (line.x1 > line.x2) { 
            let t = line.x1; line.x1 = line.x2; line.x2 = t; 
                t = line.y1; line.y1 = line.y2; line.y2 = t; 
        }
        
        this.arr.push(line);
        if (line instanceof Plunger)
           (line as Plunger).space = this.space;
    }

    select(x: number, y: number) {
        if (this.arr.length == 0) {
           return;
        }
        for (let l of this.arr) {
            if (l.isInside(x, y)) {
                this.space.selectedLine = l;                
                return;
            }
        }
        this.space.selectedLine = null;
    }

    removeSelected() {
        if (this.space.selectedLine == null) {
            return;
        }
        let i = this.arr.indexOf(this.space.selectedLine);
        if (i > -1) {
            this.arr.splice(i, 1);
            this.space.selectedLine = null;
        }
    }

    clear() {
        this.arr = [];
        this.space.selectedLine = null;
    }

}

export class DevCont 
{
    devices: Device[] = []; 
    private space: Space;

    constructor (space: Space) {
        this.space = space;
    }

    add(device: Device) 
    {        
        // нормалізація напряму ліній
        if (device.x1 > device.x2)  {
            let t = device.x1; device.x1 = device.x2; device.x2 = t; 
        }
        if (device.y1 > device.y2) {
            let t = device.y1; device.y1 = device.y2; device.y2 = t; 
        }   
        device.space = this.space;     
        this.devices.push(device);
    }

    select(x: number, y: number) {
        if (this.devices.length == 0) {
           return;
        }
        let devices = this.devices.filter(d => d.isInside(x, y));
        this.space.selectedDevice = devices.length > 0 ? devices[0] : null;
    }

    removeSelected() {
        if (this.space.selectedDevice == null) {
            return;
        }

        let i = this.devices.indexOf(this.space.selectedDevice);
        if (i > -1) {
            this.devices.splice(i, 1);
            this.space.selectedDevice = null;
        }
    }

    clear() {
        this.devices = [];
        this.space.selectedDevice = null;
    }

}

