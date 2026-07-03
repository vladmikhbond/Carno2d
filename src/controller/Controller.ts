import {glo, doc} from '../globals/globals.js';
import Space, { CreateMode } from '../model/Space.js';
import View from '../view/View.js';

import Handler from './Handlers.js';
import BallHandler from './BallHandler.js';
import LineHandler from './LineHandler.js';
import DeviceHandler from './DeviceHandler.js';
import { getSizeParams, getSpaceParams } from './params.js';
import Repo from '../data/Repo.js';


export default class Controller 
{
    space: Space;
    view: View;
    timer: number | 0 = 0;
    time = 0           // такти часу
    
    private ballHandler: BallHandler;
    private lineHandler: LineHandler;
    private deviceHandler: DeviceHandler;

    private _createMode = CreateMode.Gas;

    constructor(space: Space, view: View) 
    {
        this.space = space;
        this.view = view;
        this.ballHandler = new BallHandler(this);
        this.lineHandler = new LineHandler(this);
        this.deviceHandler = new DeviceHandler(this);
        this.time = 0;
        glo.strikes = 0;
        
        this.addHandlers();
        this.addDataHandlers();
        this.setModelSize();
        this.createMode = CreateMode.Gas;
    }

    
    set createMode(mode: CreateMode) 
    {
        let gas = document.getElementById("gasParams")!.style;
        let wal = document.getElementById("wallParams")!.style;
        let dev = document.getElementById("devsParams")!.style;
        gas.display = wal.display = dev.display = "none";

        this._createMode = mode;
        switch(mode) {
            case CreateMode.Info:
                break;
            case CreateMode.Gas:
                this.switchHandlers(this.ballHandler);
                gas.display = "inline";
                break;
            case CreateMode.Wall:
                this.switchHandlers(this.lineHandler);
                wal.display = "inline";
                break;
            case CreateMode.Devs:
                this.switchHandlers(this.deviceHandler);
                dev.display = "inline";
                break;
        }
                 
    }

    get createMode() {
        return this._createMode;
    }


    setModelSize() {
        let [w, h] = [this.space.width, this.space.height];
        document.documentElement.style.setProperty('--canvas-width', w+'px');
        document.documentElement.style.setProperty('--canvas-height', h+'px');            
        doc.canvas.height = h;
        doc.canvas.width = w;
        doc.canvas2.height = h;
        doc.canvas2.width = w;
    }

    private addHandlers() {

        // Size params changed 
        document.getElementById("sizeParams")!.addEventListener("keydown", (e: KeyboardEvent) => 
        {
            if (e.key == "Enter") {
                const size = getSizeParams();
                if (size) {
                    [this.space.width, this.space.height] = size;
                    this.setModelSize();
                }
            }                
        }); 

        // Space params changed
        document.getElementById("spaceParams")!.addEventListener("keydown", (e: KeyboardEvent) => 
        {
            if (e.key == "Enter") {
                const ps = getSpaceParams();
                if (ps) {
                    [glo.g, glo.gBall] = ps!;                
                }
            }      
        });

        // Change Create Mode
        document.getElementById("createMode")!.addEventListener("change", (e: Event) =>
        {
            let str = (e.target as HTMLSelectElement).value;
            const key = str as keyof typeof CreateMode;
            this.createMode = CreateMode[key];            
        }); 


        document.getElementById("helpButton")!.addEventListener("click", () => {
            window.open("help.html", "_blank")?.focus();
        });

        // Change visibility of gas particles
        document.getElementById("visRange")!.addEventListener("change", (e: Event) =>
        {   
            const proc = [ 1, 2, 5, 10, 25, 50, 100];
            let v: number = +(e.target as HTMLSelectElement).value;
            this.view.viz = 100 / proc[v];
            this.view.draw();
            document.getElementById("visPercentage")!.innerHTML = proc[v]! + '%';

        });

    } 

    addDataHandlers() 
    {
        const areaEl = <HTMLTextAreaElement>document.getElementById("savedSceneText"); 

        document.getElementById("saveSceneButton")!.addEventListener("click", () => {
            areaEl.value = new Repo(this.space).save();
        });

        document.getElementById("loadSceneButton")!.addEventListener("click", () => {
            new Repo(this.space).load(areaEl.value);
            this.stop();
            this.time = 0;
            this.view.draw();
        });
    }
 

    private switchHandlers(handler: Handler)  {
        doc.canvas.onmousedown = (e) => handler.mousedown(e);
        doc.canvas.onmousemove = (e) => handler.mousemove(e);
        doc.canvas.onmouseup = (e) => handler.mouseup(e);
        doc.canvas.onkeydown = (e) => handler.keydown(e);
    }

    step() {
        this.time++;
        this.space.step();
        // виміри через кожні glo.metr кроків
        if (this.time % glo.metr == 0) {
            this.view.showTimeAndInfo(this.time);
            this.space.measure();
            this.view.drawMeasure();
        }
        this.view.draw();
    }


    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = 0;
        }
        // draw
        this.view.showTimeAndInfo(this.time);
        this.space.measure();
        this.view.drawMeasure();
    }

    run() {
        if (this.timer) return;
        this.timer = setInterval(() => { 
            this.step();
        }, 1);
    }


}
