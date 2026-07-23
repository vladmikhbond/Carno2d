import Space from './model/Space.js';
import View from './view/View.js';
import Controller from './controller/Controller.js';
import { getSizeParams } from "./controller/params.js";

const space = new Space(...getSizeParams()!);
const view = new View(space);
export const controller = new Controller(space, view);

view.draw();

