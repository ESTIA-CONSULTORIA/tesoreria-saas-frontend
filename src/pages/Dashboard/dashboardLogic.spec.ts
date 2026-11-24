import { describe, it, expect } from 'vitest';
import { participacion, textoPorcentaje, textoMoneda, SIN_DATOS } from './dashboardLogic';

const grupo = [{ companyId: 'a', income: 300 }, { companyId: 'b', income: '100' }];

describe('participacion', () => {
  it('en Vista Global reparte sobre el total real y suma 100 %', () => {
    const a = participacion(300, grupo, true) as number;
    const b = participacion('100', grupo, true) as number;
    expect(a).toBe(75);
    expect(b).toBe(25);
    expect(a + b).toBe(100);
  });
  it('con empresa o sucursal elegida no hay total de grupo: null, no 100 %', () => {
    expect(participacion(300, [{ companyId: 'a', income: 300 }], false)).toBeNull();
    expect(participacion(300, grupo, false)).toBeNull();
  });
  it('una sola empresa en el desglose no es participación real', () => {
    expect(participacion(300, [{ companyId: 'a', income: 300 }], true)).toBeNull();
  });
  it('total cero, desglose ausente o dato inválido: null', () => {
    expect(participacion(0, [{ income: 0 }, { income: 0 }], true)).toBeNull();
    expect(participacion(10, undefined, true)).toBeNull();
    expect(participacion(undefined, grupo, true)).toBeNull();
    expect(participacion('x', grupo, true)).toBeNull();
  });
  it('una empresa sin ventas dentro de un grupo con ventas: 0 %, un dato real', () => {
    expect(participacion(0, [{ income: 0 }, { income: 50 }], true)).toBe(0);
  });
});

describe('textos', () => {
  it('null o no finito se muestra «Sin datos»', () => {
    expect(textoPorcentaje(null)).toBe(SIN_DATOS);
    expect(textoPorcentaje(NaN)).toBe(SIN_DATOS);
    expect(textoMoneda(null)).toBe(SIN_DATOS);
    expect(textoMoneda(Infinity)).toBe(SIN_DATOS);
  });
  it('los números reales se redondean y se formatean', () => {
    expect(textoPorcentaje(74.6)).toBe('75%');
    expect(textoPorcentaje(0)).toBe('0%');
    expect(textoMoneda(1234.4)).toBe('$1,234');
    expect(textoMoneda(0)).toBe('$0');
  });
});

import { variacionComparable, margenSobreVentas, nombreRespaldoGrafica, SIN_COMPARAR } from './dashboardLogic';
describe('Dashboard: sin datos para comparar / margen / respaldo de la gráfica', () => {
  it('textos', () => expect(SIN_COMPARAR).toBe('Sin datos para comparar'));
  it('variación: periodo anterior en $0 → null (no «+0 %»)', () => {
    expect(variacionComparable(0, 0, 0)).toBeNull();
    expect(variacionComparable(0, 500, 0)).toBeNull();
    expect(variacionComparable(0, 0)).toBeNull(); // servidor viejo: 0 con ventas en $0
  });
  it('variación real se conserva (incluido 0 % legítimo)', () => {
    expect(variacionComparable(12.5, 900, 800)).toBe(12.5);
    expect(variacionComparable(0, 800, 800)).toBe(0);
    expect(variacionComparable(-5, 100)).toBe(-5);
  });
  it('variación ausente o inválida → null', () => {
    expect(variacionComparable(undefined, 10)).toBeNull();
    expect(variacionComparable(NaN, 10, 5)).toBeNull();
  });
  it('margen: sin ventas → null; con ventas se calcula (también negativo)', () => {
    expect(margenSobreVentas(0, 0)).toBeNull();
    expect(margenSobreVentas(-10, 0)).toBeNull();
    expect(margenSobreVentas(50, 200)).toBe(25);
    expect(margenSobreVentas(-50, 200)).toBe(-25);
  });
  it('respaldo de la gráfica usa el ámbito elegido', () => {
    expect(nombreRespaldoGrafica('Matriz', 'RIOVA DENTAL')).toBe('Matriz');
    expect(nombreRespaldoGrafica(null, 'RIOVA DENTAL')).toBe('RIOVA DENTAL');
    expect(nombreRespaldoGrafica(null, null)).toBe('Grupo Consolidado');
  });
});
