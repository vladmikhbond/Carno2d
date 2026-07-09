
// Основне газове рівняння: P * V = N * BOLTZ * T

export const glo = 
{
    BOLTZ: 1/30, // 0.005,       // стала Больцмана (в житті = 1.380649e−23) // was 1/30

    g: 0.1,            // сила тяжіння
    gBall: 0,          // чи впливає тяжіння на кулі (0-ні, 1-впливає) 
    metr: 10,          // інтервал між вимірюваннями (у кроках)
    quant: 5,          // квант простору 
    
    pretty: false,      // покращення діаграм шляхом заміни реальних даних ідеальними

    strikes: 0,        // заг. кількість зіткнень    
};

export const doc = { 
    canvas: <HTMLCanvasElement>document.getElementById('canvas'),
    canvas2: <HTMLCanvasElement>document.getElementById('canvas2'),
   
}
