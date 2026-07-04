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


function errMesage(mes: string, el: HTMLInputElement) {
    alert (mes);
    el.style.backgroundColor = "pink";
    return null;
}
