import {glo} from '../globals/globals.js';
import Ball from '../model/Ball.js';
import Device from '../model/Device.js';
import Line from '../model/Line.js';
import Space from '../model/Space.js';
import {Plunger} from '../model/Plunger.js';
import {Heater} from '../model/Heaters.js';
import {Measurer} from '../model/Measurer.js';

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


function serializeBall(ball: Ball) {
    return {
        kind: 'Ball',
        x: ball.x,
        y: ball.y,
        vx: ball.vx,
        vy: ball.vy,
        r: ball.r,
        c: ball.c,
        m: ball.m,
        prevX: ball.prevX,
        prevY: ball.prevY,
        moved: ball.moved,
        id: ball.id,
    };
}

function serializeLine(line: Line) {
    const snapshot: Record<string, unknown> = {
        kind: line instanceof Plunger ? 'Plunger' : 'Line',
        x1: line.x1,
        y1: line.y1,
        x2: line.x2,
        y2: line.y2,
        c: line.c,
    };

    if (line instanceof Plunger) {
        Object.assign(snapshot, {
            top: line.top,
            bottom: line.bottom,
            realTop: line.realTop,
            realBottom: line.realBottom,
            m: line.m,
            u: line.u,
            loss: line.loss,
            t: line.t,
            velo: line.velo,
            impulse: line.impulse,
            withFriction: line.withFriction,
            fixed: line.fixed,
            lastMetering: line.lastMetering,
            meterings: line.meterings,
            scales: line.scales,
        });
    }

    return snapshot;
}

function serializeDevice(device: Device) {
    const snapshot: Record<string, unknown> = {
        kind: device instanceof Heater ? 'Heater' : 'Measurer',
        x1: device.x1,
        y1: device.y1,
        x2: device.x2,
        y2: device.y2,
        c: device.c,
    };

    if (device instanceof Heater) {
        Object.assign(snapshot, {
            erg: device.erg,
            rate: device.rate,
        });
    }

    return snapshot;
}

function restoreBall(data: any): Ball {
    const ball = new Ball(data.x, data.y, data.vx, data.vy, data.r, data.m, data.c);
    ball.prevX = typeof data.prevX === 'number' ? data.prevX : data.x;
    ball.prevY = typeof data.prevY === 'number' ? data.prevY : data.y;
    ball.moved = Boolean(data.moved);
    ball.id = typeof data.id === 'number' ? data.id : ball.id;
    return ball;
}

function restoreLine(data: any): Line {
    if (data.kind === 'Plunger') {
        const plunger = new Plunger(
            data.x1,
            data.realTop ?? data.y1,
            data.x2,
            data.realBottom ?? data.y2,
            data.y1
        );
        plunger.x1 = data.x1;
        plunger.y1 = data.y1;
        plunger.x2 = data.x2;
        plunger.y2 = data.y2;
        plunger.c = data.c ?? 'green';
        plunger.top = typeof data.top === 'number' ? data.top : plunger.top;
        plunger.bottom = typeof data.bottom === 'number' ? data.bottom : plunger.bottom;
        plunger.realTop = typeof data.realTop === 'number' ? data.realTop : plunger.realTop;
        plunger.realBottom = typeof data.realBottom === 'number' ? data.realBottom : plunger.realBottom;
        plunger.m = typeof data.m === 'number' ? data.m : plunger.m;
        plunger.u = typeof data.u === 'number' ? data.u : plunger.u;
        plunger.loss = typeof data.loss === 'number' ? data.loss : plunger.loss;
        plunger.t = typeof data.t === 'number' ? data.t : plunger.t;
        plunger.velo = typeof data.velo === 'number' ? data.velo : plunger.velo;
        plunger.impulse = typeof data.impulse === 'number' ? data.impulse : plunger.impulse;
        plunger.withFriction = Boolean(data.withFriction);
        plunger.fixed = Boolean(data.fixed);
        plunger.lastMetering = data.lastMetering ?? plunger.lastMetering;
        plunger.meterings = data.meterings ?? plunger.meterings;
        plunger.scales = data.scales ?? plunger.scales;
        return plunger;
    }

    const line = new Line(data.x1, data.y1, data.x2, data.y2, data.c ?? 'gray');
    line.x1 = data.x1;
    line.y1 = data.y1;
    line.x2 = data.x2;
    line.y2 = data.y2;
    line.c = data.c ?? line.c;
    return line;
}

function restoreDevice(data: any): Device {
    if (data.kind === 'Heater') {
        const heater = new Heater(data.x1, data.y1, data.x2, data.y2, data.rate ?? 0, data.c);
        heater.erg = typeof data.erg === 'number' ? data.erg : heater.erg;
        return heater;
    } else {
        return new Measurer(data.x1, data.y1, data.x2, data.y2, data.c);
    }
}

// Зберігає поточний стан об'єкта space в форматі JSON.
export function sceneToJson(space: Space): string {
    const scene = {
        width: space.width,
        height: space.height,
        cell: space.cell,
        givenHeat: space.givenHeat,
        takenHeat: space.takenHeat,
        N: space.N,
        balls: Array.from(space.balls()).map(serializeBall),
        lines: Array.from(space.lines()).map(serializeLine),
        devices: Array.from(space.devices()).map(serializeDevice),
    };
    return JSON.stringify(scene);
}

// Відновлює стан об'єкта space з рядка json.
export function restoreSceneFromJson(json: string, space: Space): void {
    if (!json) {
        return;
    }

    let scene: any;
    try {
        scene = JSON.parse(json);
    } catch {
        return;
    }

    space.clear();

    if (typeof scene.width === 'number') {
        space.width = scene.width;
    }
    if (typeof scene.height === 'number') {
        space.height = scene.height;
    }
    if (typeof scene.cell === 'number') {
        space.cell = scene.cell;
    }
    if (typeof scene.width === 'number' || typeof scene.height === 'number') {
        space.resetContainers();
    }

    space.givenHeat = typeof scene.givenHeat === 'number' ? scene.givenHeat : 0;
    space.takenHeat = typeof scene.takenHeat === 'number' ? scene.takenHeat : 0;
    space.N = typeof scene.N === 'number' ? scene.N : 0;

    for (const lineData of scene.lines ?? []) {
        const line = restoreLine(lineData);
        space.addLine(line);
    }

    for (const deviceData of scene.devices ?? []) {
        const device = restoreDevice(deviceData);
        space.addDevice(device);
    }

    for (const ballData of scene.balls ?? []) {
        const ball = restoreBall(ballData);
        space.addBall(ball);
    }
}
