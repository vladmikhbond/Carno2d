import {doc, glo} from './globals/globals.js';
import Space from './model/Space.js';
import View from './view/View.js';
import Controller from './controller/Controller.js';
import { getSizeParams, getSpaceParams } from "./controller/params.js";
import { ProcessInterpreter, ProcessState } from './process/ProcessInterpreter.js';

// params from index.html         
[glo.g, glo.gBall] = getSpaceParams()!;

const space = new Space(...getSizeParams()!);

const view = new View(space);
export const controller = new Controller(space, view);

view.draw();

// ===========================

const interpreter = new ProcessInterpreter(controller);

const startProcessButton = <HTMLButtonElement>document.getElementById('start-process-btn');
const pauseProcessButton = <HTMLButtonElement>document.getElementById('pause-process-btn');
const area = <HTMLTextAreaElement>document.getElementById('process-script');

startProcessButton.addEventListener('click',  async (e) => {
    ProcessInterpreter.procState = ProcessState.Stop;
    view.removeHilights();
    //
    setTimeout(async () => {

        let selLength = area.selectionEnd - area.selectionStart;
        let script = selLength ? area.value.slice(area.selectionStart, area.selectionEnd) : area.value; 
        script = script.replaceAll('►', '');               
        ProcessInterpreter.procState = ProcessState.Pause;
        pauseProcessButton.innerHTML = '►'; 

        await interpreter.interpret(script);
    }, 100);

} ) 

pauseProcessButton.addEventListener('click', () => {
    switch (ProcessInterpreter.procState) {
        case ProcessState.Pause:
            ProcessInterpreter.procState = ProcessState.Run;
            pauseProcessButton.innerHTML = '■';
            break;
        case ProcessState.Run: 
            ProcessInterpreter.procState = ProcessState.Pause;
            pauseProcessButton.innerHTML = '►';
            break;
    }
})

doc.canvas.addEventListener("keydown", (e: KeyboardEvent) => {
    switch (e.key) {
        case '2': 
            ProcessInterpreter.procState = ProcessState.Run;
            setTimeout(() => {
                ProcessInterpreter.procState = ProcessState.Pause;
                view.draw();
                view.showTimeAndInfo(controller.time);                 
            }, 10); 
       
            break;
    }

})





