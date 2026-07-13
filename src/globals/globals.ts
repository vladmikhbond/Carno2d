
// Основне газове рівняння: P * V = N * BOLTZ * T

export const glo = 
{
    BOLTZ: 1/30,       // стала Больцмана (в житті = 1.380649e−23) 

    g: 0.1,            // сила тяжіння
    gBall: 0,          // чи впливає тяжіння на кулі (0-ні, 1-впливає) 
    metr: 1,           // інтервал між вимірюваннями (у кроках)
    quant: 5,          // квант простору 
    
    pretty: false,     // покращення діаграм шляхом заміни реальних даних ідеальними

    strikes: 0,        // заг. кількість зіткнень 
    msec: 1,          // інтервал між кроками в msec   
};

export const doc = { 
    canvas: <HTMLCanvasElement>document.getElementById('canvas'),
    canvas2: <HTMLCanvasElement>document.getElementById('canvas2'),
   
}
