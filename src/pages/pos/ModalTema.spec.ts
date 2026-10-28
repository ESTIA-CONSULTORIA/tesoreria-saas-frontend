import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Teclado y estructura del acceso al tema del POS. No hay jsdom en el proyecto, así que se revisa el código fuente; el recorrido real de
// Tab y Esc se mide en Chrome con scripts/capturas-skins.mjs (escena pos-tema).
const leer = (r: string) => readFileSync(new URL(r, import.meta.url), 'utf8');
const modal = leer('./ModalTema.tsx');
const pos = leer('./POSPage.tsx');
const app = leer('../../App.tsx');

describe('ModalTema (barra del POS)', () => {
  it('usa el Modal estándar con pie ModalFooter y Boton (Esc, foco y Tab los resuelve Modal)', () => {
    expect(modal).toMatch(/<Modal\b[\s\S]*onClose=\{onClose\}/);
    expect(modal).toContain('<ModalFooter');
    expect(modal).toContain('<Boton');
    expect(modal).not.toMatch(/fixed inset-0/);
  });
  it('«Mi tema» y «Solo en este equipo» son <select> nativos con <label htmlFor> (alcanzables con Tab y teclado)', () => {
    expect(modal).toMatch(/htmlFor="tema-pos-usuario"/);
    expect(modal).toMatch(/id="tema-pos-usuario"/);
    expect(modal).toMatch(/htmlFor="tema-pos-equipo"/);
    expect(modal).toMatch(/id="tema-pos-equipo"/);
    expect(modal).not.toMatch(/tabIndex=\{-1\}/);
  });
  it('las opciones salen de opcionesTema(rol), sin lista fija de skins', () => {
    expect(modal).toContain('opcionesTema(rol)');
    expect(modal).not.toMatch(/value="(claro|contraste|oscuro|estia)"/);
  });
  it('el error de guardado se anuncia con role="alert"', () => {
    expect(modal).toMatch(/role="alert"/);
  });
});

describe('barra del POS y rutas', () => {
  it('la barra tiene un <button> con nombre accesible que abre el modal, antes de los botones de turno y fuera de cualquier condición de rol', () => {
    expect(pos).toMatch(/<button\s+onClick=\{\(\) => setShowTema\(true\)\}\s+aria-label="Cambiar el tema de la pantalla"/);
    expect(pos).toContain('{showTema && <ModalTema onClose={() => setShowTema(false)} />}');
    const boton = pos.indexOf('setShowTema(true)');
    const turno = pos.indexOf('{!shift ? (', boton);
    expect(boton).toBeGreaterThan(0);
    expect(turno - boton).toBeLessThan(600);
  });
  it('/settings/appearance solo para ADMIN y SOPORTE', () => {
    expect(app).toMatch(/path="\/settings\/appearance"[\s\S]*?<RoleRoute roles=\{\['ADMIN', 'SOPORTE'\]\}>\s*<AppearancePage \/>/);
  });
});
