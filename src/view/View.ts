import {glo, doc} from '../globals/globals.js';
import Space from '../model/Space.js';
import Ball from '../model/Ball.js';
import Line from '../model/Line.js';
import Device from '../model/Device.js';
import {Measurer} from '../model/Measurer.js';
import {Heater} from '../model/Heaters.js';
import {Plunger, PlungerMetering} from '../model/Plunger.js';



export default class View 
{
    space: Space;
    ctx: CanvasRenderingContext2D;
    ctx2: CanvasRenderingContext2D;

    viz = 10           // малювати кожну viz-ту частку

    constructor(space: Space) {
        this.space = space;
        this.ctx = (<HTMLCanvasElement>doc.canvas!).getContext("2d")!;             
        this.ctx2 = (<HTMLCanvasElement>doc.canvas2!).getContext("2d")!;             
    }

//#region Canvas1  

    draw() {   
        const ctx = this.ctx;
        const space = this.space;
        ctx.clearRect(0, 0, doc.canvas.width, doc.canvas.height);
        
        // grid
        this.drawGrayGrid();


        // balls - малює не всі частки
        for (const ball of space.balls()) {    
            if (ball.id % this.viz == 0) {
                this.drawBall(ball);
            }
        }

        // lines
        for (const line of space.lines()) { 
            this.drawLine(line);
        }

        // devices
        for (const dev of space.devices()) {
            this.drawDevice(dev);  
        }
        
    }

    drawLine(line: Line) {
        const ctx = this.ctx;
        // the line is a plunger 
        let plun = line as Plunger;                 
        if (plun instanceof Plunger) 
        {
            this.drawPlungerPayload(plun);

            // top & bottom marks
            ctx.strokeStyle = plun.c; 
            ctx.strokeRect(plun.x1, plun.top, 5, 0.1)
            ctx.strokeRect(plun.x2 - 5, plun.top, 5, 0.1)
            ctx.strokeRect(plun.x1, plun.bottom, 5, 0.1)
            ctx.strokeRect(plun.x2 - 5, plun.bottom, 5, 0.1) 
            if (plun.fixed) {
                ctx.strokeRect(plun.x1 - 3, plun.y1 - 3, 6, 6);
                ctx.strokeRect(plun.x2 - 3, plun.y1 - 3, 6, 6);
            }           
        }

        // line & plunger
        ctx.lineCap = "round";
        ctx.strokeStyle = line.c; 
        ctx.lineWidth = 2; //line == this.space.selectedLine ? 3 : 2;


        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        // the line is plunger
        if (line == this.space.selectedLine) {
            ctx.moveTo(line.x1, line.y1 - 6);
            ctx.lineTo(line.x2, line.y2 - 6);
            ctx.moveTo(line.x1, line.y1 - 3);
            ctx.lineTo(line.x2, line.y2 - 3);
        }

        ctx.stroke();
    }

    drawPlungerPayload(plun: Plunger) {
        let {x, y, w, h} = plun.payloadRect();
            
        const ctx = this.ctx;
        // body of kettlebell
        ctx.fillStyle = "#00000022";

        ctx.beginPath();
        ctx.fillRect(x, y, w, h);
        ctx.ellipse(x + w/2, y, w/2, h/4, 0, 0, 3.1416, true);
        ctx.fill();

        // the hole under handle
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "#000000FF";
        ctx.beginPath();
        ctx.ellipse(x + w/2, y, w/4, h/8, 0, 0, 2*3.1416);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "black";
        ctx.fillText(plun.m.toFixed(0), x + w/2 - 10, y + h - 16);    
    }

    drawBall(ball: Ball) {
        const x = ball.x, y = ball.y;
        const ctx = this.ctx;
        ctx.fillStyle = ball.c;

        if (ball.r <= 5) {
            ctx.fillRect(x - 1, y - 2, 2, 4);
            ctx.fillRect(x - 2, y - 1, 4, 2);
            return;
        }
        ctx.beginPath();
        ctx.strokeStyle = ball.c;
        ctx.arc(x, y, ball.r, 0, Math.PI * 2);
        if (ball.r > 5) {
            ctx.lineWidth = ball == this.space.selectedBall ? 2 : 1;
            ctx.moveTo(x, y);
            ctx.lineTo(x + ball.vx, y + ball.vy);
        }
        ctx.stroke();
    } 

    drawDevice(device: Device) 
    {
        const ctx = this.ctx;
        // device color
        if (device instanceof Measurer || device instanceof Heater && device.rate == 1 ) {
            ctx.strokeStyle = 'gray';
            ctx.fillStyle = '#00000011';
        } else {
            if ((device as Heater).rate > 1) {
                ctx.strokeStyle = 'orange';
                ctx.fillStyle = '#ff880016'
            } else {
                ctx.strokeStyle = 'blue';
                ctx.fillStyle = '#0000ff16';
            }   
        }  
        // device rectangle
        // ctx.lineWidth = device == this.space.selectedDevice ? 2 : 1;
        ctx.fillRect(device.x1, device.y1, 
            device.x2 - device.x1, device.y2 - device.y1);
        // ctx.strokeRect(device.x1, device.y1, 
        //     device.x2 - device.x1, device.y2 - device.y1);        
        // device text
        if (device instanceof Heater) {
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fillText(`${device.avatar}:  R=${device.rate.toFixed(4)}`, device.x1, device.y1 - 5);   
            ctx.fillText(`E=${device.erg.toFixed(0)}`, device.x1 + 80, device.y1 - 5);                          
        }  else if (device instanceof Measurer) {
            ctx.fillStyle = (device as Measurer).c;
            ctx.fillText((device as Measurer).c , device.x1, device.y1 - 5);   
        }    
    }

//#endregion Canvas1    
 
//#region Canvas2

    drawMeasure() {
        this.ctx2.clearRect(0, 0, doc.canvas2.width, doc.canvas2.height);
        // the 1-st plunger if exists
        let plunger = this.space.plungers[0];
        if (plunger) {
            this.drawPlungerMeters(plunger)
        }   
    }

    drawDeviceMeters(device: Measurer) 
    {
        if (device.meterings.length == 0) 
            return;
        const HISTORY_DEEP = 24;
        let meterings = device.meterings.slice(-HISTORY_DEEP-1, device.meterings.length);
        
        // low left corner and height of the display area
        let X = doc.canvas2.width - 55;
        let Y = device.y2 + device.shift;
        let H = 100; 

        let Kx = 10;
        
        const ctx = this.ctx2;

        // background
        ctx.fillStyle = '#00000011';
        let x0 = X - HISTORY_DEEP * Kx, 
            y0 = Y - H, 
            w = HISTORY_DEEP * Kx;

        ctx.fillRect(x0, y0, w, H)

        // draw histogram ----------------------
        
        let histogram = device.histogram;
        ctx.strokeStyle = 'lightgray';
        ctx.beginPath();
        for(let i = 0; i < histogram.length; i++) {
            ctx.moveTo(x0 + i*3, Y);
            ctx.lineTo(x0 + i*3, Y - histogram[i]);
        }
        ctx.stroke();

        // draw P & T graphs ------------------------

        const TOP_LIMIT = 100, LOW_LIMIT = 25;
        const forScale = meterings.slice(-5);
        
        // scale T
        let Kt = 1;
        let maxT = Math.max(...forScale.map(m => m.t));
        while (maxT * Kt > TOP_LIMIT) Kt /= 2;
        while (maxT * Kt > 0 && maxT * Kt < LOW_LIMIT) Kt *= 2;

        // scale P
        let Kp = 1;
        let maxP = Math.max(...forScale.map(m => m.p));
        while (maxP * Kp > TOP_LIMIT) Kp /= 2;
        while (maxP * Kp > 0 && maxP * Kp < LOW_LIMIT) Kp *= 2;
        
        // function for drawing one graph
        const drawMeters = (prop: string, Ky: number, values: number[]) => {
            if (!values || values.length == 0)
                return;

            ctx.fillStyle = ctx.strokeStyle = prop == 't' ? 'blue' : 'brown';    
            ctx.lineWidth = device == this.space.selectedDevice ? 2 : 1;
            ctx.beginPath();
            let x = X + (1 - values.length) * Kx;
            let y = Y - Ky * values[0];  
            ctx.moveTo(x, y);
            for (let i = 1; i < values.length; i++) 
            {
                x = X + (i - values.length + 1) * Kx;
                y = Y - Ky * values[i];
                ctx.lineTo(x, y);
            }
            ctx.closePath;
            ctx.stroke();
        }

        drawMeters('t', Kt, meterings.map(m => m.t));
        drawMeters('p', Kp, meterings.map(m => m.p));
         
       
        // ------------  text values of averige T & P  ----------------
        const avg = device.avg();
        if (!avg.n) {
            return;
        }
        const GAP_Y = 15, GAP_X = 5;
        
        let yT = Y - Kt * avg.t;
        let yP = Y - Kp * avg.p;        
        if (Math.abs(avg.t * Kt - avg.p * Kp) < GAP_Y) {
            if (avg.t * Kt >= avg.p * Kp) {
                yP = yT + GAP_Y; 
            } else {
                yT = yP + GAP_Y; 
            }
        }

        ctx.fillStyle = 'blue';
        if (avg.t) 
            ctx.fillText(`T=${avg.t.toFixed(2)}`, X + GAP_X, yT);
        ctx.fillStyle = 'brown';
        if (avg.p) 
            ctx.fillText(`P=${avg.p.toFixed(3)}`, X + GAP_X, yP);   
        ctx.fillStyle = 'black';  
        let ballNumber = avg.n.toFixed(0);
        ctx.fillText(`n=${ballNumber} , mfp=${avg.mfp.toFixed(0)}`, x0 + 5, y0 + 10);

    }


    drawPlungerMeters(plun: Plunger) {

        if (plun.meterings.length < 2) {
            return;
        }

        const ctx = this.ctx2;
        ctx.font = "normal 12px Arial";
        const [X, Y, W, H] = xywh(plun);

        // scales        
        [plun.scales.p, plun.scales.t, plun.scales.s, plun.scales.v, plun.scales.x].forEach((v, i) => {
            ctx.fillStyle = ['red', 'black', 'green', 'gray', 'gray'][i];
            let x = X + W - 60;
            let y = Y + 13 * (i + 1);
            ctx.fillText(`${'PTSVX'[i]} = ${v.toFixed(1)}`, x, y);
        })
        
        let meterings = plun.meterings.slice(1);
        let first = meterings[0];
        let last = meterings[meterings.length - 1];             

        // PTSVX diagrams 
        ctx.lineWidth = plun.scales.w;
        if (plun.scales.p > 0) diagram(3, 0, 'red');    // VP
        if (plun.scales.t > 0) diagram(3, 1, 'black');  // VT
        if (plun.scales.s > 0) diagram(4, 2, 'green');  // XS
           
        // captions
        ctx.fillStyle = 'black';
        ctx.fillText(`Q+: ${this.space.givenHeat.toFixed(1)}  Q-: ${this.space.takenHeat.toFixed(1)}  ` +
                     `A: ${plun.u.toFixed(1)}  Los: ${plun.loss.toFixed(1)}`, X, 14);
        ctx.fillText(`V: ${last.v.toFixed(0)}  P: ${last.p.toFixed(1)}  T: ${last.t.toFixed(1)}  S: ${last.s.toFixed(1)}`, 
                      X, 28);                    

        //------------inner functions -----------------
        function getScaled(metering: PlungerMetering) {
            let p = Y + H - (metering.p / 10 * H) * plun.scales.p;
            let t = Y + H - (metering.t / 3000 * H) * plun.scales.t;
            let s = Y + H/2 - (metering.s / 300 * H) * plun.scales.s;
            let v = X + (metering.v / H) * plun.scales.v;
            let x = X + (metering.t / 300 * W) * plun.scales.x;
            
            return [p, t, s, v, x];    
        }


        function diagram(xIdx: number, yIdx: number, color: string) {
            ctx.strokeStyle = color;
            ctx.beginPath();
            let ptsvx = getScaled(first);
            ctx.moveTo(ptsvx[xIdx], ptsvx[yIdx]);
            for(let m of meterings) {
                ptsvx = getScaled(m);
                ctx.lineTo(ptsvx[xIdx], ptsvx[yIdx]);
            }
            ptsvx = getScaled(last);
            // draw marker
            let x = ptsvx[xIdx], y = ptsvx[yIdx];
            ctx.strokeRect(x - 2, y - 2, 5, 5);

            ctx.stroke();
        }    
    }

    showVauesUnderMouse(plun: Plunger, x: number, y: number) {
        const [p, t, s, v] = ptsvUnderMouse(plun, x, y);
        const [X, _] = xywh(plun);
        const line = `V: ${v.toFixed(0)}  P: ${p.toFixed(1)}  T: ${t.toFixed(1)}  S: ${s.toFixed(1)}`;
        const width = this.ctx2.measureText(line).width + 20;
        this.ctx2.clearRect(X, 28, width, 14);
        this.ctx2.fillText(line, X, 42);    
    }

    //#endregion Canvas2

    //#region Gray Zone

    drawGrayRect(x1: number, y1: number, x2: number, y2: number,) {
        const ctx = this.ctx;
        ctx.lineWidth = 1;
        ctx.strokeStyle = ctx.fillStyle = 'gray'; 
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        //
        let w = (x2 - x1).toFixed(2);
        let h = (y2 - y1).toFixed(2);
        let text = x2 - x1 < glo.quant && y2 - y1 < glo.quant ? '██' :  `${w} x ${h}`;
        ctx.fillText(text, x2, y2);
    }

    drawGrayLine(x1: number, y1: number, x2: number, y2: number,) {
        const ctx = this.ctx;
        ctx.strokeStyle = 'gray'; 
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    drawGrayGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'gray'; 
        ctx.lineWidth = 0.1;
        let step = this.space.cell;

        ctx.beginPath();
        // Горизонтальні лінії
        for (let y = step; y < this.space.height; y += step) {
            ctx.moveTo(0, y);
            ctx.lineTo(this.space.width, y);
        }
        // Вертикальні лінії
        for (let x = step; x < this.space.width; x += step) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.space.height);
        } 
        ctx.stroke();   
    }

//#endregion Gray Zone

//#region DOM

    showTimeAndInfo(time: number) {
        const el = <HTMLSpanElement>document.getElementById("info");
        let strikes = this.space.N ? (glo.strikes * 100 / this.space.N).toFixed(1) : "0";
        el.innerHTML = `T=${time} &nbsp;&nbsp; N=${this.space.N}, &nbsp;&nbsp; strikes=${strikes}%`;
    } 

//#endregion DOM

}

//#region auxilary funcs

function ptsvUnderMouse(plun: Plunger, x: number, y: number ) 
{
    const [X, Y, W, H] = xywh(plun);

    let v = (x - X) / plun.scales.v * H;
    let p = (Y + H - y) / plun.scales.p / H * 10
    let t = (Y + H - y) / plun.scales.t / H * 3000
    let s = (Y + H/2 - y) / plun.scales.s / H * 300
    let x_ = (x - X) / plun.scales.x * 300 * W;

    return [p, t, s, v];
}

function xywh(plun:Plunger) {
    let x = plun.x2 + 40;
    let y = plun.top;
    let w = doc.canvas2.width - plun.x2 - 40;
    let h = plun.realBottom - plun.top; 
    return [x, y, w, h];
}

//#endregion auxilary funcs