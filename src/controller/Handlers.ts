import Space from '../model/Space.js';
import View from '../view/View.js';
import Controller from './Controller.js';
import Ball from '../model/Ball.js';
import Device from '../model/Device.js';
import Line from '../model/Line.js';
import { doc } from '../globals/globals.js';



export default class Handler {
    protected currentX = 0;
    protected currentY = 0;
    protected isDrawing = false;
    protected draggingObject: Device | Line | Ball | null = null;


    view: View;
    space: Space;
    controller: Controller
    
    constructor(controller: Controller) {
        this.controller = controller;
        this.space = controller.space;
        this.view = controller.view;
    }

    mousedown(e: MouseEvent) {
        this.currentX = e.offsetX;
        this.currentY = e.offsetY;
        this.isDrawing = true;
        doc.canvas.focus({focusVisible: true})
    }

    mousemove(e: MouseEvent) {
        (<HTMLElement>document.getElementById('info2')!).innerHTML = `${e.offsetX}, ${e.offsetY}`;

        if (!this.isDrawing) {
            return;
        }
        if (this.draggingObject && (this.draggingObject === this.space.selectedLine || this.draggingObject === this.space.selectedDevice)) {
            let dx = e.offsetX - this.currentX;
            let dy = e.offsetY - this.currentY;
            this.currentX = e.offsetX;
            this.currentY = e.offsetY;
            this.draggingObject.move(dx, dy);
            this.view.draw();
        } else {
            this.view.draw();
            this.view.drawGrayRect(this.currentX, this.currentY, e.offsetX, e.offsetY);
        }

    }

    mouseup(e: MouseEvent) { }

    keydown(e: KeyboardEvent) { 
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
            case '1': 
                this.controller.stop();            
                this.controller.step();
                break;
            case 'f':
                // зафіксувати-розфіксувати поршень
                if (this.space.plunger) {
                    this.space.plunger.fixed = !this.space.plunger.fixed;
                    this.view.draw();
                }
                break;
        }
    }


    selectObject(x: number, y: number) {

        this.space.selectLine(x, y);
        this.space.selectBall(x, y);
        this.space.selectDevice(x, y);
    }


}