import Process from './Process.js';
import Controller from '../controller/Controller.js';

import Bomb from '../model/Bomb.js';
import {glo} from '../globals/globals.js';
import { Plunger } from '../model/Plunger.js';
import Repo from '../data/Repo.js';
import Space from '../model/Space.js';
import View from '../view/View.js';




// Перетворює рядок "x1 = 200, y1 = 0, x2 = 200, y2 = 450, c = blue, "
// на об'єкт {x1: 200, y1: 0, x2: 200, y2: 450, c: "blue", }
function str2obj(str: string)
{
    const reg = /([^=]+)=([^=]+)[,;]/g;
    str = str.trim();
    if (!str.endsWith(',')) 
        str += ',';

    const matches = str.matchAll(reg);
    const o: any = {}; 
    for(let match of matches) {
        const str = match[2].trim();
        o[match[1].trim()] = isNaN(+str) ? str : +str;
    }
    return o;
}



// obj -> "x1 = 200, y1 = 0, x2 = 200, y2 = 450, c = blue, "
function obj2str(obj: object): string 
{
    const ignore = ['space', 'impulse', 'a', 'vx', 'vy', 'v'];
    let str = '';
    const entries = Object.entries(obj);
    for (const [key, value] of entries) {
        if (ignore.includes(key))
            continue;   
        str += `${key} = ${value}, `;
    }
    return str;
}


export enum ProcessState {
    Pause = 0,
    Run = 1,
    Abort = 2,
}

export class ProcessInterpreter 
{

    space: Space
    view: View
    controller: Controller
    process: Process | null = null;



    constructor(space: Space, view: View, controller: Controller) {

        this.space = space;
        this.view = view;
        this.controller = controller
    }

    static parse(line: string) {
        let pos = line.indexOf(':');
        let command = line.slice(0, pos).trim();
        let rest = line.slice(pos + 1).trim()
        let params = str2obj(rest);
        return [command, rest, params]
    }

    async interpret(script: string) {

        const lines = script.split('\n').map(l => l.trim());
        for (let line of lines) {
            if (!line)
                continue;
            this.view.hilightCommand(line); 
            // елементи чергової команди
            let [command, restLine, params] = ProcessInterpreter.parse(line);

            switch (command) {
                case 'load':
                    this.load(restLine.trim());
                    break;
                case 'run':
                    await this.run(params);
                    break;

                case 'title':
                    /// page.pageTitle.innerHTML = restLine;
                    break;
                case 'plunger':
                    this.createDefaultPlunger(params);
                    this.createProcess();
                    await this.process!.calm(1000);
                    break;
                case 'scale':
                    const plunger = this.space.plunger;
                    if (plunger) {
                        Object.assign(plunger.scales, params);
                    }
                    break;
                case 'adiabatic':
                    if (params.dir.startsWith('inc')) {
                        await this.process!.adiabaticExtention(params.m);
                    } else if (params.dir.startsWith('dec')) {
                        await this.process!.adiabaticCompression(params.m);
                    }
                    break;
                case 'isobaric':
                    if (params.dir.startsWith('inc')) {
                        await this.process!.isobaricExtention(params.v);
                    } else if (params.dir.startsWith('dec')) {
                        await this.process!.isobaricCompression(params.v);
                    }
                    break;
                case 'isothermic':
                    if (params.dir.startsWith('inc')) {
                        await this.process!.isothermicExtention(params.m);
                    } else if (params.dir.startsWith('dec')) {
                        await this.process!.isothermicCompression(params.m);
                    }
                    break;
                case 'isohoric':
                    if (params.dir.startsWith('inc')) {
                        await this.process!.isohoricExtention(params.m);
                    } else if (params.dir.startsWith('dec')) {
                        await this.process!.isohoricCompression(params.m);
                    }
                    break;

                //#region Цикл Отто (бензиновий)

                case 'intake':
                    this.createProcess();
                    await this.process!.intake(10000, params.v);  // n = 10 000
                    break;
                case 'compression':
                    await this.process!.compression(params.m, params.v);
                    break;
                case 'ignition':
                    await this.process!.ignition(params.rate, params.t);
                    break;
                case 'expansion':
                    await this.process!.expansion(params.m, params.v);
                    break;
                case 'exhaust':
                    await this.process!.exhaust(params.m, params.v);
                    break;
                //#endregion

                default:
                    alert(`Wrong command: ${command}`);
                    break;
            }
        }
    }

    private createProcess() {
        this.process = new Process(this.controller);
    }

    private load(imgName: string) 
    {
        const area = <HTMLTextAreaElement>document.getElementById('repoArea');
        let str = area.value;
        let beg = str.indexOf(imgName + ':') + imgName.length + 1;
        str = str.slice(beg).trim();
        let end = str.indexOf('\n');
        let imgStr = str.slice(1, end-2).trim();
        new Repo(this.space).load(imgStr); 
        
        this.view.draw();
    }


    private async run(params: any) 
    {
        params.t ??= 100500;
        try {      
            this.createProcess();
            let limit:number = this.controller.time + params.t;

            await this.process!.whileAsync(
                    () => this.controller.time < limit, 
                    () => {this.space.warming()});
        } catch(er) {  
            console.error(er);
        }        
    }


    private createDefaultPlunger(params: any) {
        this.space.clear();

        // default values
        let x1 = 40, y1 = 20, x2 = 240, y2 = 480, m = 100, gas_n = 10000, 
            gas_m = 0.4, gas_r = 0.5, gas_c = 'red', gas_t = 100;

        gas_t = params.T ?? gas_t;
        gas_n = params.n ?? gas_n;

        m = params.m ?? m;

        const y = gas_n * glo.BOLTZ * gas_t / (m * glo.g);
        // add plunger
        let plun = this.space.addPlunger(x1, y1, x2, y2, "blue");
        plun.m = m;
        plun.move(0, -y + Plunger.GAP);
        // add gass
        this.space.addBomb(
            new Bomb(gas_n, x1, plun.realBottom - y, x2, plun.realBottom, 0, 0, gas_t, gas_r, gas_m, gas_c));        
    }
    

}