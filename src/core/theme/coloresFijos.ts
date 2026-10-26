// Contador de colores fijos (hex, rgb() con números, clases Tailwind de paleta y colores con nombre en estilos). Lo usan el spec
// `coloresFijos.spec.ts` (tope por archivo con línea base + pantallas migradas con cero tolerancia) y `scripts/colores-baseline.mjs`.
// Puro y sin dependencias de TypeScript que Node no pueda quitar (el script lo importa directamente).

export interface Conteo {
  hex: number;
  rgb: number;
  tw: number;
  nombrados: number;
}

export const METRICAS = ['hex', 'rgb', 'tw', 'nombrados'] as const;

/** Módulos que DEFINEN colores (las skins y la paleta propia del login por negocio): no se cuentan, son la fuente. */
export const DEFINEN_COLORES: readonly string[] = [
  'core/theme/skins.ts',
  'core/theme/contraste.ts',
  'core/theme/skins.generated.css',
  'core/theme/compatSolidos.css',
  'core/theme/coloresFijos.ts',
  'pages/Login/loginPaleta.ts',
];

const PALETA = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const RE_HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const RE_RGB = /\brgba?\(\s*\d/g;
const RE_TW = new RegExp(
  `\\b(?:bg|text|border|ring|from|to|via|divide|fill|stroke|placeholder|outline|shadow|accent|caret|decoration)-(?:(?:${PALETA})-\\d{2,3}|white|black)(?:\\/\\d+)?\\b`,
  'g',
);
const RE_NOMBRADO =
  /(?:color|background(?:Color)?|border(?:Color|Top|Bottom|Left|Right)?|fill|stroke|outline(?:Color)?)\s*:\s*['"`](?:white|black|red|green|blue|gray|grey|yellow|orange|purple|pink|silver)\b/g;

export function contarColores(texto: string): Conteo {
  return {
    hex: (texto.match(RE_HEX) ?? []).length,
    rgb: (texto.match(RE_RGB) ?? []).length,
    tw: (texto.match(RE_TW) ?? []).length,
    nombrados: (texto.match(RE_NOMBRADO) ?? []).length,
  };
}

export const total = (c: Conteo): number => c.hex + c.rgb + c.tw + c.nombrados;

/** ¿Este archivo se cuenta? (.ts/.tsx/.css de src, sin specs ni los módulos que definen colores) */
export function seCuenta(rel: string): boolean {
  return /\.(tsx?|css)$/.test(rel) && !/\.(spec|test)\.[a-z]+$/.test(rel) && !DEFINEN_COLORES.includes(rel);
}
