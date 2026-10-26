// Compara el teclado de dos carpetas de capturas: orden de Tab (teclado.json) y qué hace cada atajo (atajos.json: F2/F3/F4/F6/F8/F10/Esc).
//   node scripts/teclado-comparar.mjs <antes> <despues> [--skins estia,oscuro]
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
const [antes, despues] = [resolve(process.argv[2]), resolve(process.argv[3])];
const i = process.argv.indexOf('--skins');
const skins = i > 0 ? process.argv[i + 1].split(',') : ['estia', 'oscuro', 'claro', 'contraste'];
const leer = (d, f) => (existsSync(join(d, f)) ? JSON.parse(readFileSync(join(d, f), 'utf8')) : {});
const [tA, tD, aA, aD] = [leer(antes, 'teclado.json'), leer(despues, 'teclado.json'), leer(antes, 'atajos.json'), leer(despues, 'atajos.json')];
const firma = (p) => (p ?? []).map((x) => (x ? `${x.tag}|${x.id ?? ''}|${x.rol ?? ''}|${x.texto}` : 'FIN'));
let escenas = 0, tabIguales = 0, atajosEscenas = 0, atajosIguales = 0, atajosTotal = 0;
const distintos = [];
for (const k of Object.keys(tA)) {
  if (!skins.some((s) => k.endsWith('__' + s)) || !(k in tD)) continue;
  escenas++;
  if (JSON.stringify(firma(tA[k])) === JSON.stringify(firma(tD[k]))) tabIguales++; else distintos.push('Tab ' + k);
  if (aA[k]?.length) {
    atajosEscenas++; atajosTotal += aA[k].length;
    const a = JSON.stringify(aA[k]), d = JSON.stringify(aD[k]);
    if (a === d) atajosIguales++; else distintos.push('atajos ' + k);
  }
}
console.log(`Orden de Tab: ${tabIguales}/${escenas} escenas idénticas`);
console.log(`Atajos: ${atajosIguales}/${atajosEscenas} escenas idénticas (${atajosTotal} pulsaciones comparadas)`);
if (distintos.length) console.log('Distintos:\n  ' + distintos.join('\n  '));
