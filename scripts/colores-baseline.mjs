// Regenera src/core/theme/coloresFijos.baseline.json (el tope de colores fijos por archivo). Solo BAJA: si algún archivo tiene MÁS que su
// línea base, el script se niega (hay que migrar ese color a un token, no subir el tope). Uso: npm run colores:baseline
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contarColores, seCuenta, total } from '../src/core/theme/coloresFijos.ts';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const ARCHIVO = join(SRC, 'core/theme/coloresFijos.baseline.json');

function* archivos(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') yield* archivos(p); } else yield p;
  }
}

const previo = existsSync(ARCHIVO) ? JSON.parse(readFileSync(ARCHIVO, 'utf8')) : null;
const nuevo = {};
const subieron = [];
for (const f of archivos(SRC)) {
  const rel = relative(SRC, f).split(sep).join('/');
  if (!seCuenta(rel)) continue;
  const c = contarColores(readFileSync(f, 'utf8'));
  if (total(c) === 0) continue;
  nuevo[rel] = c;
  const p = previo?.[rel] ?? { hex: 0, rgb: 0, tw: 0, nombrados: 0 };
  if (previo && Object.keys(c).some((k) => c[k] > p[k])) subieron.push(rel);
}
if (subieron.length) {
  console.error('Estos archivos tienen MÁS colores fijos que su línea base (usa tokens, no subas el tope):\n  ' + subieron.join('\n  '));
  process.exit(1);
}
const ordenado = Object.fromEntries(Object.entries(nuevo).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(ARCHIVO, JSON.stringify(ordenado, null, 1) + '\n');
console.log(`Línea base escrita: ${Object.keys(ordenado).length} archivos.`);
