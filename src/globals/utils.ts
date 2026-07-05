import {glo} from '../globals/globals.js';


// квантує простір при конструюванні сцен
 export   function quanty (x: number) { 
    return Math.round(x / glo.quant) * glo.quant;
}


export function confirmAction(message: string) {
    let confirm = document.getElementById('info2')!;
    confirm.innerHTML = message;
    confirm.style.display = "inline"
    setTimeout(function() {
        confirm.innerHTML = "";
        confirm.style.display = "none";
    }, 500);
}


// Перетворює рядок "x1 = 200, y1 = 0, x2 = 200, y2 = 450, c = blue, "
// на об'єкт {x1: 200, y1: 0, x2: 200, y2: 450, c: "blue", }
export function str2obj(str: string)
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
