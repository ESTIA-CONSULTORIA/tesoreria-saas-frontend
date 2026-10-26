// Contacto de capturas: junta varias PNG en una (reducidas, 3 columnas) para revisar de un vistazo que cada escena muestra el estado pensado.
//   node scripts/montaje.mjs <carpeta> <skin> <salida.png> [escena1,escena2,...]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
const [dir, skin, salida, lista] = process.argv.slice(2);
const nombres = (lista ? lista.split(',') : readdirSync(dir).filter((f) => f.endsWith(`__${skin}.png`)).map((f) => f.replace(`__${skin}.png`, ''))).filter((n) => { try { readFileSync(join(dir, `${n}__${skin}.png`)); return true; } catch { return false; } });
const F = 3, W = 1366 / F | 0, H = 768 / F | 0, COLS = 3, filas = Math.ceil(nombres.length / COLS);
const out = new PNG({ width: W * COLS + 4 * (COLS + 1), height: (H + 14) * filas + 4 * (filas + 1) });
out.data.fill(90);
nombres.forEach((n, i) => {
  const img = PNG.sync.read(readFileSync(join(dir, `${n}__${skin}.png`)));
  const ox = 4 + (i % COLS) * (W + 4), oy = 4 + Math.floor(i / COLS) * (H + 18) + 14;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const si = ((y * F) * img.width + x * F) * 4, di = ((oy + y) * out.width + ox + x) * 4;
    for (let c = 0; c < 4; c++) out.data[di + c] = img.data[si + c];
  }
});
writeFileSync(salida, PNG.sync.write(out));
console.log(nombres.map((n, i) => `${i + 1}. ${n}`).join('\n'));
