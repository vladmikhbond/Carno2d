import Process, { ProcessState } from './Process.js';
import Controller from '../../controller/Controller.js';

import Bomb from '../Bomb.js';
import {glo} from '../../globals/globals.js';
import { Plunger } from '../Plunger.js';
import Space from '../Space.js';
import View from '../../view/View.js';
import {str2obj} from "../../globals/utils.js"
import { Heater } from '../Heater.js';

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
                    // this.initCalm();
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
            this.initCalm();
        } else {
            plun.move(0, -Plunger.GAP);
        }
    }

    // Первісне грязне заспокоювання поршня
    initCalm() {
        const plun = this.space.plunger;

        let pv = plun.pressureM * plun.volume
        const heater = new Heater(plun.x1, plun.y1, plun.x2, plun.realBottom, 1, "red");
        this.space.addDevice(heater);
        // довести  n*B*T до P*V 
        for (let i = 0; i < 5; i++){
            let [en, _] = plun.sumEnergyUnderPlunger();    
            heater.rate = Math.sqrt(pv/en);
            heater.warm();
        }
        this.space.removeDevice(heater);

        // розрахувати період коливань
        let T = 2 * Math.PI * Math.sqrt((plun.realBottom - plun.y1) / 2 / glo.g);
        for (let i = 0; i < T/4; i++){
            this.space.step();
        }
    }

    // Розраховує Efficiency і COP ()
    report(param = "") {
        const HALF_DEFAULT_DURATION = 500; 
        
        const ms = this.space.plunger.meterings;
        // ккд через роботу
        const met = ms[ms.length - 1]
        const Q = this.space.givenHeat;
        const effQ = met.u / Q;
        const copQ = Q / (-met.u);

        // carnot
        if (param == 'carnot' || param == 'rcarnot') { 
            const ts = ms.map(m => m.t);
            ts.sort((a, b) => a - b);
            const Tmin = ts[HALF_DEFAULT_DURATION], Tmax = ts[ts.length - HALF_DEFAULT_DURATION];
            if (param == 'carnot') {
                const effT = 1 - Tmin / Tmax;
                this.view.report("carnot", effQ, effT);
            } else {
                const copT = Tmin / (Tmax - Tmin);
                this.view.report("rcarnot", copQ, copT);
            }
        }

        // brython
        if (param == 'brython' || param == 'rbrython') { 
            const ps = ms.map(m => m.p);
            ps.sort((a, b) => a - b);
            const Pmin = ps[HALF_DEFAULT_DURATION], Pmax = ps[ps.length - HALF_DEFAULT_DURATION];
            if (param == 'brython') {
                const effP = 1 - (Pmin / Pmax)**0.5;
                this.view.report("brython", effQ, effP);
                // const e = `  ${(100 * (effP - effQ) / effQ).toFixed(1)}%`;
                // console.log("brython> Q:", effQ.toFixed(3), "P:", effP.toFixed(3), e, "|", Pmin.toFixed(3), Pmax.toFixed(3));
            } else {
                const copP = 1 / ((Pmax/Pmin)**0.5 - 1)
                this.view.report("rbrython", copQ, copP);
                // const e = `  ${(100 * (copP - copQ) / copQ).toFixed(0)}%`;
                // console.log("rbrython> Q:", copQ.toFixed(3), "P:", copP.toFixed(3), e, "| ", Pmin.toFixed(3), Pmax.toFixed(3));
            }
        }

        // otto
        if (param == 'otto' || param == 'rotto') { 
            const vs = ms.map(m => m.v);
            vs.sort((a, b) => a - b);
            const Vmin = vs[HALF_DEFAULT_DURATION], Vmax = vs[vs.length - HALF_DEFAULT_DURATION];
            if (param == 'otto') {
                const effV = 1 - (Vmin / Vmax);
                this.view.report("otto", effQ, effV);
                // const e = `  ${(100 * (effV - effQ) / effQ).toFixed(1)}%`;
                // console.log("otto> Q:", effQ.toFixed(3), "V:", effV.toFixed(3), e, "|", Vmin.toFixed(3), Vmax.toFixed(3));
            } else {
                const copV = 1 / (Vmax / Vmin - 1)
                this.view.report("rotto", copQ, copV);
                // const e = `  ${(100 * (copV - copQ) / copQ).toFixed(0)}%`;
                // console.log("rotto> Q:", copQ.toFixed(3), "V:", copV.toFixed(3), e, "|", Vmin.toFixed(3), Vmax.toFixed(3));
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