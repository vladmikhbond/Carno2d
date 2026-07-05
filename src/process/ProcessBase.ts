import Space from '../model/Space.js';
import {Plunger} from '../model/Plunger.js';
import View from '../view/View.js';
import {ProcessState, ProcessInterpreter} from './ProcessInterpreter.js';
import Controller from '../controller/Controller.js';


export default class ProcessBase {

    space: Space;
    controller: Controller;
    plunger: Plunger; 
    view: View;
    procState = ProcessState.Pause;    // 0-pause,   1-run,   2-stop,

    constructor(controller: Controller) 
    {    
        this.controller = controller;
        this.space = controller.space
        this.view = this.controller.view;        
        this.plunger = this.space.plunger; 
        // draw
        this.view.draw();  
        this.view.drawMeasure(); 
    }

    async whileAsync(
        condition: () => boolean, 
        act = () => {} 
    ) {
        return new Promise((res, rej) => {
            let timer = setInterval(() => {
                try {
                    if (this.procState == ProcessState.Run) {
                        act();    
                        this.controller.step();

                        if (!condition()) {                            
                            clearInterval(timer);
                            res(this.controller.timer);
                        }                 
                    } else if (this.procState == ProcessState.Abort) {
                        throw Error('stop process');
                    }              
                } catch (err) {
                    clearInterval(timer);
                    rej(err);
                }
            }, 10);   // former globus.STEP_PERIOD
        });
    }

    
    async calm(balanceTime = 0) {
        let stopStep = this.controller.time + balanceTime;
        this.plunger.withFriction = true;
        await this.whileAsync(() => this.controller.time < stopStep, () => {
            this.controller.step();
            this.controller.step();
            this.controller.step();
            this.controller.step();          
        }); 
        this.plunger.withFriction = false;
        this.plunger.clearMeterings();
    }


    // async runAsync() {
    //     return new Promise((res, rej) => {
    //         let timer = setInterval(() => {
    //             try {
    //                 if (ProcessInterpreter.procState == ProcessState.Run) {
    //                     this.space.warming();
    //                     this.controller.step();                
    //                 } else if (ProcessInterpreter.procState == ProcessState.Stop) {
    //                     throw Error('stop process');
    //                 }              
    //             } catch (err) {
    //                 clearInterval(timer);
    //                 rej(err);
    //             }
    //         }, 10);     // 10 is former globus.STEP_PERIOD
    //     });
    // }

}
