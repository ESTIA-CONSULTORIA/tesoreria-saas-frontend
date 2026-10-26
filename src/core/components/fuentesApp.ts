// Recorre los fuentes de src/ para los specs del estándar de ventanas.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

export const SRC = resolve(__dirname, '..', '..');

function* archivos(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') yield* archivos(p); } else yield p;
  }
}

/** Mapa ruta relativa a src/ (con /) → texto, solo de los archivos que `filtro` acepta. */
export function leerFuentes(filtro: (rel: string) => boolean): Record<string, string> {
  const r: Record<string, string> = {};
  for (const f of archivos(SRC)) {
    const rel = relative(SRC, f).split(sep).join('/');
    if (filtro(rel)) r[rel] = readFileSync(f, 'utf8');
  }
  return r;
}
