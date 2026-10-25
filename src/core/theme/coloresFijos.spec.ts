import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { contarColores, DEFINEN_COLORES, METRICAS, seCuenta, total, type Conteo } from './coloresFijos';
import { PANTALLAS_MIGRADAS } from './pantallasMigradas';
import baseline from './coloresFijos.baseline.json';

// Dos redes contra las regresiones de las skins (docs/PLAN-SKINS.md):
//  1. TOPE POR ARCHIVO: ningún archivo puede tener más colores fijos que su línea base, y un archivo que no está en la línea base no puede tener ninguno.
//     Además la línea base no puede quedar más holgada que la realidad: al migrar, se baja con `npm run colores:baseline` (el tope solo desciende).
//  2. PANTALLAS MIGRADAS: la lista de pantallasMigradas.ts tiene cero tolerancia.

const SRC = resolve(__dirname, '..', '..');
const BASE = baseline as Record<string, Conteo>;

function* archivos(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') yield* archivos(p); } else yield p;
  }
}

const actual: Record<string, Conteo> = {};
for (const f of archivos(SRC)) {
  const rel = relative(SRC, f).split(sep).join('/');
  if (!seCuenta(rel)) continue;
  const c = contarColores(readFileSync(f, 'utf8'));
  if (total(c) > 0) actual[rel] = c;
}
const CERO: Conteo = { hex: 0, rgb: 0, tw: 0, nombrados: 0 };

describe('contador de colores fijos', () => {
  it('cuenta hex, rgb() con números, clases de paleta de Tailwind y colores con nombre; ignora tokens y variables', () => {
    expect(contarColores(`<div className="bg-slate-800 text-white hover:bg-blue-600/50 border-black" style={{ color: '#FFF', background: '#0A0A0A', boxShadow: '0 0 0 rgba(0,0,0,.5)' }} />`))
      .toEqual({ hex: 2, rgb: 1, tw: 4, nombrados: 0 });
    expect(contarColores(`style={{ color: 'white', backgroundColor: "red", borderColor: 'transparent' }}`)).toEqual({ ...CERO, nombrados: 2 });
    // tokens y variables no son colores fijos
    expect(contarColores(`<div className="bg-surface-1 text-content-1 border-line" style={{ color: 'rgb(var(--text-1) / 0.5)', background: 'var(--bg)' }} />`)).toEqual(CERO);
    expect(contarColores('text-whitespace bg-whiteboard')).toEqual(CERO);
  });
  it('no cuenta los módulos que definen colores', () => {
    for (const d of DEFINEN_COLORES) expect(seCuenta(d)).toBe(false);
    expect(seCuenta('pages/Dashboard/DashboardPage.tsx')).toBe(true);
    expect(seCuenta('pages/Dashboard/DashboardPage.spec.tsx')).toBe(false);
    expect(seCuenta('assets/logo.svg')).toBe(false);
  });
});

describe('tope de colores fijos por archivo (la línea base solo baja)', () => {
  it('ningún archivo supera su línea base y los archivos nuevos no traen colores fijos', () => {
    const excesos: string[] = [];
    for (const [rel, c] of Object.entries(actual)) {
      const b = BASE[rel] ?? CERO;
      for (const m of METRICAS) if (c[m] > b[m]) excesos.push(`${rel}: ${m} ${c[m]} > tope ${b[m]}`);
    }
    expect(excesos, 'Usa tokens (bg-surface-1, text-content-1, border-line, rgb(var(--…)))  en vez de colores fijos').toEqual([]);
  });

  it('la línea base no está más holgada que la realidad (al migrar, bájala: npm run colores:baseline)', () => {
    const holgados: string[] = [];
    for (const [rel, b] of Object.entries(BASE)) {
      const c = actual[rel] ?? CERO;
      for (const m of METRICAS) if (b[m] > c[m]) holgados.push(`${rel}: ${m} tope ${b[m]} > real ${c[m]}`);
    }
    expect(holgados).toEqual([]);
  });
});

describe('pantallas migradas: cero tolerancia', () => {
  it('cada archivo de la lista existe y no tiene ningún color fijo', () => {
    const malos: string[] = [];
    for (const rel of PANTALLAS_MIGRADAS) {
      let texto: string;
      try { texto = readFileSync(join(SRC, rel), 'utf8'); } catch { malos.push(`${rel}: no existe`); continue; }
      const c = contarColores(texto);
      if (total(c) > 0) malos.push(`${rel}: ${JSON.stringify(c)}`);
    }
    expect(malos).toEqual([]);
  });

  it('una pantalla migrada no puede estar en la línea base (ya no tiene tope: tiene cero)', () => {
    for (const rel of PANTALLAS_MIGRADAS) expect(BASE[rel], rel).toBeUndefined();
  });

  it('sin duplicados y solo archivos que se cuentan', () => {
    expect(new Set(PANTALLAS_MIGRADAS).size).toBe(PANTALLAS_MIGRADAS.length);
    for (const rel of PANTALLAS_MIGRADAS) expect(seCuenta(rel), rel).toBe(true);
  });
});
