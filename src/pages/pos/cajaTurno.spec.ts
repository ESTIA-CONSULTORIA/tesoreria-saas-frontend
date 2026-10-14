import { describe, expect, it } from 'vitest';
import { conciliacionTurno, diferenciasPrecorte, efectivoEsperado, totalContado } from './cajaTurno';

const turno = { fondoInicial: '500', totalEfectivo: '1200', totalDepositos: '100', totalRetiros: '300', totalTarjeta: '800', totalTransferencia: '250', totalCortesia: '40' };

describe('efectivo esperado y conteo', () => {
  it('fondo + efectivo + depósitos − retiros (acepta strings numéricos)', () => {
    expect(efectivoEsperado(turno)).toBe(1500);
  });
  it('total contado por denominaciones', () => {
    expect(totalContado({ 1000: 1, 500: 2, 20: 3, 1: 4 })).toBe(1000 + 1000 + 60 + 4);
    expect(totalContado({})).toBe(0);
  });
});

describe('diferenciasPrecorte', () => {
  it('declarado − sistema: faltante negativo, sobrante positivo', () => {
    const [ef, tj, tr] = diferenciasPrecorte(turno, { efectivo: 1450, debito: 500, credito: 350, transferencia: 260 });
    expect(ef.sistema).toBe(1500);
    expect(ef.diferencia).toBe(-50);
    expect(tj.sistema).toBe(800);
    expect(tj.diferencia).toBe(50);
    expect(tr.diferencia).toBe(10);
  });
  it('todo cuadrado = 0', () => {
    const f = diferenciasPrecorte(turno, { efectivo: 1500, debito: 800, credito: 0, transferencia: 250 });
    expect(f.every((x) => x.diferencia === 0)).toBe(true);
  });
});

describe('conciliacionTurno (corte Z)', () => {
  it('usa los totales del servidor y cae a la fórmula local si faltan', () => {
    const c = conciliacionTurno(turno, { efectivoContado: 1500, debitoDeclarado: 300, creditoDeclarado: 500, transferenciaDeclarada: 250 }, undefined);
    expect(c.filas[0].sistema).toBe(1500);
    expect(c.filas[0].dif).toBe(0);
    expect(c.filas.find((f) => f.nombre === 'SPEI')!.sistema).toBe(250);
    expect(c.totalDeclarado).toBe(1500 + 300 + 500 + 250);
  });
  it('totales del servidor tienen prioridad y la cortesía no se declara', () => {
    const c = conciliacionTurno(turno, {}, { efectivoEsperado: 2000, totalVentasDebito: 100, totalVentasCredito: 200, totalVentasSPEI: 50, totalVentasCortesia: 10 });
    expect(c.filas[0].sistema).toBe(2000);
    expect(c.filas[4].noDeclarado).toBe(true);
    expect(c.totalSistema).toBe(2000 + 100 + 200 + 50 + 10);
    expect(c.totalDif).toBe(c.totalSistema - c.totalDeclarado);
  });
});
