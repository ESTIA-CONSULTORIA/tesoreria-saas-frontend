import { describe, expect, it } from 'vitest';
import { altoMaximo, ANCHO_MAX_PX, anchoEfectivo, CLASE_ANCHO, clasePanel } from './reglasModal';

describe('reglas de ventana del POS', () => {
  it('90vw/90vh a 1366×768 y 1920×1080', () => {
    expect(altoMaximo(768)).toBe(691);
    expect(altoMaximo(1080)).toBe(972);
    expect(anchoEfectivo('xl', 1366)).toBe(1229); // 90vw < 1240
    expect(anchoEfectivo('xl', 1920)).toBe(1240); // tope del tamaño
    expect(anchoEfectivo('sm', 1366)).toBe(480);
  });

  it('nunca supera el 90% del ancho de pantalla', () => {
    for (const s of ['sm', 'md', 'lg', 'xl'] as const) {
      for (const w of [360, 768, 1024, 1366, 1920]) expect(anchoEfectivo(s, w)).toBeLessThanOrEqual(Math.floor(w * 0.9));
    }
  });

  it('el panel declara 90vw, 90vh y no desborda el contenedor', () => {
    const c = clasePanel('lg');
    expect(c).toContain('w-[90vw]');
    expect(c).toContain('max-h-[90vh]');
    expect(c).toContain('flex-col');
    expect(c).toContain('overflow-hidden');
    expect(c).toContain(CLASE_ANCHO.lg);
    expect(CLASE_ANCHO.lg).toBe(`max-w-[${ANCHO_MAX_PX.lg}px]`);
  });
});
