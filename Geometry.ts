import Line from './Line.js';

export {dist, angle, scalar, scalarV, turnV, distToInfiniteLine, crossP, cross, inside, crossSegSeg, crossSegLine}

export type Point = {x: number, y:number}
type PointV = {vx: number, vy:number}
export type Segment = {x1: number, y1:number, x2: number, y2:number};

// Відстань між точками
function dist (a: Point, b: Point) {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
}


function scalar(ax: number, ay: number, bx: number, by: number) 
{
    return ax * bx + ay * by;
}

function scalarV(a: PointV, b: PointV)
{
    return a.vx * b.vx + a.vy * b.vy;
}

// Угол вектора (a, b) по отношению к оси Ox.
function angle(a: Point, b: Point)
{
    let dx = b.x - a.x;
    let dy = b.y - a.y; // ось Oy вниз
    return Math.atan2(dy, dx);
}

// поворот вектора (x, y) на угол alpha
function turn(x: number, y: number, alpha: number) {
    let x1 = x * Math.cos(alpha) + y * Math.sin(alpha)
    let y1 =-x * Math.sin(alpha) + y * Math.cos(alpha)
    return {x: x1, y: y1};
}

// поворот скорости шара a на угол alpha
function turnV(a: PointV, alpha: number) {
    let va = turn(a.vx, a.vy, alpha)
    a.vx = va.x;
    a.vy = va.y;
}


// расстояние от точки до бесконечной прямой
function distToInfiniteLine(p: Point, line: Line) {
    let a = line.A, b = line.B, c = line.C;
    return Math.abs(a * p.x + b * p.y + c) /  Math.sqrt(a * a + b * b);
}

// Точка пересечения прямой line и перпендикуляра к ней, опущенного из точки p.
function crossP(p: Point, line: Line) {

    let k = line.k;
    let b = line.b;

    // прямая вертикальна
    if (line.x1 === line.x2)
        return { x: line.x1, y: p.y };
    // прямая горизонтальна
    if (line.y1 === line.y2)
        return { x: p.x, y: line.y1 };
    // уравнение перпендикуляра, проходящего через точку p: y = k1 * x + b1
    let k1 = -1 / k;
    let b1 = p.y - k1 * p.x;
    // уравнение прямой: y = k2 * x + b2
    let k2 = k;
    let b2 = b;

    // точка пересечения перепендикуляра и прямой.
    return { x: (b1 - b2) / (k2 - k1), y: (k2 * b1 - k1 * b2) / (k2 - k1) };
}

// Точка перетину двох прямих (x1,y1)-(x2,y2) і (x3,y3)-(x4,y4)
//
function cross(x1: number, y1: number, x2: number, y2: number, 
               x3: number, y3: number, x4: number, y4: number): Point|null {
    let zn = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (zn == 0) 
       return null;
    let t12 = x1 * y2 - y1 * x2,  t34 = x3 * y4 - y3 * x4;
    let x = (t12 * (x3 - x4) - (x1- x2) * t34) / zn;
    let y = (t12 * (y3 - y4) - (y1- y2) * t34) / zn;
    return {x, y};      
}

// Чи належить точка (x,y) відрізку (x1,y1) - (x2,y2),
// якщо вже відомо, що точка (x,y) належить прямій. 
//
function inside(x1: number, y1: number, x2: number, y2: number, x: number, y: number): boolean {
    return (x1 == x2 || x1 <= x && x <= x2  || x2 <= x && x <= x1) && 
           (y1 == y2 || y1 <= y && y <= y2  || y2 <= y && y <= y1); 
}

// Перетин двох відрізків
//
function crossSegSeg(a: Segment, b: Segment): Point|null {
    const c = cross(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1, b.x2, b.y2);
    if (c == null) return null;
    const isInside = inside(a.x1, a.y1, a.x2, a.y2, c.x, c.y) &&   
                     inside(b.x1, b.y1, b.x2, b.y2, c.x, c.y);
    return isInside ? c : null;    
}

// Перетин відрізка і прямої
//
function crossSegLine(s: Segment, l: Segment): Point|null {
    const c = cross(s.x1, s.y1, s.x2, s.y2, l.x1, l.y1, l.x2, l.y2);
    if (c == null) return null;
    const isInside = inside(s.x1, s.y1, s.x2, s.y2, c.x, c.y);                     
    return isInside ? c : null;    
}

///////////////////////////////////////////////////////////////

// angle tests
// let res = _G.angle({x: 0, y: 0}, {x: 1, y: 0} )
// console.log(res == 0)
// res = G.angle({x: 0, y: 0}, {x: 0, y: 1} )
// console.log(res == - Math.PI / 2)
// res = G.angle({x: 0, y: 0}, {x: -1, y: 0} )
// console.log(res == Math.PI)
// res = G.angle({x: 0, y: 0}, {x: 0, y: -1} )
// console.log(res == Math.PI / 2)


// turn tests
// res = G.turn(1, 0,  Math.PI / 2)
// console.log(near(res.x, 0) && near(res.y, -1));
// res = G.turn(1, 0,  Math.PI)
// console.log(near(res.x, -1) && near(res.y, 0));
// res = G.turn(1, 0,  -Math.PI / 2)
// console.log(near(res.x, 0) && near(res.y, 1));
