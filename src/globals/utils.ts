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


