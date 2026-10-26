// Skins del ERP/POS: única fuente de los colores (ver docs/PLAN-SKINS.md). El CSS se genera de aquí
// (`skins.generated.css`, con una prueba que falla si se desincroniza) y toda paleta debe pasar `skins.spec.ts`.
//
// Skins visibles para todos: ESTIA (la de siempre, con los colores de estado corregidos para contraste) y Oscuro.
// «Claro» y «Alto contraste» ya están definidas pero EN PREPARACIÓN: la interfaz todavía tiene colores fijos en línea fuera de las
// pantallas migradas (olas 0 y 1), y en una skin clara esos colores se verían mal. Solo las ven ADMIN y SOPORTE (SKINS_EN_PREPARACION)
// hasta terminar las olas 2 a 4 (ver docs/PLAN-SKINS.md).

export type SkinId = 'estia' | 'oscuro' | 'claro' | 'contraste';

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
  onSolid: string; // texto (e iconos) sobre btn, btnHover y los estados sólidos: ≥ 4.5:1 sobre todos ellos (≥ 7:1 en Alto contraste)
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
  modal: string; // fondo de las ventanas modales y de los diálogos
  viz1: string; // series de color de los indicadores (verde)
  viz2: string; // (violeta)
  viz3: string; // (ámbar)
  viz4: string; // (rosa)
  viz5: string; // series neutras de las gráficas (gris medio)
  viz6: string; // (gris oscuro)
}

/**
 * Cada skin: sus tokens y `alfaTextoMin`, el piso de opacidad del texto translúcido (--alfa-texto-min). El texto que se escribe como
 * rgb(var(--veil) / 0.5) se publica como rgb(var(--veil) / max(0.5, var(--alfa-texto-min))): con piso 0 (skins oscuras) nada cambia; en una
 * skin clara, una veladura oscura al 50 % sobre blanco da 3.4:1, así que el piso la sube hasta cumplir el contraste.
 */
export const SKINS: Record<SkinId, { nombre: string; descripcion: string; alfaTextoMin: number; tokens: Tokens }> = {
  estia: {
    nombre: 'ESTIA',
    descripcion: 'La de siempre: grafito sobrio.',
    alfaTextoMin: 0,
    tokens: {
      bg: '#0A0A0A', nav: '#101010', surface1: '#161616', field: '#1B1B1B', surface2: '#222222', surface3: '#2D2D2D', surface4: '#3A3A3A',
      border: '#2D2D2D', borderField: '#737373',
      text1: '#F5F5F5', text2: '#BDBDBD', text3: '#9A9A9A',
      accent: '#8FAFD4', onAccent: '#0A0A0A', link: '#BDBDBD',
      btn: '#2D2D2D', btnHover: '#3A3A3A', onSolid: '#F5F5F5',
      ok: '#4CAF7A', danger: '#E5736F', warn: '#D9A441',
      okSolid: '#3B7A57', dangerSolid: '#9B3A3A', warnSolid: '#8A6A3A',
      okSoft: '#1A2E22', dangerSoft: '#2E1A1A',
      focus: '#BDBDBD',
      veil: '#FFFFFF', scrim: '#000000', canvas: '#0F1117', panel: '#141820', popover: '#1A1F2E', textSoft: '#C8CDD8', textBright: '#E8ECF0',
      accentAlt: '#7B9CCC', chip: '#1E2D45', modal: '#161616', viz1: '#4ADE80', viz2: '#A78BFA', viz3: '#FBBF24', viz4: '#F472B6', viz5: '#7E7E7E', viz6: '#4A4A4A',
    },
  },
  oscuro: {
    nombre: 'Oscuro',
    descripcion: 'Azul noche con acento azul.',
    alfaTextoMin: 0,
    tokens: {
      bg: '#0F1117', nav: '#12151C', surface1: '#171A22', field: '#1B1F28', surface2: '#1F232D', surface3: '#2B3040', surface4: '#383E52',
      border: '#2B3040', borderField: '#6B7388',
      text1: '#E6E8EE', text2: '#B4BAC8', text3: '#8D95A6',
      accent: '#6EA8FE', onAccent: '#0F1117', link: '#6EA8FE',
      btn: '#2F5FB5', btnHover: '#2A56A8', onSolid: '#E6E8EE',
      ok: '#3FB950', danger: '#F87171', warn: '#FBBF24',
      okSolid: '#27704A', dangerSolid: '#B03A3A', warnSolid: '#7A5C18',
      okSoft: '#14281C', dangerSoft: '#2E1A1E',
      focus: '#6EA8FE',
      veil: '#FFFFFF', scrim: '#000000', canvas: '#0F1117', panel: '#141820', popover: '#1A1F2E', textSoft: '#C8CDD8', textBright: '#E8ECF0',
      accentAlt: '#7B9CCC', chip: '#1E2D45', modal: '#171A22', viz1: '#4ADE80', viz2: '#A78BFA', viz3: '#FBBF24', viz4: '#F472B6', viz5: '#7E7E7E', viz6: '#4A4A4A',
    },
  },
  claro: {
    nombre: 'Claro',
    descripcion: 'Fondo blanco, texto oscuro y acento azul.',
    alfaTextoMin: 0.7,
    tokens: {
      bg: '#F4F6F9', nav: '#FFFFFF', surface1: '#FFFFFF', field: '#F1F4F8', surface2: '#E8EDF3', surface3: '#DDE3EB', surface4: '#CBD3DE',
      border: '#D5DCE6', borderField: '#6B7788',
      text1: '#111827', text2: '#3B4658', text3: '#596579',
      accent: '#1D4ED8', onAccent: '#FFFFFF', link: '#1D4ED8',
      btn: '#1D4ED8', btnHover: '#1E40AF', onSolid: '#FFFFFF',
      ok: '#166534', danger: '#B91C1C', warn: '#92400E',
      okSolid: '#15803D', dangerSolid: '#B91C1C', warnSolid: '#B45309',
      okSoft: '#DCFCE7', dangerSoft: '#FEE2E2',
      focus: '#1D4ED8',
      veil: '#0F172A', scrim: '#0F172A', canvas: '#EEF2F7', panel: '#FFFFFF', popover: '#FFFFFF', textSoft: '#334155', textBright: '#0F172A',
      accentAlt: '#2563EB', chip: '#DBEAFE', modal: '#FFFFFF', viz1: '#166534', viz2: '#6D28D9', viz3: '#B45309', viz4: '#BE185D', viz5: '#64748B', viz6: '#CBD5E1',
    },
  },
  contraste: {
    nombre: 'Alto contraste',
    descripcion: 'Negro puro, texto blanco y foco amarillo: 7:1 o más.',
    alfaTextoMin: 0.75,
    tokens: {
      bg: '#000000', nav: '#000000', surface1: '#0A0A0A', field: '#121212', surface2: '#1A1A1A', surface3: '#262626', surface4: '#333333',
      border: '#B3B3B3', borderField: '#E0E0E0',
      text1: '#FFFFFF', text2: '#F0F0F0', text3: '#D6D6D6',
      accent: '#FFD60A', onAccent: '#000000', link: '#8AD0FF',
      btn: '#FFD60A', btnHover: '#FFE95C', onSolid: '#000000',
      ok: '#5CFF9A', danger: '#FF8A8A', warn: '#FFD60A',
      okSolid: '#5CFF9A', dangerSolid: '#FF8A8A', warnSolid: '#FFD60A',
      okSoft: '#0B2E1A', dangerSoft: '#3D0F0F',
      focus: '#FFD60A',
      veil: '#FFFFFF', scrim: '#000000', canvas: '#000000', panel: '#0A0A0A', popover: '#0A0A0A', textSoft: '#F0F0F0', textBright: '#FFFFFF',
      accentAlt: '#8AD0FF', chip: '#1A3A5C', modal: '#000000', viz1: '#5CFF9A', viz2: '#C4B5FD', viz3: '#FFD60A', viz4: '#FF9ED2', viz5: '#BDBDBD', viz6: '#8C8C8C',
    },
  },
};

/** Skins que se ofrecen a todos los usuarios (el orden es el de la pantalla de Apariencia). */
export const SKINS_VISIBLES: SkinId[] = ['estia', 'oscuro'];

/** Skins ya definidas pero aún no ofrecidas a todos: solo para estos roles hasta terminar las olas 2 a 4. (El backend repite la lista: users/ui-prefs.util.ts.) */
export const SKINS_EN_PREPARACION: SkinId[] = ['claro', 'contraste'];
export const ROLES_SKINS_EN_PREPARACION: string[] = ['ADMIN', 'SOPORTE'];

/** ¿Este rol puede ver / elegir esta skin? */
export const puedeVerSkin = (id: SkinId, rol?: string | null): boolean =>
  !SKINS_EN_PREPARACION.includes(id) || ROLES_SKINS_EN_PREPARACION.includes(rol ?? '');

/** Skins que se ofrecen en los selectores a un usuario con este rol. */
export const skinsParaRol = (rol?: string | null): SkinId[] => (Object.keys(SKINS) as SkinId[]).filter((id) => puedeVerSkin(id, rol));

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
  const bloque = (selector: string, id: SkinId) =>
    `${selector} {\n` + Object.entries(SKINS[id].tokens).map(([k, v]) => `  ${nombreVar(k)}: ${canales(v)};`).join('\n') +
    `\n  --alfa-texto-min: ${SKINS[id].alfaTextoMin};\n}\n`;
  return (
    '/* GENERADO desde src/core/theme/skins.ts — no editar a mano. Para regenerar: npm run skins:css */\n' +
    bloque(':root, [data-skin="estia"]', 'estia') +
    bloque('[data-skin="oscuro"]', 'oscuro') +
    bloque('[data-skin="claro"]', 'claro') +
    bloque('[data-skin="contraste"]', 'contraste')
  );
}

/**
 * Qué skin se ve. Gana el más específico: dispositivo (una terminal que debe verse siempre igual) → usuario (su preferencia propia) → negocio.
 * Una skin en preparación solo cuenta si `rol` puede verla; si no, se salta al siguiente nivel. Los valores viejos del negocio
 * ('dark', 'light', vacío) y cualquier valor desconocido caen en ESTIA: 'light' NO se convierte en Claro (el negocio no se migra solo).
 */
export function resolverSkin(
  dispositivo: string | null | undefined,
  negocio: string | null | undefined,
  opciones: { usuario?: string | null; rol?: string | null } = {},
): SkinId {
  for (const candidato of [dispositivo, opciones.usuario, negocio]) {
    if (esSkinId(candidato) && puedeVerSkin(candidato, opciones.rol)) return candidato;
  }
  return SKIN_POR_DEFECTO;
}
