// Regenera las líneas base del estándar de ventanas (src/core/components/modalesPropios.baseline.json y dialogosNativos.baseline.json).
// Solo BAJAN: si algún archivo tiene MÁS que su tope, el script se niega (hay que usar <Modal> / useAviso() / useConfirm(), no subir el tope).
// Uso: npm run modales:baseline
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contarDialogosNativos, contarOverlaysPropios, EXENTOS_OVERLAY, seCuentaModal } from '../src/core/components/estandarModales.ts';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

function* archivos(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') yield* archivos(p); } else yield p;
  }
}

const MEDIDAS = [
  ['core/components/modalesPropios.baseline.json', contarOverlaysPropios, (rel) => EXENTOS_OVERLAY.includes(rel)],
  ['core/components/dialogosNativos.baseline.json', contarDialogosNativos, () => false],
];

let fallo = false;
for (const [archivo, contar, exento] of MEDIDAS) {
  const ruta = join(SRC, archivo);
  const previo = existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : null;
  const nuevo = {};
  const subieron = [];
  for (const f of archivos(SRC)) {
    const rel = relative(SRC, f).split(sep).join('/');
    if (!seCuentaModal(rel) || exento(rel)) continue;
    const n = contar(readFileSync(f, 'utf8'));
    if (n === 0) continue;
    nuevo[rel] = n;
    if (previo && n > (previo[rel] ?? 0)) subieron.push(`${rel}: ${n} > tope ${previo[rel] ?? 0}`);
  }
  if (subieron.length) {
    console.error(`${archivo}: MÁS que su línea base (no subas el tope):\n  ` + subieron.join('\n  '));
    fallo = true;
    continue;
  }
  const ordenado = Object.fromEntries(Object.entries(nuevo).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(ruta, JSON.stringify(ordenado, null, 1) + '\n');
  console.log(`${archivo}: ${Object.keys(ordenado).length} archivos, ${Object.values(ordenado).reduce((a, b) => a + b, 0)} casos.`);
}
if (fallo) process.exit(1);
