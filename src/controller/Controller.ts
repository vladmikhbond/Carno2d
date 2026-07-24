import {glo, doc} from '../globals/globals.js';
import Space from '../model/Space.js';
import View from '../view/View.js';

import { getSizeParams} from './params.js';
import Repo from '../data/Repo.js';
import { Interpreter} from '../process/Interpreter.js';
import { ProcessState } from '../process/Process.js';

const clearButton = <HTMLButtonElement>document.getElementById('clearButton');
const execButton = <HTMLButtonElement>document.getElementById('execButton');
const runButton = <HTMLButtonElement>document.getElementById('runButton');
const processArea = <HTMLTextAreaElement>document.getElementById('processArea');

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


        clearButton.addEventListener('click', async (e) => {
            this.space.clear();
            this.interpreter.removeHilights();
            this.interpreter.newProcess();
            this.interpreter.process!.procState = ProcessState.Pause; 
            this.time = 0;
            this.view.showTimeAndInfo(0);      
        }); 

        execButton.addEventListener('click', async (e) => {
            doc.canvas.focus();
            await this.interpreter.interpret(processArea.value);
        }); 

        runButton.addEventListener('click', () => {
            if (!this.interpreter.process) 
                return;
            this.interpreter.process.procState = 1 - this.interpreter.process.procState;
        });

        processArea.addEventListener("input", (event) => {
            const lines = [
'title',
'plunger m=100, t=100, n=1000',
'scale   p=1, t=1, s=1, v=1, x=1',
'intake      v=',
'compression m=,    v=',
'ignition    rate=, t=',
'expansion   m=,    v=',
'exhaust     m=,    v=', 
'isobaric   v=',
'adiabatic  m=',
'isothermic m=',
'isohoric   m=',
];
            if (event.data?.length != 1)
                return;          
            const { value, selectionStart } = processArea;
            const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
            const prefix = value.slice(lineStart, selectionStart);
            const filtered = lines.filter(line => line.startsWith(prefix));
            if (filtered.length == 1) {
                processArea.value = processArea.value.slice(0, lineStart) + filtered[0] + processArea.value.slice(selectionStart)
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
            let value: number = +(e.target as HTMLSelectElement).value;
            this.view.viz = 100 / proc[value];
            this.view.draw();
            document.getElementById("visPercentage")!.innerHTML = proc[value]! + '%';
        });

        // Change model time speed
        document.getElementById("speedRange")!.addEventListener("change", (e: Event) =>
        {   
            let value: number = +(e.target as HTMLSelectElement).value;
            glo.msec = [40, 20, 1][value];
        });


        // Real or Ideal diagram view
        document.getElementById("prettyBox")!.addEventListener("change", (e: Event) =>
        {   
            glo.pretty = (e.target as HTMLInputElement)!.checked;
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
                case '1': 
                    this.interpreter.process!.procState = ProcessState.Run;
                    setTimeout(() => {
                        this.interpreter.process!.procState = ProcessState.Pause;
                        this.view.draw();
                        this.view.showTimeAndInfo(this.time);                 
                    }, 10); 
                    break;                    
                case '0':
                    // очистити журнал вимірювань
                    if (this.space.plunger) {
                        this.space.plunger.clearMeterings();
                        this.view.drawMeasure();
                    }
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

        doc.canvas.addEventListener("mousemove", (e: MouseEvent) => {
            if (this.space.plunger) {
                this.view.showVauesUnderMouse(this.space.plunger, e.offsetX, e.offsetY);
            }
        });

    } 


    addDataHandlers() 
    {
        const processArea = <HTMLTextAreaElement>document.getElementById('processArea');
        const bottomArea = <HTMLTextAreaElement>document.getElementById("savedSceneText"); 

        const keys = Object.keys(localStorage);
        bottomArea.value = keys.join(' | ');

        document.getElementById("saveSceneButton")!.addEventListener("click", () => {
            const key = bottomArea.value.trim();
            const val = processArea.value;
            localStorage.setItem(key, val);
        });

        document.getElementById("loadSceneButton")!.addEventListener("click", () => {
            const key = bottomArea.value.trim();
            const val = localStorage.getItem(key);
            processArea.value = val ? val : "no script";
        });
    }
 
     
    step() {   
        this.time++;
        this.space.step();
        this.view.draw();
        // виміри через кожні glo.metr кроків
        if (this.time % glo.metr == 0) {
            this.view.showTimeAndInfo(this.time);
            this.space.measure();
            this.view.drawMeasure();
        }
        this.view.draw();
    }

}

