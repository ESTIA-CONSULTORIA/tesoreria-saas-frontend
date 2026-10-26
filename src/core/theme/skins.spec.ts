import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ajustarAcento, aHex, aRgb, colorSobre, luminancia, razon } from './contraste';
import { canales, cssSkins, esSkinId, nombreVar, resolverSkin, SKINS, SKINS_VISIBLES, type SkinId } from './skins';

describe('contraste WCAG', () => {
  it('blanco/negro = 21 y es simétrico', () => {
    expect(razon('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(razon('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(razon('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('coincide con los valores medidos en PLAN-SKINS.md (ESTIA)', () => {
    expect(razon('#F5F5F5', '#0A0A0A')).toBeCloseTo(18.16, 1);
    expect(razon('#4CAF7A', '#161616')).toBeCloseTo(6.65, 1); // éxito corregido
    expect(razon('#3B7A57', '#161616')).toBeCloseTo(3.54, 1); // éxito anterior: no pasaba
    expect(razon('#9B3A3A', '#161616')).toBeCloseTo(2.64, 1); // error anterior: no pasaba
  });

  it('luminancia y conversiones', () => {
    expect(luminancia('#000000')).toBe(0);
    expect(luminancia('#FFFFFF')).toBeCloseTo(1, 5);
    expect(aRgb('#0a0A0a')).toEqual([10, 10, 10]);
    expect(aHex([10, 10, 10])).toBe('#0A0A0A');
    expect(() => aRgb('rojo')).toThrow();
  });

  it('colorSobre elige blanco o negro según lo que se lea mejor', () => {
    expect(colorSobre('#FFD400')).toBe('#000000');
    expect(colorSobre('#1D4ED8')).toBe('#FFFFFF');
  });

  it('ajustarAcento deja intacto un color que ya contrasta y corrige el que no', () => {
    expect(ajustarAcento('#0EA5E9', '#171A22', 3)).toBe('#0EA5E9');
    const claro = ajustarAcento('#FFD400', '#FFFFFF', 3);
    expect(claro).not.toBeNull();
    expect(razon(claro as string, '#FFFFFF')).toBeGreaterThanOrEqual(3);
    const sobreOscuro = ajustarAcento('#1A252F', '#171A22', 3);
    expect(razon(sobreOscuro as string, '#171A22')).toBeGreaterThanOrEqual(3);
  });
});

// Toda skin debe pasar estos mínimos: si una paleta nueva no los cumple, el build falla.
describe.each(Object.keys(SKINS) as SkinId[])('skin %s: contraste', (id) => {
  const t = SKINS[id].tokens;
  const min = (a: string, b: string, minimo: number, que: string) =>
    expect(razon(a, b), `${que}: ${a} sobre ${b}`).toBeGreaterThanOrEqual(minimo);

  it('texto principal, secundario y terciario sobre fondos y superficies (AA 4.5:1)', () => {
    for (const fondo of [t.bg, t.nav, t.surface1, t.field, t.surface2]) {
      min(t.text1, fondo, 7, 'texto 1');
      min(t.text2, fondo, 4.5, 'texto 2');
    }
    for (const fondo of [t.bg, t.surface1, t.field]) min(t.text3, fondo, 4.5, 'texto 3'); // placeholders y cabeceras de tabla
  });

  it('bordes de controles (3:1) y anillo de foco (3:1)', () => {
    for (const fondo of [t.surface1, t.field, t.bg]) {
      min(t.borderField, fondo, 3, 'borde de campo');
      min(t.focus, fondo, 3, 'foco');
    }
  });

  it('acento como control y su texto', () => {
    min(t.accent, t.surface1, 3, 'acento');
    min(t.onAccent, t.accent, 4.5, 'texto sobre acento');
    min(t.link, t.surface1, 4.5, 'enlace');
  });

  it('estados como texto (4.5:1) sobre superficies y sobre su fondo suave', () => {
    for (const fondo of [t.surface1, t.field, t.bg]) for (const c of [t.ok, t.danger, t.warn]) min(c, fondo, 4.5, 'estado');
    min(t.ok, t.okSoft, 4.5, 'éxito en insignia');
    min(t.danger, t.dangerSoft, 4.5, 'error en insignia');
  });

  it('cáscara: el texto suave y el destacado se leen sobre el lienzo, los paneles y los menús (4.5:1); el acento secundario sobre el panel (3:1)', () => {
    for (const fondo of [t.canvas, t.panel, t.popover]) { min(t.textSoft, fondo, 4.5, 'texto suave'); min(t.textBright, fondo, 7, 'texto destacado'); }
    min(t.accentAlt, t.panel, 3, 'acento secundario');
    for (const v of [t.viz1, t.viz2, t.viz3, t.viz4]) min(v, t.surface1, 4.5, 'serie de color');
  });

  it('botones con relleno de color llevan texto legible (4.5:1)', () => {
    for (const fondo of [t.btn, t.btnHover, t.okSolid, t.dangerSolid, t.warnSolid]) min(t.text1, fondo, 4.5, 'texto sobre botón');
    for (const fondo of [t.surface3, t.surface4]) min(t.text1, fondo, 4.5, 'texto sobre elevado');
  });
});

describe('skins visibles', () => {
  it('solo ESTIA y Oscuro; «Claro» no existe todavía', () => {
    expect(SKINS_VISIBLES).toEqual(['estia', 'oscuro']);
    expect(esSkinId('claro')).toBe(false);
    expect(esSkinId('contraste')).toBe(false);
    for (const id of SKINS_VISIBLES) expect(SKINS[id]).toBeDefined();
  });

  it('ESTIA conserva los grises de siempre (el fondo, tarjetas y botones no cambian de aspecto)', () => {
    const t = SKINS.estia.tokens;
    expect([t.bg, t.nav, t.surface1, t.field, t.surface2, t.btn, t.btnHover, t.border]).toEqual(
      ['#0A0A0A', '#101010', '#161616', '#1B1B1B', '#222222', '#2D2D2D', '#3A3A3A', '#2D2D2D'],
    );
  });
});

describe('resolver la skin', () => {
  it('el equipo manda sobre el negocio', () => {
    expect(resolverSkin('oscuro', 'estia')).toBe('oscuro');
    expect(resolverSkin(null, 'oscuro')).toBe('oscuro');
  });
  it('valores viejos o desconocidos caen en ESTIA, incluida «claro»', () => {
    for (const v of ['dark', 'light', 'claro', '', null, undefined, 'otra']) expect(resolverSkin(undefined, v)).toBe('estia');
    expect(resolverSkin('claro', 'oscuro')).toBe('oscuro'); // un valor inválido del equipo no tapa al del negocio
  });
});

describe('CSS generado', () => {
  it('nombres de variables', () => {
    expect(nombreVar('surface1')).toBe('--surface-1');
    expect(nombreVar('borderField')).toBe('--border-field');
    expect(nombreVar('onAccent')).toBe('--on-accent');
    expect(canales('#0A0A0A')).toBe('10 10 10');
  });

  it('skins.generated.css está al día con skins.ts (si falla: npm run skins:css)', () => {
    const archivo = readFileSync(resolve(__dirname, 'skins.generated.css'), 'utf8').replace(/\r\n/g, '\n');
    expect(archivo).toBe(cssSkins());
  });

  it('index.html aplica la skin antes de pintar con las mismas claves', () => {
    const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8');
    expect(html).toContain('ui_skin_device');
    expect(html).toContain('ui_skin');
    for (const id of SKINS_VISIBLES) expect(html).toContain(`'${id}'`);
  });

  it('index.css ya no tiene colores de skin en hexadecimal fuera de los tokens', () => {
    const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');
    const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
    // Se permite la zona del módulo ejecutivo (colores propios) y rgba() de transparencia.
    const hex = sinComentarios.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
    expect(hex).toEqual([]);
  });
});
