export default class Diag {
    
    vs: number[] = []

    push(v: number): void {
        if (v) 
            this.vs.push(v);       
    }

    get resume(): string {
        let n = this.vs.length;
        let sum = 0;
        this.vs.forEach(v => {sum += v;})
        let avg = sum / n;
        let sum2 = 0;
        this.vs.forEach(v => {sum2 += (v - avg)**2;});
        let sigma = Math.sqrt(sum2 / n);
        return `${avg.toFixed(3)}|${sigma.toFixed(3)} n:${n}`;
    }

}
