import {glo, doc} from '../globals/globals.js';
import Space from '../model/Space.js';
import View from '../view/View.js';

import { getSizeParams} from './params.js';
import Repo from '../data/Repo.js';
import { Interpreter} from '../process/Interpreter.js';
import { ProcessState } from '../process/Process.js';


export default class Controller 
{
    space: Space;
    view: View;
    
    timer: number | 0 = 0;
    time = 0           // такти часу
    interpreter: Interpreter

    constructor(space: Space, view: View) 
    {
        this.space = space;
        this.view = view;
        this.time = 0;
        glo.strikes = 0;
        this.interpreter = new Interpreter(space, view, this);
        
        this.addHandlers();
        this.addDataHandlers();
        this.addProcessHandlers();

        this.setModelSize();
    }

    addProcessHandlers() 
    {
        const startButton = <HTMLButtonElement>document.getElementById('startButton');
        const pauseButton = <HTMLButtonElement>document.getElementById('pauseButton');
        const processArea = <HTMLTextAreaElement>document.getElementById('processArea');

        startButton.addEventListener('click', async (e) => {
            this.stop();
            setTimeout(async () => {
                processArea.value = processArea.value.replaceAll('►', '');  
                await this.interpreter.interpret(processArea.value);
            }, 100);

        }); 

        pauseButton.addEventListener('click', () => {
            switch (this.interpreter.process!.procState) {
                case ProcessState.Pause:
                    this.interpreter.process!.procState = ProcessState.Run;
                    break;
                case ProcessState.Run: 
                    this.interpreter.process!.procState = ProcessState.Pause;
                    break;
            }
        });

        doc.canvas.addEventListener("keydown", (e: KeyboardEvent) => {
            switch (e.key) {
                case '2': 
                    this.interpreter.process!.procState = ProcessState.Run;
                    setTimeout(() => {
                        this.interpreter.process!.procState = ProcessState.Pause;
                        this.view.draw();
                        this.view.showTimeAndInfo(this.time);                 
                    }, 10);    
                    break;
            }

        });
       
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


        doc.canvas.addEventListener("keydown", (e: KeyboardEvent) => {
            switch (e.key) {
                case 'P': case 'p': case 'V': case 'v': case 'T': case 't': case 'S': case 's': case 'X': case 'x':
                    // маштабування тиску на PV і TV-діаграмі
                    if (this.space.plunger) {
                        this.space.plunger.scale(e.key);
                        this.view.drawMeasure();
                    }
                    break;
                case '0':
                    // очистити журнал вимірювань
                    if (this.space.plunger) {
                        this.space.plunger.clearMeterings();
                        this.view.drawMeasure();
                    }
                    break;
                // case '1': 
                //     this.stop();            
                //     this.step();
                //     break;
                case '1': 
                    this.interpreter.process!.procState = ProcessState.Run;
                    setTimeout(() => {
                        this.interpreter.process!.procState = ProcessState.Pause;
                        this.view.draw();
                        this.view.showTimeAndInfo(this.time);                 
                    }, 10); 
                    break;                    
                case 'f':
                    // зафіксувати-розфіксувати поршень
                    if (this.space.plunger) {
                        this.space.plunger.fixed = !this.space.plunger.fixed;
                        this.view.draw();
                    }
                    break;
            }
        });

        doc.canvas.addEventListener("mousedown", (e: MouseEvent) => {
            doc.canvas.focus({focusVisible: true})
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
