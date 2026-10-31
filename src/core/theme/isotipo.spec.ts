import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { razon } from './contraste';
import { FORMAS, SKINS } from './skins';

// ESTIA Isotipo: identidad (forma, tipografía, movimiento, foco). La paleta ya pasa los mínimos generales de skins.spec.ts.
const t = SKINS.isotipo.tokens;
const leerCss = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8').replace(/\r\n/g, '\n');

describe('skin isotipo: identidad', () => {
  it('las skins existentes llevan forma neutra (sin bisel ni desplazamiento, Inter): no cambian de aspecto', () => {
    for (const id of ['estia', 'oscuro', 'claro', 'contraste'] as const) {
      expect(FORMAS[id].biselL, id).toBe('0px');
      expect(FORMAS[id].biselA, id).toBe('0px');
      expect(FORMAS[id].elevX, id).toBe('0px');
      expect(FORMAS[id].elevY, id).toBe('0px');
      expect(FORMAS[id].fuenteUi, id).toContain('Inter');
      expect(FORMAS[id].fuenteNum, id).toContain('Inter');
    }
  });

  it('el bisel y la elevación de Isotipo caen a 30° (largo : corto ≈ 1.73)', () => {
    const f = FORMAS.isotipo;
    for (const [largo, corto] of [[f.biselL, f.biselA], [f.elevX, f.elevY]]) {
      const r = parseFloat(largo) / parseFloat(corto);
      expect(r).toBeGreaterThan(1.6);
      expect(r).toBeLessThan(1.85);
    }
  });

  it('el foco es amarillo y se lee ≥ 7:1 sobre todas las superficies', () => {
    for (const f of [t.bg, t.nav, t.surface1, t.field, t.surface2, t.surface3, t.modal, t.canvas, t.panel]) expect(razon(t.focus, f), f).toBeGreaterThanOrEqual(7);
  });

  it('los colores de marca son decoración: la faceta se ve sobre el fondo y el texto sigue en tokens de texto', () => {
    expect(razon(t.marcaFaceta, t.bg)).toBeGreaterThanOrEqual(3);
    expect(razon(t.accent, t.bg)).toBeGreaterThanOrEqual(7);
    expect(razon(t.onSolid, t.btn)).toBeGreaterThanOrEqual(4.5);
    expect(razon(t.btn, t.surface1)).toBeGreaterThanOrEqual(3);
    // el cian de marca NO sirve de fondo de texto blanco (por eso es solo decorativo)
    expect(razon('#FFFFFF', t.marcaCian)).toBeLessThan(3);
  });

  it('isotipo.css: prefers-reduced-motion anula animaciones y transiciones; las animaciones solo existen bajo no-preference', () => {
    const css = leerCss('isotipo.css');
    const reducir = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reducir).toContain('animation: none !important');
    expect(reducir).toContain('transition: none !important');
    const idx = css.indexOf('animation: iso-entrada');
    expect(idx).toBeGreaterThan(-1);
    const ultimoMedia = css.lastIndexOf('@media', idx);
    expect(css.slice(ultimoMedia, ultimoMedia + 60)).toContain('prefers-reduced-motion: no-preference');
    // ninguna otra declaración de animation/transition fuera de esos dos bloques
    const sinBloques = css.replace(/@media \(prefers-reduced-motion: (?:no-preference|reduce)\) \{[\s\S]*?\n\}\n/g, '');
    expect(sinBloques.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/\b(animation|transition)\s*:/);
  });

  it('el foco no queda recortado por el bisel ni por el hexágono y es de 3 px', () => {
    const css = leerCss('isotipo.css');
    expect(css).toMatch(/:focus-visible \{\s*outline: 3px solid rgb\(var\(--focus\)\) !important/);
    expect(css).toMatch(/\.iso-bisel:focus-visible,[\s\S]*?\.iso-hex:focus-visible,[\s\S]*?\{ clip-path: none; \}/);
  });

  it('tipografías locales: Inter y Montserrat salen de archivos del proyecto, no de Google Fonts', () => {
    const fuentes = leerCss('fuentes.css');
    for (const f of ['inter-latin-wght-normal.woff2', 'montserrat-latin-wght-normal.woff2']) {
      expect(fuentes).toContain(f);
      expect(readFileSync(resolve(__dirname, '../../assets/fonts', f)).length).toBeGreaterThan(10000);
    }
    expect(leerCss('../../index.css')).not.toMatch(/googleapis|gstatic/);
    expect(leerCss('isotipo.css')).not.toMatch(/googleapis|gstatic/);
  });
});
