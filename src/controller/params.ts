type N2 = [number, number];

export function getSizeParams(): N2 | null
{
    const paramsElement = (document.getElementById("sizeParams") as HTMLInputElement)!;
    let ps: N2;
    try {
        ps = (new Function("", 
            "let W, H;" + 
            paramsElement.value + 
            "; return [W, H]" 
        ))();
    } catch {
        return errMesage("Grammar error", paramsElement);
    }
    // перевірки
    if (ps[0] == undefined || ps[0] <= 0) 
        return errMesage("W: W > 0", paramsElement);

    if (ps[1] == undefined || ps[1] <= 0) 
        return errMesage("H: H > 0", paramsElement);

    paramsElement.style.backgroundColor = "";
    return ps;
}


export function getSpaceParams(): N2 | null 
{
    const paramsElement = (document.getElementById("spaceParams") as HTMLInputElement)!;
    let ps: N2;
    try {
        ps = (new Function("", 
            "let g, gBall;" + 
            paramsElement.value + 
            "; return [g, gBall]" 
        ))();
    } catch {
        return errMesage("Grammar error", paramsElement);
    }
    // validation
    const [g, gBall] = ps;

    if (g == undefined || g < -10 || g > 10 )
        return errMesage("g: -10 < k < 10", paramsElement);

    if ( !(gBall != undefined && (gBall == 0 || gBall == 1)) )
        return errMesage("w: 0 <= w < 1", paramsElement);
 
    paramsElement.style.backgroundColor = "";
    return ps;
}

type NNNNS = [number, number, number, number, string];

export function getGasParams(): NNNNS | null
{
    const paramsElement = (document.getElementById("gasParams") as HTMLInputElement)!;
    let ps: NNNNS;
    try {
        ps = (new Function("", 
            "let n, r, t, m, c;" + 
            paramsElement.value + 
            "; return [n, r, t, m, c]" 
        ))();
    } catch {
        return errMesage("Grammar error", paramsElement);
    }
    // перевірки
    let [n, r, t, m, c] = ps;
    if (n == undefined || n < 0) 
        n = 1000;
    if (r == undefined || r < 0) 
        r = 1;
    if (t == undefined || t < 0) 
        t = 20;
    if (m == undefined || m < 0) 
        m = 1;
    if (c == undefined ) 
        c = "red";

    paramsElement.style.backgroundColor = "";
    return [n, r, t, m, c];
}

export function getWallParams(): string | null 
{
    const paramsElement = (document.getElementById("wallParams") as HTMLInputElement)!;
    let type_: string | null ;
    try {
        type_ = (new Function("", 
            "let type;" + 
            paramsElement.value + 
            "; return type" 
        ))();
    } catch {
        return errMesage("Grammar error", paramsElement);
    }
    // validation
    if (!type_ || type_ != 'r' && type_ != 'p' )
        type_ = 'r';
 
    paramsElement.style.backgroundColor = "";
    return type_;
}


export function getDevsParams(): [string, number, string] | null 
{
    const paramsElement = (document.getElementById("devsParams") as HTMLInputElement)!;
    let ps: [string, number, string] | null ;
    try {
        ps = (new Function("", 
            "let type, r, c;" + 
            paramsElement.value + 
            "; return [type, r, c]" 
        ))();
    } catch {
        return errMesage("Grammar error", paramsElement);
    }

    // validation
    let [type_, r, c] = ps!;
    if (type_ == undefined|| type_ != 'm' && type_ != 'h' )
        type_ = 'm';
    if (r == undefined || r < 0.9 || r > 1.1 )
        r = 1.001;
    if (c == undefined )
        c = 'red';

    paramsElement.style.backgroundColor = "";
    return [type_, r, c];
}



function errMesage(mes: string, el: HTMLInputElement) {
    alert (mes);
    el.style.backgroundColor = "pink";
    return null;
}
