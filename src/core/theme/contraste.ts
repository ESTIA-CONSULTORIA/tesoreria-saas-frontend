// Contraste de color según WCAG 2.x (puro, con spec). Lo usan las skins y la prueba que impide publicar una paleta ilegible.

export type Rgb = [number, number, number];

/** '#RRGGBB' (o 'RRGGBB') → [r, g, b]. */
export function aRgb(hex: string): Rgb {
  const h = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Color inválido: "${hex}"`);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function aHex([r, g, b]: Rgb): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Luminancia relativa (0 negro … 1 blanco). */
export function luminancia(hex: string): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = aRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Razón de contraste entre dos colores (1 … 21). Simétrica. */
export function razon(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Blanco o negro, el que dé más contraste sobre `color`. */
export function colorSobre(color: string): '#FFFFFF' | '#000000' {
  return razon(color, '#FFFFFF') >= razon(color, '#000000') ? '#FFFFFF' : '#000000';
}

/**
 * Mueve la luminosidad de `color` (conservando su tono) hacia el blanco o el negro hasta que tenga al menos `minimo`
 * de contraste contra `fondo`. Si ya lo tiene, lo devuelve igual. Devuelve null si ni siquiera el extremo lo logra.
 */
export function ajustarAcento(color: string, fondo: string, minimo = 3): string | null {
  if (razon(color, fondo) >= minimo) return aHex(aRgb(color));
  const haciaBlanco = luminancia(fondo) < 0.5;
  const destino: Rgb = haciaBlanco ? [255, 255, 255] : [0, 0, 0];
  const base = aRgb(color);
  for (let paso = 1; paso <= 100; paso++) {
    const t = paso / 100;
    const mezcla = base.map((v, i) => v + (destino[i] - v) * t) as Rgb;
    const hex = aHex(mezcla);
    if (razon(hex, fondo) >= minimo) return hex;
  }
  return null;
}
