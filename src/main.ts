import {doc, glo} from './globals/globals.js';
import Space from './model/Space.js';
import View from './view/View.js';
import Controller from './controller/Controller.js';
import { getSizeParams } from "./controller/params.js";
import { ProcessInterpreter, ProcessState } from './process/ProcessInterpreter.js';

// params from index.html         


const space = new Space(...getSizeParams()!);

const view = new View(space);
export const controller = new Controller(space, view);

view.draw();

// ===========================

