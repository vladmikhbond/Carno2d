import {glo} from '../globals/globals.js';
import Ball from './Ball.js';
import Line from './Line.js';
import Device from './Device.js';
import {Plunger} from './Plunger.js';
import { WallCont, BallCont, DevCont } from './SpaceConts.js';
import Bomb from './Bomb.js';
import { Heater } from './Heaters.js';

// export enum TimeMode {Stop, Play};
export enum CreateMode {Info, Gas, Wall, Devs};

export default class Space 
{
    width: number;
    height: number;

    N = 0              // поточна кількість куль

    cell = 20          // сторона комірки
    givenHeat = 0;      // тепло, віддане усіма нагрівачами
    takenHeat = 0;      // тепло, забране усіма охолоджувачами 
    // підраховує тепло при нагріванні 
    heatAccounting (dE: number) {if (dE > 0) this.givenHeat += dE; else this.takenHeat -= dE;}

    private bcont!: BallCont;
    private wcont!: WallCont;
    private dcont!: DevCont;
    
    selectedLine: Line | null = null;
    selectedBall: Ball | null = null;
    selectedDevice: Device | null = null;

    bombs: Bomb[] = [];


    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.resetContainers();
    }

    resetContainers() {
        this.bcont = new BallCont(this);
        this.wcont = new WallCont(this);
        this.dcont = new DevCont(this);
    }

    clear() {
        this.clearBalls();
        this.clearLines();
        this.clearDevices();
        this.givenHeat = this.takenHeat = 0;
    }

//#region Balls

    addBall(ball: Ball) {
        ball.space = this;
        this.bcont.add(ball);
    }

    // Якщо в бомбі задано t, швидкості випадкові. В іншому разі мають бути задані vx, vy.
    //
    addBomb(b: Bomb) 
    {
        let v = (b.t * 2 * glo.BOLTZ / b.m) ** 0.5;    //(b.vx**2 + b.vy**2)**0.5;
        for (let i = 0; i < b.n; i++) {
            // position
            let x = b.x1 + Math.random() * (b.x2 - b.x1);
            let y = b.y1 + Math.random() * (b.y2 - b.y1);
            let ball;
            // velocity
            if (b.t) {
                let alpha = Math.random() * 2 * Math.PI;
                ball = new Ball(x, y, v * Math.cos(alpha), v * Math.sin(alpha), b.r, b.m, b.c);
            } else {
                ball = new Ball(x, y, b.vx, b.vy, b.r, b.m, b.c);
            }
            this.addBall(ball);
        }
        this.bombs.push(b);
        this.N += b.n;
    }

    balls() { 
        return this.bcont.values(); 
    }

    population(point: {x: number, y: number}) { return this.bcont.population(point) }

    selectBall(x: number, y: number) { this.bcont.select(x, y) }

    removeSelectedBall() { this.bcont.removeSelected() }

    clearBalls() { 
        this.bcont.clear();
        this.selectedBall = null;  
        this.bombs.length = 0;
    }


//#endregion Balls

//#region Lines

    addLine(line: Line) { 
        this.wcont.add(line);
        this.selectedLine = line;
    }
    
    removeSelectedLine() { this.wcont.removeSelected() }

    selectLine(x: number, y: number) { this.wcont.select(x, y) }
    
    clearLines() { 
        this.wcont.clear(); 
        this.selectedLine = null; 
    }
    
    lines() { return this.wcont.values() }

    get plungers() { return <Plunger[]>this.wcont.values().filter(l => l instanceof Plunger);  }

    get plunger() { return this.plungers[0]}


    addEmptyPlunger(x1: number, y1: number, x2: number, y2: number, color: string) {
        this.addLine(new Line(x1, y1, x1, y2, color));  // left
        this.addLine(new Line(x2, y1, x2, y2, color));  // right
        this.addLine(new Line(x1, y2, x2, y2, color));  // bottom

        let plunger = new Plunger(x1, y1, x2, y2, y2 - Plunger.GAP);
        this.addLine(plunger); 
        return plunger;
    }

//#endregion

//#region Devices

    addDevice(device: Device) { 
        this.dcont.add(device);
        this.selectedDevice = device;
    }
        
    removeSelectedDevice() { 
        this.dcont.removeSelected(); 
    }

    selectDevice(x: number, y: number) { this.dcont.select(x, y) }

    clearDevices() { 
        this.dcont.clear(); 
        this.selectedDevice = null; 
    }

    devices() { 
        return this.dcont.devices;
    }

//#endregion Devices

    // зміна швидкості куль від нагріву або охолодження
    warming() {
        for (let device of this.devices()) {
            if (device instanceof Heater) {
                (device as Heater).warm();
            }
        }
    }

    step()
    {
        // зсуваються вертикальні поршні
        for (let plunger of this.lines()) {
            if (plunger instanceof Plunger) {
                if (!plunger.fixed)
                    plunger.moveByForces();
            }
        }
        
        // всі кулі роблять крок (з перекладанням до нового контейнеру тих, що зосталися в полі зору) 
        const cont = new BallCont(this);
        this.N = 0;
        glo.strikes = 0;
              
        for (let ball of this.balls()) {
            ball.step();            
            if (ball.x >= 0 && ball.x <= this.width && ball.y >= 0 && ball.y <= this.height) {
                cont.add(ball);
                this.N++;
            }
        }        
        this.bcont = cont;

        // зміна швидкості куль від нагріву або охолодження
        // this.warming(); // !!!!!!!!!
    }


    measure() {
        this.devices().forEach(d => d.measure());
        this.plungers.forEach(p => p.measure());
    }

}
