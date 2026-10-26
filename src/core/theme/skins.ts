// Skins del ERP/POS: única fuente de los colores (ver docs/PLAN-SKINS.md). El CSS se genera de aquí
// (`skins.generated.css`, con una prueba que falla si se desincroniza) y toda paleta debe pasar `skins.spec.ts`.
//
// Hoy hay dos skins visibles, las dos oscuras: ESTIA (la de siempre, con los colores de estado corregidos para contraste) y Oscuro.
// «Claro» y «Alto contraste» NO están definidas a propósito: la interfaz todavía tiene miles de colores fijos en línea
// (ver el plan, riesgo 2) y una skin clara los dejaría ilegibles. No se ofrecen hasta migrar esas pantallas.

export type SkinId = 'estia' | 'oscuro';

export const SKIN_POR_DEFECTO: SkinId = 'estia';

/** Cada token es un color '#RRGGBB'. Se publican como canales «R G B» para permitir opacidad: rgb(var(--bg) / 0.5). */
export interface Tokens {
  bg: string; // fondo de página
  nav: string; // barras y menús laterales
  surface1: string; // tarjetas y paneles
  field: string; // fondo de campos (input/select/textarea) y cabeceras de tabla
  surface2: string;
  surface3: string; // botones neutros / elementos elevados
  surface4: string; // hover de los anteriores
  border: string; // separadores decorativos
  borderField: string; // borde de controles: ≥ 3:1
  text1: string;
  text2: string;
  text3: string;
  accent: string;
  onAccent: string;
  link: string; // texto de enlace / énfasis (antes text-blue-*)
  btn: string; // fondo del botón primario (antes bg-blue-600) — lleva texto text1
  btnHover: string;
  ok: string; // estados como TEXTO sobre superficies
  danger: string;
  warn: string;
  okSolid: string; // estados como FONDO con texto text1 encima
  dangerSolid: string;
  warnSolid: string;
  okSoft: string; // fondo suave de insignias
  dangerSoft: string;
  focus: string;
  // ── cáscara y transparencias (Ola 0/1 de PLAN-SKINS): hoy llevan los mismos valores que ya estaban fijos en pantalla, así que ESTIA y Oscuro no cambian ──
  veil: string; // base de las transparencias claras sobre fondo oscuro (rgb(var(--veil) / .08)); en una skin clara será oscura
  scrim: string; // fondo de ventanas modales y sombras (rgb(var(--scrim) / .6))
  canvas: string; // fondo de las pantallas que van dentro de MainLayout
  panel: string; // paneles internos y menús
  popover: string; // menús desplegables y ventanas flotantes
  textSoft: string; // texto de la barra superior y de las tarjetas del panel principal
  textBright: string; // texto destacado sobre panel/popover
  accentAlt: string; // acento secundario (tinte de la barra superior)
  chip: string; // fondo de las iniciales/avatares
  viz1: string; // series de color de los indicadores (verde)
  viz2: string; // (violeta)
  viz3: string; // (ámbar)
  viz4: string; // (rosa)
}

export const SKINS: Record<SkinId, { nombre: string; descripcion: string; tokens: Tokens }> = {
  estia: {
    nombre: 'ESTIA',
    descripcion: 'La de siempre: grafito sobrio.',
    tokens: {
      bg: '#0A0A0A', nav: '#101010', surface1: '#161616', field: '#1B1B1B', surface2: '#222222', surface3: '#2D2D2D', surface4: '#3A3A3A',
      border: '#2D2D2D', borderField: '#737373',
      text1: '#F5F5F5', text2: '#BDBDBD', text3: '#9A9A9A',
      accent: '#8FAFD4', onAccent: '#0A0A0A', link: '#BDBDBD',
      btn: '#2D2D2D', btnHover: '#3A3A3A',
      ok: '#4CAF7A', danger: '#E5736F', warn: '#D9A441',
      okSolid: '#3B7A57', dangerSolid: '#9B3A3A', warnSolid: '#8A6A3A',
      okSoft: '#1A2E22', dangerSoft: '#2E1A1A',
      focus: '#BDBDBD',
      veil: '#FFFFFF', scrim: '#000000', canvas: '#0F1117', panel: '#141820', popover: '#1A1F2E', textSoft: '#C8CDD8', textBright: '#E8ECF0',
      accentAlt: '#7B9CCC', chip: '#1E2D45', viz1: '#4ADE80', viz2: '#A78BFA', viz3: '#FBBF24', viz4: '#F472B6',
    },
  },
  oscuro: {
    nombre: 'Oscuro',
    descripcion: 'Azul noche con acento azul.',
    tokens: {
      bg: '#0F1117', nav: '#12151C', surface1: '#171A22', field: '#1B1F28', surface2: '#1F232D', surface3: '#2B3040', surface4: '#383E52',
      border: '#2B3040', borderField: '#6B7388',
      text1: '#E6E8EE', text2: '#B4BAC8', text3: '#8D95A6',
      accent: '#6EA8FE', onAccent: '#0F1117', link: '#6EA8FE',
      btn: '#2F5FB5', btnHover: '#2A56A8',
      ok: '#3FB950', danger: '#F87171', warn: '#FBBF24',
      okSolid: '#27704A', dangerSolid: '#B03A3A', warnSolid: '#7A5C18',
      okSoft: '#14281C', dangerSoft: '#2E1A1E',
      focus: '#6EA8FE',
      veil: '#FFFFFF', scrim: '#000000', canvas: '#0F1117', panel: '#141820', popover: '#1A1F2E', textSoft: '#C8CDD8', textBright: '#E8ECF0',
      accentAlt: '#7B9CCC', chip: '#1E2D45', viz1: '#4ADE80', viz2: '#A78BFA', viz3: '#FBBF24', viz4: '#F472B6',
    },
  },
};

/** Skins que se ofrecen al usuario (el orden es el de la pantalla de Apariencia). */
export const SKINS_VISIBLES: SkinId[] = ['estia', 'oscuro'];

export const esSkinId = (v: unknown): v is SkinId => typeof v === 'string' && Object.prototype.hasOwnProperty.call(SKINS, v);

/** '#0A0A0A' → '10 10 10' */
export function canales(hex: string): string {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
}

/** Nombre de la variable CSS de un token: surface1 → --surface-1, borderField → --border-field. */
export function nombreVar(token: string): string {
  return '--' + token.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/([a-z])(\d)/g, '$1-$2').toLowerCase();
}

/** El CSS de todas las skins. ESTIA también es el valor de :root (la que hay si no se eligió ninguna). */
export function cssSkins(): string {
  const bloque = (selector: string, t: Tokens) =>
    `${selector} {\n` + Object.entries(t).map(([k, v]) => `  ${nombreVar(k)}: ${canales(v)};`).join('\n') + '\n}\n';
  return (
    '/* GENERADO desde src/core/theme/skins.ts — no editar a mano. Para regenerar: npm run skins:css */\n' +
    bloque(':root, [data-skin="estia"]', SKINS.estia.tokens) +
    bloque('[data-skin="oscuro"]', SKINS.oscuro.tokens)
  );
}

/**
 * Qué skin se ve. Gana el más específico: dispositivo (una terminal que debe verse siempre igual) → negocio.
 * Los valores viejos del negocio ('dark', 'light', vacío) y cualquier valor desconocido —incluida «claro», que está oculta— caen en ESTIA.
 */
export function resolverSkin(dispositivo: string | null | undefined, negocio: string | null | undefined): SkinId {
  if (esSkinId(dispositivo)) return dispositivo;
  if (esSkinId(negocio)) return negocio;
  return SKIN_POR_DEFECTO;
}
