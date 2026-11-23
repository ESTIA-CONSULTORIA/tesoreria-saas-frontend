import { describe, it, expect } from 'vitest';
import { alturaRestante } from './useAlturaRestante';

describe('alturaRestante', () => {
  it('ventana de 768 con la página empezando a 92 px deja 676 px (sin scroll)', () => {
    expect(alturaRestante(768, 92)).toBe(676);
  });
  it('redondea hacia abajo para no pasarse ni 1 px', () => {
    expect(alturaRestante(768, 91.6)).toBe(676);
  });
  it('nunca baja del mínimo (ventanas muy bajas)', () => {
    expect(alturaRestante(300, 92)).toBe(320);
  });
});
