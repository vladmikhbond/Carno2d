import Controller from './Controller.js';
import {Measurer} from '../model/Measurer.js'
import {Heater} from '../model/Heaters.js';
import {glo} from '../globals/globals.js';
import Handler from './Handlers.js';
import { getDevsParams } from './params.js';


export default class DeviceHandler extends Handler 
{
    // constructor(controller: Controller) {
    //     super(controller);
    // }
    
 
    mousedown(e: MouseEvent) {
        super.mousedown(e);
        // якщо курсор в середені обраного девайсу - таскати його
        let dev = this.space.selectedDevice;
        if (dev && dev.isInside(e.offsetX, e.offsetY)) {
            this.draggingObject = dev;
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

        
        if (x2 - x1 < glo.quant && y2 - y1 < glo.quant) 
        {
            // just mouse click
            this.selectObject(x1, y1);
        } 
        else 
        {
            // create device
            let [t, rate, color] = getDevsParams()!;
            
            
            if (t == 'm') {
                this.space.addDevice(new Measurer(x1, y1, x2, y2, color));
            } 
            else if (t == 'h')
            {
                this.space.addDevice(new Heater(x1, y1, x2, y2, rate, color));                    
            }
        }
        this.view.draw();    
    }

    keydown(e: KeyboardEvent) {

        super.keydown(e);

        switch (e.key) {
            case 'Delete':
                if (this.space.selectedDevice) {
                    this.space.removeSelectedDevice();
                } else {
                    this.space.clearDevices()
                }
                this.view.draw();
                break;
               
        }
    }

}
