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
const MARK_DONE = '▌';
const MARK_DOING = '►';

// Інтерпретатор команд
//
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

    // Поділяє рядок на трйку [command, rest, params]
    //
    static parseLine(line: string): [string, string, any ] {
        line = line.trim();
        let pos = line.indexOf(' ');
        // if command has no params
        if (pos == -1) {
            return [line, "", {}];
        }
        let command = line.slice(0, pos);
        let rest = line.slice(pos + 1).trim();
        let params = str2obj(rest);
        return [command, rest, params]
    }

    // Перетворює текст на масив команд, які очікують виконання
    //
    static scriptToLines(script: string) {
        let lines = script.split('\n').map(l => l.trimEnd());
        lines = lines.filter(
            l => l != "" && 
            l[0] != MARK_DONE && 
            !l.startsWith(" ")
        );
        if (lines.length == 0 || lines[0][0] == MARK_DOING) 
            return[];
        return lines;
    }

    // Виконує ті команди скрипта, які не мають позначки MARK_DONE на початку рядка
    // Ключове слово команди - з початку рядка і до першого пробіла.
    // Пробіл на початку рядка перетворює рядок в коментар.
    //
    async interpret(script: string) 
    {    
        const lines = Interpreter.scriptToLines(script);
        for (let line of lines) 
        {          
            // елементи чергової команди
            let [command, restLine, params] = Interpreter.parseLine(line);
            hilightBefore(line);

            switch (command) 
            {
                case 'title':
                    document.getElementById("title")!.innerHTML = restLine;
                    break;
                case 'plunger':
                    this.createPlunger(params);
                    this.newProcess();
                    break;
                case 'scale':
                    Object.assign(this.space.plunger.scales, params);
                    this.space.plunger.clearMeterings();
                    this.view.draw2();
                    break;
                case 'run':
                    await this.process?.run(params.time);
                    break;
                case 'report':
                    this.report(restLine);
                    break;                
                case 'adiabatic':
                    await this.process?.adiabatic(params.m, params.time);
                    break;
                case 'isobaric':
                    await this.process?.isobaric(params.v, params.time);
                    break;
                case 'isohoric':
                    await this.process?.isohoric(params.m, params.time);
                    break;
                case 'isothermic':
                    await this.process?.isothermic(params.m, params.time);
                    break;
                
                //#region Цикл Отто (бензиновий)

                case 'intake':
                    await this.process?.intake(params.v, params.nk);
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
                    await this.process?.exhaust(params.m);
                    break;
                //#endregion

                default:
                    alert(`Wrong command: ${line}`);
                    break;
            }
            // маркування виконаних команд
            hilightAfter();
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
    createPlunger(params: any) {
        this.space.clear();

        // default values
        let x1 = 40, y1 = 20, x2 = 240, y2 = 480, m = 100, n = 10000, t = 100,
            gas_m = Plunger.BALL_M, gas_r = 0.5, gas_c = 'red';

        t = params.t ?? t;
        n = params.n ?? n;
        m = params.m ?? m;

        const y = n * glo.BOLTZ * t / (m * glo.g);
        // add plunger
        let plun = this.space.addEmptyPlunger(x1, y1, x2, y2, "green");
        plun.m = m;
        plun.move(0, -y + Plunger.GAP);
        // add gass
        if (n) {
            this.space.clearBalls();
            this.space.addBomb(new Bomb(n, x1, plun.realBottom - y, x2, plun.realBottom, 0, 0, t, gas_r, gas_m, gas_c));
        } else {
            plun.move(0, -Plunger.GAP);
        }
    }

    report(param = "") {
        const HALF_ISOTERM = 1000;
        const HALF_ISOBAR = 1000; 
        const ms = this.space.plunger.meterings;
        // ккд через роботу
        const met = ms[ms.length - 1]
        const Q = this.space.givenHeat;
        const etaQ = met.u / Q;
        const epsQ = Q / (-met.u);
        
        if (param == 'carnot' || param == 'rcarnot') { 
            const ts = ms.map(m => m.t);
            ts.sort((a, b) => a - b);
            const Tmin = ts[HALF_ISOTERM], Tmax = ts[ts.length - HALF_ISOTERM];
            if (param == 'carnot') {
                const etaT = (Tmax - Tmin) / Tmax;
                const e = `  ${(100 * (etaT - etaQ) / etaQ).toFixed(1)}%`;
                console.log("carnot> etaQ:", etaQ.toFixed(3), "etaT:", etaT.toFixed(3), e, "| T:", Tmin.toFixed(3), Tmax.toFixed(3));
            } else {
                const epsT = Tmin / (Tmax - Tmin);
                const e = `  ${(100 * (epsT - epsQ) / epsQ).toFixed(0)}%`;
                console.log("rcarnot> epsQ:", epsQ.toFixed(3), "epsT:", epsT.toFixed(3), e, "| T:", Tmin.toFixed(3), Tmax.toFixed(3));
            }
        }

        if (param == 'brython' || param == 'rbrython') { 
            const ps = this.space.plunger.meterings.map(m => m.p);
            ps.sort((a, b) => a - b);
            const Pmin = ps[HALF_ISOBAR], Pmax = ps[ps.length - HALF_ISOBAR];
            if (param == 'brython') {
                const etaP = 1 - (Pmin / Pmax)**0.5;
                const e = `  ${(100 * (etaP - etaQ) / etaQ).toFixed(1)}%`;
                console.log("brython> etaQ:", etaQ.toFixed(3), "etaP:", etaP.toFixed(3), e, "| P:", Pmin.toFixed(3), Pmax.toFixed(3));
            } else {
                const epsP = 1 / ((Pmax/Pmin)**0.5 - 1)
                const e = `  ${(100 * (epsP - epsQ) / epsQ).toFixed(0)}%`;
                console.log("rbrython> epsQ:", epsQ.toFixed(3), "epsP:", epsP.toFixed(3), e, "| P:", Pmin.toFixed(3), Pmax.toFixed(3));
            }
        }


        
        

    }
}

//#region  Utilities ------------------------------------------

function hilightBefore(line: string ) 
{   
    // знайти першу немарковану строку
    let start = ("\n"+processArea.value).indexOf("\n"+line);

    processArea.value = processArea.value.slice(0, start) + MARK_DOING +  processArea.value.slice(start);
}

function hilightAfter() 
{   
    processArea.value = processArea.value.replace(MARK_DOING, MARK_DONE);
}

export function removeHilights() 
{       
    processArea.value = processArea.value.replaceAll(MARK_DOING, '').replaceAll(MARK_DONE, '');
}

//#endregion