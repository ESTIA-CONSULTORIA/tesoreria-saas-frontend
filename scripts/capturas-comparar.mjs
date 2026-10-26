// Compara dos carpetas de capturas (antes/después) con pixelmatch y escribe <despues>/informe.html (antes | después | diferencias) y comparacion.json.
//   node scripts/capturas-comparar.mjs capturas-skins/ola0-antes capturas-skins/ola0-despues [--skins estia] [--tolerancia 0.1]
// Contrato de una oleada: en ESTIA, ningún píxel cambia salvo los textos de contraste corregidos (se listan aparte, a mano, en el informe de la oleada).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [antes, despues] = [resolve(process.argv[2]), resolve(process.argv[3])];
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const SKINS = arg('skins', 'estia,oscuro').split(',');
const UMBRAL = Number(arg('tolerancia', '0.1')); // sensibilidad de pixelmatch (0 = exacto)
const nombres = readdirSync(antes).filter((f) => f.endsWith('.png') && SKINS.some((s) => f.endsWith(`__${s}.png`)));
const filas = [];
for (const f of nombres) {
  if (!existsSync(join(despues, f))) { filas.push({ f, error: 'falta en después' }); continue; }
  const a = PNG.sync.read(readFileSync(join(antes, f))), d = PNG.sync.read(readFileSync(join(despues, f)));
  if (a.width !== d.width || a.height !== d.height) { filas.push({ f, error: `tamaño distinto ${a.width}x${a.height} vs ${d.width}x${d.height}` }); continue; }
  const dif = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, d.data, dif.data, a.width, a.height, { threshold: UMBRAL, includeAA: false });
  writeFileSync(join(despues, f.replace('.png', '.dif.png')), PNG.sync.write(dif));
  filas.push({ f, pixeles: n, porcentaje: +((100 * n) / (a.width * a.height)).toFixed(4) });
}
writeFileSync(join(despues, 'comparacion.json'), JSON.stringify(filas, null, 1));
const html = `<!doctype html><meta charset="utf-8"><title>Antes / después</title><style>body{background:#111;color:#eee;font:14px system-ui;margin:16px}table{border-collapse:collapse}td{padding:4px;vertical-align:top}img{width:440px;border:1px solid #444}h3{margin:18px 0 4px}</style>` +
  filas.map((x) => x.error ? `<h3>${x.f} — ${x.error}</h3>` : `<h3>${x.f} — ${x.pixeles} px distintos (${x.porcentaje} %)</h3><table><tr><td>antes<br><img src="../${antes.split(/[\\/]/).pop()}/${x.f}"></td><td>después<br><img src="${x.f}"></td><td>diferencias<br><img src="${x.f.replace('.png', '.dif.png')}"></td></tr></table>`).join('');
writeFileSync(join(despues, 'informe.html'), html);
for (const x of filas) console.log(x.f.padEnd(40), x.error ?? `${String(x.pixeles).padStart(7)} px  ${x.porcentaje} %`);
