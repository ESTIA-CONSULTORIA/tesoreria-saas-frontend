import { describe, expect, it } from 'vitest';
import { contarOverlaysPropios, EXENTOS_OVERLAY, seCuentaModal } from './estandarModales';
import { leerFuentes } from './fuentesApp';
import baseline from './modalesPropios.baseline.json';

// Spec 1 del estándar de ventanas: ningún overlay `fixed inset-0` escrito a mano fuera de `Modal`. La línea base solo baja:
// al migrar una ventana a `Modal`, se baja con `npm run modales:baseline`.
const BASE = baseline as Record<string, number>;
const actual: Record<string, number> = {};
for (const [rel, texto] of Object.entries(leerFuentes(seCuentaModal))) {
  if (EXENTOS_OVERLAY.includes(rel)) continue;
  const n = contarOverlaysPropios(texto);
  if (n > 0) actual[rel] = n;
}

describe('contador de overlays propios', () => {
  it('cuenta fixed inset-0 y position fixed + inset 0; ignora comentarios', () => {
    expect(contarOverlaysPropios('<div className="fixed inset-0 z-50">')).toBe(1);
    expect(contarOverlaysPropios("<div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>")).toBe(1);
    expect(contarOverlaysPropios('// fixed inset-0 era el viejo\n/* position: "fixed", inset: 0 */')).toBe(0);
    expect(contarOverlaysPropios('<div className="fixed top-0 inset-x-0">')).toBe(0);
  });
});

describe('overlays propios fuera de Modal (la línea base solo baja)', () => {
  it('ningún archivo supera su tope y los archivos nuevos no traen overlays propios: usa <Modal>', () => {
    const excesos = Object.entries(actual).filter(([rel, n]) => n > (BASE[rel] ?? 0)).map(([rel, n]) => `${rel}: ${n} > tope ${BASE[rel] ?? 0}`);
    expect(excesos, 'Usa <Modal> de core/components/Modal.tsx en vez de pintar un overlay propio').toEqual([]);
  });
  it('la línea base no está más holgada que la realidad (al migrar, bájala: npm run modales:baseline)', () => {
    const holgados = Object.entries(BASE).filter(([rel, b]) => b > (actual[rel] ?? 0)).map(([rel, b]) => `${rel}: tope ${b} > real ${actual[rel] ?? 0}`);
    expect(holgados).toEqual([]);
  });
});
