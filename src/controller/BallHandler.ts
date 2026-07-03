import { dist, } from '../model/Geometry.js'
import Bomb from '../model/Bomb.js'
import Controller from './Controller.js';
import Handler from './Handlers.js';
import { getGasParams } from './params.js';

const CLICK_DIST = 3;

export default class BallHandler extends Handler {

    // constructor(controller: Controller) {
    //    super(controller);
    // }
   
    mousedown(e: MouseEvent) {
        super.mousedown(e);
        // якщо курсор в середені обраної кулі - таскати її
        let sel = this.space.selectedBall;
        if (sel && sel.isInside(e.offsetX, e.offsetY)) {
            this.draggingObject = sel;
        }          
    }

    mousemove(e: MouseEvent) {
        super.mousemove(e);
        if (!this.isDrawing) 
            return;

        this.view.draw();
        this.view.drawGrayRect(this.currentX, this.currentY, e.offsetX, e.offsetY);
        
    }

    mouseup(e: MouseEvent) {
        if (!this.isDrawing) 
            return;
        this.isDrawing = false;
        
        if (this.draggingObject) {
            this.draggingObject = null;
            return;
        }   

        let x1 = this.currentX, y1 = this.currentY;
        let x2 = e.offsetX, y2 = e.offsetY;
        let drawDist = dist({ x: x1, y: y1 }, { x: x2, y: y2 });

        // just mouse click
        if (drawDist <= CLICK_DIST) {
            this.selectObject(x1, y1);
        } else {
            let ps = getGasParams();
            if (ps) {
                const [n, r, t, m, c] = ps;
                this.space.addBomb(new Bomb(n, x1, y1, x2, y2, 0, 0, t, r, m, c));
            }
        }
        this.view.draw();  
    }

    keydown(e: KeyboardEvent) 
    {
        super.keydown(e);
        
        switch (e.key) {
            case 'Delete':
                if (this.space.selectedBall) {
                    this.space.removeSelectedBall();
                } else {
                    this.space.clearBalls()
                }
                this.view.draw();
                break;
            case 'ArrowUp':
                if (this.space.selectedBall) {
                    this.space.selectedBall.y -= 1;
                    this.view.draw();
                }
                break;
            case 'ArrowDown':
                if (this.space.selectedBall) {
                    this.space.selectedBall.y += 1;
                    this.view.draw();
                }
                break;
            case 'ArrowLeft':
                if (this.space.selectedBall) {
                    this.space.selectedBall.x -= 1;
                    this.view.draw();
                }
                break;
            case 'ArrowRight':
                if (this.space.selectedBall) {
                    this.space.selectedBall.x += 1;
                    this.view.draw();
                }
                break;
        }
    }

}





