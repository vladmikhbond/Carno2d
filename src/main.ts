import {doc, glo} from './globals/globals.js';
import Space from './model/Space.js';
import View from './view/View.js';
import Controller from './controller/Controller.js';
import { getSizeParams } from "./controller/params.js";
import { ProcessInterpreter, ProcessState } from './process/ProcessInterpreter.js';

// params from index.html         


const space = new Space(...getSizeParams()!);

const view = new View(space);
export const controller = new Controller(space, view);

view.draw();

// ===========================

const interpreter = new ProcessInterpreter(space, view, controller);

const startProcessButton = <HTMLButtonElement>document.getElementById('start-process-btn');
const pauseProcessButton = <HTMLButtonElement>document.getElementById('pause-process-btn');
const area = <HTMLTextAreaElement>document.getElementById('process-script');

startProcessButton.addEventListener('click', (e) => {    
    setTimeout(async () => {
        area.value = area.value.replaceAll('►', '');  
        pauseProcessButton.innerHTML = '►'; 
        await interpreter.interpret(area.value);
    }, 100);

} ) 

pauseProcessButton.addEventListener('click', () => {
    switch (interpreter.process!.procState) {
        case ProcessState.Pause:
            interpreter.process!.procState = ProcessState.Run;
            pauseProcessButton.innerHTML = '■';
            break;
        case ProcessState.Run: 
            interpreter.process!.procState = ProcessState.Pause;
            pauseProcessButton.innerHTML = '►';
            break;
    }
})

doc.canvas.addEventListener("keydown", (e: KeyboardEvent) => {
    switch (e.key) {
        case '2': 
            interpreter.process!.procState = ProcessState.Run;
            setTimeout(() => {
                interpreter.process!.procState = ProcessState.Pause;
                view.draw();
                view.showTimeAndInfo(controller.time);                 
            }, 10);    
            break;
    }

})





