import { describe, it, expect } from 'vitest';
import { pesosOGuion, pesosKpi, tendenciaMes } from './dinero';

describe('dinero', () => {
  it('pesosOGuion: formato de pesos y guion si falta', () => {
    expect(pesosOGuion(184520.5)).toBe('$184,520.50');
    expect(pesosOGuion('8200')).toBe('$8,200.00');
    expect(pesosOGuion(0)).toBe('$0.00');
    for (const v of [undefined, null, '', 'abc', NaN]) expect(pesosOGuion(v)).toBe('—');
  });
  it('pesosKpi: cero cuando falta', () => {
    expect(pesosKpi(undefined)).toBe('$0.00');
    expect(pesosKpi(1500)).toBe('$1,500.00');
  });
  it('tendenciaMes: sin porcentaje no inventa 0 %', () => {
    expect(tendenciaMes(undefined)).toEqual({ trend: 'neutral', texto: 'Sin datos para comparar' });
    expect(tendenciaMes(null).texto).toBe('Sin datos para comparar');
    expect(tendenciaMes(12.34)).toEqual({ trend: 'up', texto: '+12.3 % frente al mes anterior' });
    expect(tendenciaMes(-3)).toEqual({ trend: 'down', texto: '-3.0 % frente al mes anterior' });
    expect(tendenciaMes(0)).toEqual({ trend: 'neutral', texto: '0.0 % frente al mes anterior' });
  });
});
