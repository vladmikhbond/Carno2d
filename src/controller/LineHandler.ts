
import { confirmAction} from '../globals/utils.js';
import Controller from './Controller.js';
import Line from '../model/Line.js';
import {Plunger} from '../model/Plunger.js';
import Handler from './Handlers.js';
import {glo} from '../globals/globals.js';
import { getWallParams } from './params.js';


export default class LineHandler extends Handler {

    // constructor(controller: Controller) {
    //    super(controller);
    // }
   
    mousedown(e: MouseEvent) {
        super.mousedown(e);
        // якщо курсор в середені обраної лінії - таскати її
        let sel = this.space.selectedLine;
        if (sel && sel.isInside(e.offsetX, e.offsetY)) {
            this.draggingObject = sel;
        }          
    }


    mouseup(e: MouseEvent) {
        if (!this.isDrawing) 
            return;
        this.isDrawing = false;

        if (this.draggingObject) {
            this.draggingObject.justify();
            this.view.draw();
            this.draggingObject = null;
            return;
        }   
        let x1 = this.currentX, y1 = this.currentY;
        let x2 = e.offsetX, y2 = e.offsetY;
        
        // just mouse click
        if (x2 - x1 < glo.quant && y2 - y1 < glo.quant) {
            this.selectObject(x1, y1);
        } else {
            const t = getWallParams();
            // якщо прямокутник занадто плаский, додавати лінію
            if (Math.abs(y1 - y2) < glo.quant) {
                this.space.addLine(new Line(x1, y1, x2, y1, "blue"));
            } else if (Math.abs(x1 - x2) < glo.quant) {
                this.space.addLine(new Line(x1, y1, x1, y2, "blue"));
            } else if (t == 'r') {
                this.space.addRect(x1, y1, x2, y2, "blue" );                
            } else if (t == 'p') {
                this.space.addPlunger(x1, y1, x2, y2, "blue");
            }          
        }
        this.view.draw();
    }

    keydown(e: KeyboardEvent) 
    {
        super.keydown(e);

        switch (e.key) {
            case 'Delete':
                if (this.space.selectedLine) {
                    this.space.removeSelectedLine();
                } else {
                    this.space.clearLines();
                }
                this.view.draw();
                break;
            case 'ArrowUp':
                if (this.space.selectedLine) {
                    this.space.selectedLine.move(0, -glo.quant);
                    this.view.draw();
                }
                break;
            case 'ArrowDown':
                if (this.space.selectedLine) {
                    this.space.selectedLine.move(0, glo.quant);
                    this.view.draw();
                }
                break;
            case 'ArrowLeft':
                if (this.space.selectedLine) {
                    this.space.selectedLine.move(-glo.quant, 0);
                    this.view.draw();
                }
                break;
            case 'ArrowRight':
                if (this.space.selectedLine) {
                    this.space.selectedLine.move(glo.quant, 0);
                    this.view.draw();
                }
                break;

            case '+': case '-':
                // збільшити-зменшити навантаження на поршень  
                var plun = this.space.plunger;   
                if (plun instanceof Plunger) {
                    let dm = e.key == '+' ? 10 : -10;
                    plun.m += dm;
                    if (plun.m < 0) plun.m = 0;
                    this.view.draw();
                    confirmAction('New weight: ' + plun.m);
                }
                break;
       }
    }

}
