import {glo} from '../globals/globals.js';    
import Space from '../model/Space.js';
import Line from '../model/Line.js';
import {Plunger} from '../model/Plunger.js';
import { Measurer} from '../model/Measurer.js';
import { Heater} from '../model/Heaters.js';
import Bomb from '../model/Bomb.js';

// types for serialization only
type _Plunger = {x1: number, y1: number, x2: number, y2: number, v: number, m: number, };
type _Line = {x1: number, y1: number, x2: number, y2: number, c: string};
type _Device = {x1: number, y1: number, x2: number, y2: number, type: string, rate: number, color: string};


export default class Repo 
{
    space: Space;

    constructor(space: Space) {
        this.space = space;
    }
     
    // Space & globals to json
    //
    private serialize(): string 
    {    
        // bombs
        let bombs = this.space.bombs;
            
        // lines & plungers
        let lines: _Line[] = [];
        let plungers: _Plunger[] = [];
        for (let l of this.space.lines()) {
            if (l instanceof Plunger) {
                plungers.push({x1: l.x1, y1: l.realTop, x2: l.x2, y2: l.realBottom, v: l.volume, m: l.m, })
            } else {
                lines.push({x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, c: l.c});
            }
        }

        // devices
        let devices: _Device[] = [];
        for (let d of this.space.devices()) {
            let type = d instanceof Heater ? 'h' : 'm';
            let device: _Device = {x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2, type, rate:0, color:''};
            devices.push(device);
            if (d instanceof Heater) {
                device.rate = d.rate; 
            }                
        }
        
        // globus
        let globals = {g: glo.g, gBall: glo.gBall, quant: glo.quant, metr: glo.metr};        
        let json = JSON.stringify({bombs, lines, plungers, devices, globals});

        return json;
    } 

    // Restore space & globals 
    //
    private deserialize(json: string) 
    {
        let {bombs, lines, plungers, devices, globals} = JSON.parse(json);
        const space = this.space;
        space.clear();

        // bombs & balls
        bombs.forEach((b: Bomb) => {            
            space.addBomb(b);
        });
 
        // lines & plungers       
        lines.forEach((l: _Line) => {
            let line = new Line(0, 0, 0, 0, '');
            Object.assign(line, l);
            space.addLine(line);
        });
        plungers.forEach((p: _Plunger) => {

            let y =  p.y2 - p.v / (p.x2 - p.x1) 
            let plun = new Plunger(p.x1, p.y1, p.x2, p.y2, y);                
            plun.m = p.m;
            space.addLine(plun);
        });

        // devices
        devices.forEach((d: _Device) => {
            switch (d.type) {
                case 'm': 
                    space.addDevice(new Measurer(d.x1, d.y1, d.x2, d.y2, d.color));
                    break;
                case 'h': 
                    space.addDevice(new Heater(d.x1, d.y1, d.x2, d.y2, d.rate, "red"));
                    break;
            } 
        });

        // glo
        Object.assign(glo, globals);
        // page.optionsGloElement.value = Options.obj2str(globals);
    } 

    load(json: string) 
    {
        this.deserialize(json);
        const obj = {g: glo.g, gBall: glo.gBall, quant: glo.quant, metr: glo.metr};
        // page.optionsGloElement.value = Options.obj2str(obj);
    }

    save(): string {
        return this.serialize();
    }

    
}
