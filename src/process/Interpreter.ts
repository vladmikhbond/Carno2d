import Process, { ProcessState } from './Process.js';
import Controller from '../controller/Controller.js';

import Bomb from '../model/Bomb.js';
import {glo} from '../globals/globals.js';
import { Plunger } from '../model/Plunger.js';
import Space from '../model/Space.js';
import View from '../view/View.js';
import {str2obj} from "../globals/utils.js"

// local constants
const processArea = <HTMLTextAreaElement>document.getElementById("processArea");
export const MARK_DONE = '▌';
export const MARK_DOING = '►';

// Інтерпретатор команд

export class Interpreter 
{
    space: Space;
    view: View;
    controller: Controller;
    process: Process | null = null;

    constructor(space: Space, view: View, controller: Controller) {

        this.space = space;
        this.view = view;
        this.controller = controller;
    }

    static parse(line: string) {
        let pos = line.indexOf(' ');
        let command = line.slice(0, pos).trim();
        let rest = line.slice(pos + 1).trim()
        let params = str2obj(rest);
        return [command, rest, params]
    }

    async interpret(script: string) {
        // if (this.process) {
        //     this.process.procState = ProcessState.Pause;
        // }
        
        let lines = script.split('\n').map(l => l.trim());
        lines = lines.filter(s => s != "" && s[0] != MARK_DONE);
        if (lines.length == 0 || lines[0][0] == MARK_DOING) 
            return;

        for (let line of lines) {
            if (!line || line.startsWith("//"))
                continue;
             
            // елементи чергової команди
            let [command, restLine, params] = Interpreter.parse(line);
            this.hilightBefore(line);
            switch (command) 
            {
                case 'title':
                    document.getElementById("title")!.innerHTML = restLine;
                    break;
                case 'plunger':
                    this.createPlunger(params);
                    this.newProcess();
                    if (this.process?.space.N) {
                        await this.process?.calm(500);
                    }
                    break;
                case 'scale':
                    const plunger = this.space.plunger;
                    if (plunger) {
                        Object.assign(plunger.scales, params);
                    }
                    break;
                case 'adiabatic+':
                    await this.process?.adiabaticExtention(params.m);
                    break;
                case 'adiabatic-':
                    await this.process?.adiabaticCompression(params.m);
                    break;

                case 'isobaric+':
                    await this.process?.isobaricExtention(params.v);
                    break;
                case 'isobaric-':
                    await this.process?.isobaricCompression(params.v);
                    break;

                case 'isothermic+':
                    await this.process?.isothermicExtention(params.m);
                    break;
                case 'isothermic-':
                    await this.process?.isothermicCompression(params.m);
                    break;  

                case 'isohoric+':
                    await this.process?.isohoricExtention(params.m);
                    break;
                case 'isohoric-':
                    await this.process?.isohoricCompression(params.m);
                    break;

                //#region Цикл Отто (бензиновий)

                case 'intake':
                    await this.process?.intake(10000, params.v);  // n = 10 000
                    break;
                case 'compression':
                    await this.process?.compression(params.m, params.v);
                    break;
                case 'ignition':
                    await this.process?.ignition(params.rate, params.t);
                    break;
                case 'expansion':
                    await this.process?.expansion(params.m, params.v);
                    break;
                case 'exhaust':
                    await this.process?.exhaust(params.m, params.v);
                    break;
                //#endregion

                default:
                    alert(`Wrong command: ${command}`);
                    break;
            }
            // маркування виконаних команд
            this.hilightAfter();
        }
    }

    newProcess(): void {
        if (this.process) {
            this.process.procState = ProcessState.Abort;
        }
        this.process = new Process(this.controller);
    }

    // params = {t: temperature, m: massa, n: number of balls }
    //
    async createPlunger(params: any) {
        this.space.clear();

        // default values
        let x1 = 40, y1 = 20, x2 = 240, y2 = 480, m = 100, n = 10000, t = 100,
            gas_m = 0.4, gas_r = 0.5, gas_c = 'red';

        t = params.t ?? t;
        n = params.n ?? n;
        m = params.m ?? m;

        const y = n * glo.BOLTZ * t / (m * glo.g);
        // add plunger
        let plun = this.space.addPlunger(x1, y1, x2, y2, "blue");
        plun.m = m;
        plun.move(0, -y + Plunger.GAP);
        // add gass
        if (n) {
            this.space.addBomb(new Bomb(n, x1, plun.realBottom - y, x2, plun.realBottom, 0, 0, t, gas_r, gas_m, gas_c)); 
        } else {
            plun.move(0, -Plunger.GAP);
        }
    }



    hilightBefore(line: string ) 
    {   
        let start = processArea.value.indexOf(line);
        processArea.value = processArea.value.slice(0, start) + MARK_DOING +  processArea.value.slice(start);
    }

    hilightAfter() 
    {   
        processArea.value = processArea.value.replace(MARK_DOING, MARK_DONE);
    }
    removeHilights() 
    {       
        processArea.value = processArea.value.replaceAll(MARK_DOING, '').replaceAll(MARK_DONE, '');
    }


}
 
