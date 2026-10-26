import { describe, expect, it } from 'vitest';
import { contarDialogosNativos, seCuentaModal } from './estandarModales';
import { leerFuentes } from './fuentesApp';
import baseline from './dialogosNativos.baseline.json';

// Spec 2 del estándar de ventanas: se prohíben alert( y confirm( nativos. Se usa useAviso() / useConfirm() (core/components/confirmContext.ts)
// o un AlertaModal dentro de la ventana. La línea base solo baja: `npm run modales:baseline`.
const BASE = baseline as Record<string, number>;
const actual: Record<string, number> = {};
for (const [rel, texto] of Object.entries(leerFuentes(seCuentaModal))) {
  const n = contarDialogosNativos(texto);
  if (n > 0) actual[rel] = n;
}

describe('contador de diálogos nativos', () => {
  it('cuenta alert( y confirm( (también window.); ignora confirmar(, .confirm( de otros objetos y comentarios', () => {
    expect(contarDialogosNativos('alert("x"); if (confirm("¿?")) {} window.alert(1); window.confirm(2)')).toBe(4);
    expect(contarDialogosNativos('const ok = await confirmar({}); modal.confirm(1); showAlert(2); // alert(3)\n/* confirm(4) */')).toBe(0);
  });
});

describe('alert( y confirm( nativos (la línea base solo baja)', () => {
  it('ningún archivo supera su tope y los archivos nuevos no los usan: usa useAviso() / useConfirm()', () => {
    const excesos = Object.entries(actual).filter(([rel, n]) => n > (BASE[rel] ?? 0)).map(([rel, n]) => `${rel}: ${n} > tope ${BASE[rel] ?? 0}`);
    expect(excesos, 'Usa useAviso() / useConfirm() o un <AlertaModal> en vez de alert()/confirm()').toEqual([]);
  });
  it('la línea base no está más holgada que la realidad (al migrar, bájala: npm run modales:baseline)', () => {
    const holgados = Object.entries(BASE).filter(([rel, b]) => b > (actual[rel] ?? 0)).map(([rel, b]) => `${rel}: tope ${b} > real ${actual[rel] ?? 0}`);
    expect(holgados).toEqual([]);
  });
});
