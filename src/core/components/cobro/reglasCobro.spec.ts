import { describe, expect, it } from 'vitest';
import { formaDeAtajo, ICONO_FORMA, TECLAS_COBRO, type ClaveForma } from './reglasCobro';

const POS: ClaveForma[] = ['EFECTIVO', 'DEBITO', 'CREDITO', 'TRANSFERENCIA', 'CORTESIA'];
const RETAIL: ClaveForma[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CORTESIA'];

describe('teclas del cobro', () => {
  it('F2 efectivo, F3 tarjeta, F6 SPEI, F8 exacto, F4 cobrar', () => {
    expect(TECLAS_COBRO).toEqual({ efectivo: 'F2', tarjeta: 'F3', spei: 'F6', exacto: 'F8', cobrar: 'F4' });
  });
  it('F3 alterna débito y crédito empezando por débito (como el cobro del POS)', () => {
    expect(formaDeAtajo('F3', POS, null)).toBe('DEBITO');
    expect(formaDeAtajo('F3', POS, 'EFECTIVO')).toBe('DEBITO');
    expect(formaDeAtajo('F3', POS, 'DEBITO')).toBe('CREDITO');
    expect(formaDeAtajo('F3', POS, 'CREDITO')).toBe('DEBITO');
  });
  it('con una sola «Tarjeta» (retail) F3 la elige', () => {
    expect(formaDeAtajo('F3', RETAIL, 'EFECTIVO')).toBe('TARJETA');
  });
  it('F2 y F6 eligen su forma si la pantalla la ofrece; si no, no hacen nada', () => {
    expect(formaDeAtajo('F2', POS, 'DEBITO')).toBe('EFECTIVO');
    expect(formaDeAtajo('F6', POS, null)).toBe('TRANSFERENCIA');
    expect(formaDeAtajo('F2', ['TRANSFERENCIA'], null)).toBeNull();
    expect(formaDeAtajo('F6', ['EFECTIVO'], null)).toBeNull();
    expect(formaDeAtajo('F3', ['EFECTIVO'], null)).toBeNull();
  });
  it('toda forma tiene icono', () => {
    for (const f of [...POS, ...RETAIL]) expect(ICONO_FORMA[f]).toBeTruthy();
  });
});
