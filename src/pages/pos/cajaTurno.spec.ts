import { describe, expect, it } from 'vitest';
import { BILLETES, MONEDAS, claveBillete, claveMoneda, corteZ, estadoDiferencia, totalContado } from './cajaTurno';

describe('conteo por denominación (declaración a ciegas)', () => {
  it('billetes 1000, 500, 200, 100, 50, 20 y monedas 20, 10, 5, 2, 1, 0.50', () => {
    expect([...BILLETES]).toEqual([1000, 500, 200, 100, 50, 20]);
    expect([...MONEDAS]).toEqual([20, 10, 5, 2, 1, 0.5]);
  });
  it('el billete de $20 y la moneda de $20 se cuentan por separado', () => {
    expect(totalContado({ [claveBillete(20)]: 2, [claveMoneda(20)]: 3 })).toBe(40 + 60);
  });
  it('suma billetes y monedas, incluida la de 50 centavos, al centavo', () => {
    const conteo = { [claveBillete(1000)]: 1, [claveBillete(500)]: 2, [claveMoneda(5)]: 3, [claveMoneda(0.5)]: 3 };
    expect(totalContado(conteo)).toBe(1000 + 1000 + 15 + 1.5);
    expect(totalContado({})).toBe(0);
  });
});

describe('corteZ (solo lo ve ADMIN, GERENTE o SOPORTE)', () => {
  // Caso real de la prueba de Miguel: fondo 500, retiro 50, ventas en efectivo 139.20 + 382.80 = 522.00 → en caja 972.00
  const totals = {
    fondoInicial: 500, efectivoEsperado: 972, efectivoEsperadoSinFondo: 472,
    totalVentasDebito: 300, totalVentasCredito: 200, totalVentasSPEI: 250, totalRetiros: 50, totalDepositos: 0,
  };
  it('el efectivo esperado en caja es fondo + ventas − retiros ($972), y se compara sin el fondo ($472)', () => {
    const z = corteZ(totals, { efectivoContado: 472, debitoDeclarado: 300, creditoDeclarado: 200, transferenciaDeclarada: 250 })!;
    expect(z.efectivoEnCaja).toBe(972);
    expect(z.fondoInicial).toBe(500);
    expect(z.filas.map((f) => f.esperado)).toEqual([472, 500, 250]);
    expect(z.filas.every((f) => f.diferencia === 0)).toBe(true);
  });
  it('diferencia = declarado − esperado: faltante negativo, sobrante positivo', () => {
    const z = corteZ(totals, { efectivoContado: 460, debitoDeclarado: 300, creditoDeclarado: 250, transferenciaDeclarada: 250 })!;
    expect(z.filas[0].diferencia).toBe(-12);
    expect(z.filas[1].diferencia).toBe(50);
    expect(estadoDiferencia(z.filas[0].diferencia)).toBe('faltante');
    expect(estadoDiferencia(z.filas[1].diferencia)).toBe('sobrante');
    expect(estadoDiferencia(0)).toBe('cuadra');
  });
  it('sin los totales del servidor (caja a ciegas) no hay corte que mostrar', () => {
    expect(corteZ(undefined, { efectivoContado: 100 })).toBeNull();
  });
});
