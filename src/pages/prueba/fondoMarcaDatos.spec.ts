import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MARCAS_FONDO, TAMANOS_MARCA, estaRecortada, estiloMarca, type TamanoMarca } from './fondoMarcaDatos';
import { LINEA_VALOR, INCLUYE } from './pruebaLogic';
import { SKINS, SKINS_VISIBLES } from '../../core/theme/skins';
import { aRgb, aHex, razon } from '../../core/theme/contraste';

const por = (t: TamanoMarca) => MARCAS_FONDO.filter((m) => m.tam === t);

describe('fondo de marca (posiciones fijas)', () => {
  it('hay marcas de los tres tamaños, varias de cada uno', () => {
    expect(por('grande').length).toBeGreaterThanOrEqual(3);
    expect(por('mediano').length).toBeGreaterThanOrEqual(4);
    expect(por('pequeno').length).toBeGreaterThanOrEqual(6);
  });
  it('opacidades dentro de lo pedido: grande 3–5 %, mediano 5–6 %, pequeño 6–8 %', () => {
    expect(TAMANOS_MARCA.grande.opacidad).toBeGreaterThanOrEqual(0.03);
    expect(TAMANOS_MARCA.grande.opacidad).toBeLessThanOrEqual(0.05);
    expect(TAMANOS_MARCA.mediano.opacidad).toBeGreaterThanOrEqual(0.05);
    expect(TAMANOS_MARCA.mediano.opacidad).toBeLessThanOrEqual(0.06);
    expect(TAMANOS_MARCA.pequeno.opacidad).toBeGreaterThanOrEqual(0.06);
    expect(TAMANOS_MARCA.pequeno.opacidad).toBeLessThanOrEqual(0.08);
  });
  it('los tamaños van de mayor a menor y hay marcas recortadas por los bordes en cada tamaño grande y mediano', () => {
    expect(TAMANOS_MARCA.grande.vmin).toBeGreaterThan(TAMANOS_MARCA.mediano.vmin);
    expect(TAMANOS_MARCA.mediano.vmin).toBeGreaterThan(TAMANOS_MARCA.pequeno.vmin);
    expect(por('grande').some(estaRecortada)).toBe(true);
    expect(por('mediano').some(estaRecortada)).toBe(true);
  });
  it('determinista: el estilo es el mismo en cada llamada y no usa Math.random', () => {
    expect(MARCAS_FONDO.map(estiloMarca)).toEqual(MARCAS_FONDO.map(estiloMarca));
    const fuente = readFileSync(resolve(__dirname, 'fondoMarcaDatos.ts'), 'utf8') + readFileSync(resolve(__dirname, 'FondoMarca.tsx'), 'utf8');
    expect(fuente).not.toMatch(/Math\.random/);
  });
  it('capa decorativa: aria-hidden y sin eventos de puntero (componente y css)', () => {
    const tsx = readFileSync(resolve(__dirname, 'FondoMarca.tsx'), 'utf8');
    const css = readFileSync(resolve(__dirname, 'prueba.css'), 'utf8');
    expect(tsx).toMatch(/aria-hidden="true"/);
    expect(css).toMatch(/\.fondo-marca\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.fondo-marca\s*\{[^}]*overflow:\s*hidden/);
    expect(css).toMatch(/\.fondo-marca-isotipo\s*\{[^}]*pointer-events:\s*none/);
  });
  it('el SVG plano existe, es de un solo color y no trae scripts', () => {
    const svg = readFileSync(resolve(__dirname, '../../../public/marca/isotipo-plano.svg'), 'utf8');
    expect(svg).toMatch(/<path/);
    expect(svg).not.toMatch(/<script|<image|gradient/i);
    expect([...svg.matchAll(/fill="(#[0-9a-f]+)"/gi)].map((m) => m[1].toLowerCase())).toEqual(['#000']);
  });
});

describe('el fondo no baja el contraste del texto (AA) en ninguna skin visible', () => {
  // Peor caso: la marca de mayor opacidad (8 %) del color de acento justo debajo del texto, sobre el fondo de página.
  const mezcla = (fg: string, bg: string, a: number) => { const f = aRgb(fg), b = aRgb(bg); return aHex([0, 1, 2].map((i) => Math.round(f[i] * a + b[i] * (1 - a))) as [number, number, number]); };
  const peor = Math.max(...Object.values(TAMANOS_MARCA).map((t) => t.opacidad));
  it.each(SKINS_VISIBLES)('skin %s: text1/text2/text3 ≥ 4.5 sobre fondo+marca', (id) => {
    const t = SKINS[id].tokens;
    const fondo = mezcla(t.accent, t.bg, peor);
    for (const c of [t.text1, t.text2, t.text3]) expect(razon(c, fondo)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('línea de valor', () => {
  it('sale de INCLUYE y es una sola línea corta', () => {
    expect(LINEA_VALOR.startsWith(INCLUYE[1])).toBe(true);
    expect(LINEA_VALOR.length).toBeLessThan(110);
  });
});
