import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PANTALLAS_MIGRADAS } from './pantallasMigradas';
import { ajustarAcento, aHex, aRgb, colorSobre, luminancia, razon } from './contraste';
import { canales, cssSkins, esSkinId, nombreVar, puedeVerSkin, resolverSkin, SKINS, SKINS_EN_PREPARACION, SKINS_VISIBLES, skinsParaRol, type SkinId } from './skins';

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

  it('botones con relleno de color llevan su texto «onSolid» legible (4.5:1); los neutros, text1', () => {
    for (const fondo of [t.btn, t.btnHover, t.okSolid, t.dangerSolid, t.warnSolid]) min(t.onSolid, fondo, 4.5, 'texto sobre botón');
    for (const fondo of [t.surface3, t.surface4]) min(t.text1, fondo, 4.5, 'texto sobre elevado');
  });

  it('ventanas modales: fondo propio con texto legible y borde visible', () => {
    min(t.text1, t.modal, 7, 'texto 1 en modal');
    min(t.text2, t.modal, 4.5, 'texto 2 en modal');
    min(t.text3, t.modal, 4.5, 'texto 3 en modal');
    min(t.borderField, t.modal, 3, 'borde de campo en modal');
    min(t.focus, t.modal, 3, 'foco en modal');
  });

  it('las skins con fondo claro invierten la base de las transparencias; las oscuras la mantienen', () => {
    const clara = luminancia(t.bg) > 0.5;
    expect(luminancia(t.veil) > 0.5, 'veil').toBe(!clara);
  });
});

// Alto contraste: 7:1 (AAA) en todo texto, controles y foco.
describe('skin contraste: 7:1', () => {
  const t = SKINS.contraste.tokens;
  const min7 = (a: string, b: string, que: string) => expect(razon(a, b), `${que}: ${a} sobre ${b}`).toBeGreaterThanOrEqual(7);
  const fondos = [t.bg, t.nav, t.surface1, t.field, t.surface2, t.surface3, t.surface4, t.modal, t.canvas, t.panel, t.popover];

  it('los tres textos y el de la cáscara, sobre todos los fondos', () => {
    for (const f of fondos) for (const c of [t.text1, t.text2, t.text3, t.textSoft, t.textBright]) min7(c, f, 'texto');
  });
  it('enlaces, acento, estados y series de color sobre las superficies de lectura', () => {
    for (const f of [t.bg, t.surface1, t.field, t.modal]) for (const c of [t.link, t.accent, t.ok, t.danger, t.warn, t.accentAlt, t.viz1, t.viz2, t.viz3, t.viz4]) min7(c, f, 'color');
    min7(t.ok, t.okSoft, 'éxito en insignia');
    min7(t.danger, t.dangerSoft, 'error en insignia');
  });
  it('texto sobre botones de color y sobre el acento', () => {
    for (const f of [t.btn, t.btnHover, t.okSolid, t.dangerSolid, t.warnSolid, t.accent]) min7(t.onSolid, f, 'texto sobre botón');
    min7(t.onAccent, t.accent, 'texto sobre acento');
  });
  it('bordes de controles y foco: 7:1 también (el foco mide 3 px, ver index.css)', () => {
    for (const f of [t.bg, t.surface1, t.field, t.modal]) { min7(t.borderField, f, 'borde de campo'); min7(t.focus, f, 'foco'); }
    for (const f of [t.bg, t.surface1]) expect(razon(t.border, f)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('skins visibles y en preparación', () => {
  it('para todos solo ESTIA y Oscuro; Claro y Alto contraste existen pero solo los ven ADMIN y SOPORTE', () => {
    expect(SKINS_VISIBLES).toEqual(['estia', 'oscuro']);
    expect(SKINS_EN_PREPARACION).toEqual(['claro', 'contraste']);
    expect(esSkinId('claro')).toBe(true);
    expect(esSkinId('contraste')).toBe(true);
    for (const id of [...SKINS_VISIBLES, ...SKINS_EN_PREPARACION]) expect(SKINS[id]).toBeDefined();
    for (const rol of ['ADMIN', 'SOPORTE']) expect(skinsParaRol(rol)).toEqual(['estia', 'oscuro', 'claro', 'contraste']);
    for (const rol of ['CAJERO', 'GERENTE', 'MESERO', 'USER', '', null, undefined]) expect(skinsParaRol(rol)).toEqual(['estia', 'oscuro']);
    expect(puedeVerSkin('claro', 'CAJERO')).toBe(false);
    expect(puedeVerSkin('oscuro', 'CAJERO')).toBe(true);
  });

  it('ESTIA y Oscuro: onSolid = text1 y modal = surface1 (el texto y las ventanas no cambian de aspecto)', () => {
    for (const id of ['estia', 'oscuro'] as const) {
      expect(SKINS[id].tokens.onSolid).toBe(SKINS[id].tokens.text1);
      expect(SKINS[id].tokens.modal).toBe(SKINS[id].tokens.surface1);
    }
  });

  it('ESTIA conserva los grises de siempre (el fondo, tarjetas y botones no cambian de aspecto)', () => {
    const t = SKINS.estia.tokens;
    expect([t.bg, t.nav, t.surface1, t.field, t.surface2, t.btn, t.btnHover, t.border]).toEqual(
      ['#0A0A0A', '#101010', '#161616', '#1B1B1B', '#222222', '#2D2D2D', '#3A3A3A', '#2D2D2D'],
    );
  });
});

describe('resolver la skin', () => {
  it('el equipo manda sobre el usuario y el usuario sobre el negocio', () => {
    expect(resolverSkin('oscuro', 'estia')).toBe('oscuro');
    expect(resolverSkin(null, 'oscuro')).toBe('oscuro');
    expect(resolverSkin(null, 'estia', { usuario: 'oscuro' })).toBe('oscuro');
    expect(resolverSkin('estia', 'oscuro', { usuario: 'oscuro' })).toBe('estia');
  });
  it('valores viejos o desconocidos caen en ESTIA; «light» NO se convierte en Claro aunque el rol pueda verla', () => {
    for (const v of ['dark', 'light', '', null, undefined, 'otra', 'LIGHT', 'Claro']) {
      expect(resolverSkin(undefined, v)).toBe('estia');
      expect(resolverSkin(undefined, v, { rol: 'ADMIN' })).toBe('estia');
    }
  });
  it('Claro y Alto contraste solo cuentan para ADMIN y SOPORTE; para el resto se salta al siguiente nivel', () => {
    for (const skin of ['claro', 'contraste'] as const) {
      for (const rol of ['ADMIN', 'SOPORTE']) {
        expect(resolverSkin(skin, 'estia', { rol })).toBe(skin);
        expect(resolverSkin(null, 'estia', { usuario: skin, rol })).toBe(skin);
        expect(resolverSkin(null, skin, { rol })).toBe(skin);
      }
      for (const rol of ['CAJERO', 'GERENTE', undefined, null]) {
        expect(resolverSkin(skin, 'oscuro', { rol })).toBe('oscuro'); // el equipo no puede forzarlo
        expect(resolverSkin(null, 'oscuro', { usuario: skin, rol })).toBe('oscuro');
        expect(resolverSkin(null, skin, { rol })).toBe('estia'); // negocio en Claro: el cajero sigue en ESTIA
      }
    }
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
    for (const id of [...SKINS_VISIBLES, ...SKINS_EN_PREPARACION]) expect(html).toContain(`'${id}'`);
    expect(html).toContain('ui_skin_user');
    // las skins en preparación solo con un rol que puede verlas
    expect(html).toMatch(/rol === 'ADMIN' \|\| rol === 'SOPORTE'/);
  });

  it('index.css: texto sobre botones de color con --on-solid, modales con --modal, foco de 3 px en Alto contraste y prefers-contrast', () => {
    const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8').replace(/\r\n/g, '\n');
    const solidos = readFileSync(resolve(__dirname, 'compatSolidos.css'), 'utf8');
    expect(css).toContain("@import './core/theme/compatSolidos.css'");
    expect(solidos).toContain('color: rgb(var(--on-solid)) !important');
    expect(css).toContain('background-color: rgb(var(--modal)) !important');
    expect(css).toMatch(/\[data-skin="contraste"\] :focus-visible \{\s*outline: 3px solid rgb\(var\(--focus\)\)/);
    expect(css).toMatch(/@media \(prefers-contrast: more\)/);
  });

  it('index.css ya no tiene colores de skin en hexadecimal fuera de los tokens', () => {
    const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');
    const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
    // Se permite la zona del módulo ejecutivo (colores propios) y rgba() de transparencia.
    const hex = sinComentarios.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
    expect(hex).toEqual([]);
  });
});

// Texto translúcido: rgb(var(--veil) / max(A, var(--alfa-texto-min))). Con el piso, la veladura al mínimo debe leerse sobre las superficies.
describe.each(Object.keys(SKINS) as SkinId[])('skin %s: piso de opacidad del texto translúcido', (id) => {
  const { tokens: t, alfaTextoMin: piso } = SKINS[id];
  const mezcla = (frente: string, fondo: string, a: number) => {
    const [f, g] = [aRgb(frente), aRgb(fondo)];
    return aHex(f.map((v, i) => v * a + g[i] * (1 - a)) as [number, number, number]);
  };

  it('las skins oscuras no cambian (piso 0); las demás lo exigen', () => {
    expect(piso >= 0 && piso <= 1).toBe(true);
    if (id === 'estia' || id === 'oscuro') expect(piso).toBe(0);
    else expect(piso).toBeGreaterThan(0);
  });

  it('veladura al piso sobre fondos y superficies: AA (AAA en Alto contraste)', () => {
    if (piso === 0) return;
    const minimo = id === 'contraste' ? 7 : 4.5;
    for (const fondo of [t.bg, t.nav, t.surface1, t.field, t.surface2, t.surface3, t.canvas, t.panel, t.popover, t.modal])
      expect(razon(mezcla(t.veil, fondo, piso), fondo), `veil@${piso} sobre ${fondo}`).toBeGreaterThanOrEqual(minimo);
  });
});

describe('texto translúcido en las pantallas migradas', () => {
  it('ninguna veladura con opacidad ≥ 0.3 (texto) se escribe sin el piso max(…, var(--alfa-texto-min))', () => {
    const SRC = resolve(__dirname, '../..');
    const malos: string[] = [];
    for (const rel of PANTALLAS_MIGRADAS) {
      const texto = readFileSync(resolve(SRC, rel), 'utf8');
      for (const m of texto.matchAll(/rgb\(var\(--(?:veil|text-1)\) \/ (0\.[3-9]\d*|1)\)/g)) malos.push(`${rel}: ${m[0]}`);
    }
    expect(malos).toEqual([]);
  });
});
