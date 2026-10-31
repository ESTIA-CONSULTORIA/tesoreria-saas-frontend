// Skins del ERP/POS: única fuente de los colores (ver docs/PLAN-SKINS.md). El CSS se genera de aquí
// (`skins.generated.css`, con una prueba que falla si se desincroniza) y toda paleta debe pasar `skins.spec.ts`.
//
// Skins visibles para todos: ESTIA (la de siempre, con los colores de estado corregidos para contraste) y Oscuro.
// «Claro» y «Alto contraste» ya están definidas pero EN PREPARACIÓN: la interfaz todavía tiene colores fijos en línea fuera de las
// pantallas migradas (olas 0 y 1), y en una skin clara esos colores se verían mal. Solo las ven ADMIN y SOPORTE (SKINS_EN_PREPARACION)
// hasta terminar las olas 2 a 4 (ver docs/PLAN-SKINS.md).

export type SkinId = 'estia' | 'oscuro' | 'claro' | 'contraste' | 'isotipo';

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
  // ── Ola 2 (POS, caja, mesas, Lite): tonos con el mismo valor que ya estaba fijo en ESTIA y Oscuro; Claro y Alto contraste tienen los suyos ──
  tonoDanger950: string; // fondo rojo muy oscuro (red-950)
  tonoDanger900: string; // fondo rojo oscuro con opacidad (red-900)
  tonoDanger800: string; // borde rojo (red-800)
  tonoDanger700: string; // borde rojo (red-700)
  tonoDanger200: string; // texto rojo claro sobre fondo rojo (red-200)
  tonoDanger100: string; // texto rojo muy claro sobre fondo rojo (red-100)
  tonoOk900: string; // fondo verde oscuro con opacidad (green-900)
  tonoOk700: string; // borde verde (green-700)
  tonoYellow900: string; // fondo amarillo oscuro (yellow-900)
  tonoYellow700: string; // borde / hover amarillo (yellow-700)
  tonoYellow600: string; // botón amarillo (yellow-600)
  tonoYellow300: string; // texto amarillo (yellow-300)
  tonoAmber900: string; // fondo ámbar oscuro (amber-900)
  tonoAmber700: string; // botón ámbar (amber-700)
  tonoAmber300: string; // texto ámbar (amber-300)
  tonoOrange700: string; // borde naranja (orange-700)
  tonoOrange400: string; // texto naranja (orange-400)
  tonoBlue950: string; // fondo azul muy oscuro (blue-950)
  tonoBlue900: string; // borde / fondo azul oscuro (blue-900)
  tonoBlue400: string; // borde / texto azul (blue-400)
  tonoPurple600: string; // botón morado (purple-600)
  tonoPurple700: string; // hover del botón morado (purple-700)
  tonoIndigo700: string; // botón índigo (indigo-700)
  tonoSlate800: string; // fondo gris azulado con opacidad (slate-800)
  tonoSlate700: string; // fondo gris azulado con opacidad (slate-700)
  tonoSlate600: string; // texto gris azulado (slate-600)
  tonoSlate300: string; // borde / hover claro (slate-300)
  tonoSlate200: string; // botón neutro claro (slate-200)
  tonoInk: string; // texto sobre el botón neutro claro
  onYellow: string; // texto sobre el botón amarillo
  stOk: string; // mesa libre
  stDanger: string; // mesa ocupada
  stWarn: string; // mesa reservada
  stNeutral: string; // mesa por limpiar
  papel: string; // tarjeta / hoja
  papelBg: string; // fondo de la pantalla Lite
  papelSoft: string; // fondo suave de filas y teclas
  papelLinea: string; // separadores
  papelLinea2: string; // separadores finos
  papelLinea3: string; // bordes de teclas y campos
  papelAzul: string; // acento principal
  papelAzulBg: string; // fondo de aviso informativo
  papelRojo: string; // texto / botón de error
  papelRojoBg: string; // fondo de error
  papelRojoLinea: string; // borde de error
  papelVerde: string; // texto / botón de éxito
  papelVerdeBg: string; // fondo de éxito
  papelVerdeTx: string; // texto verde oscuro
  papelAmbar: string; // texto / botón de aviso
  papelAmbarBg: string; // fondo de aviso
  papelAmbarLinea: string; // borde de aviso
  papelWhats: string; // botón de WhatsApp
  tinta1: string; // texto principal sobre papel
  tinta2: string; // texto secundario sobre papel
  tinta3: string; // texto terciario sobre papel
  tinta4: string; // texto tenue / marcadores sobre papel
  tinta5: string; // texto gris oscuro sobre papel
  tintaNavy: string; // texto / fondo azul marino
  papelNavy: string; // fondo azul marino (pantalla de cocina)
  papelNavy2: string; // tarjeta azul marino (pantalla de cocina)
  tonoDanger300: string; // texto / borde rojo claro (red-300)
  chatWarnBg: string; // chat: fondo de solicitud de aprobación
  chatOkBg: string; // chat: fondo de aprobado
  chatDangerBg: string; // chat: fondo de rechazado
  chatDangerBtn: string; // chat: botón de rechazar
  chatMineBg: string; // chat: burbuja propia
  chatMineLine: string; // chat: borde de la burbuja propia
  chatInfoBg: string; // chat: fondo de aviso
  chatInfoText: string; // chat: texto de aviso
  toggleOn: string; // interruptor encendido
  surfaceAlt: string; // fondo de campos y botones del cobro rápido y del chat
  navAlt: string; // fondo del pie del chat
  onStrong: string; // texto sobre los botones morado y ámbar
  papelOnVerde: string; // texto sobre botones verdes (papelVerde)
  tintaNavyTx: string; // texto secundario sobre fondo azul marino (cocina)
  // ── Identidad del isotipo (solo ESTIA Isotipo las usa; en las demás skins llevan el color de su propio acento y nada las lee) ──
  marcaCian: string; // extremo suroeste del degradado del isotipo: SOLO decorativo (texto blanco sobre él no llega a 3:1)
  marcaAzul: string; // tramo medio del degradado
  marcaCobalto: string; // extremo noreste
  marcaFaceta: string; // faceta clara de los giros
  marcaFacetaOsc: string; // faceta oscura
}

/**
 * Tokens que NO son color: forma, elevación, tipografía y movimiento. Se publican tal cual (no como canales RGB).
 * Las skins existentes llevan valores neutros (esquinas rectas, sin desplazamiento, Inter, 150 ms): no cambian de aspecto.
 */
export interface Forma {
  biselL: string; // bisel de esquina, lado largo (0px = sin bisel)
  biselA: string; // bisel de esquina, lado corto: con L:A = 1.73 el corte cae a 30°
  elevX: string; // desplazamiento duro de la elevación (sin desenfoque)
  elevY: string;
  fuenteUi: string;
  fuenteNum: string; // cifras grandes (importes)
  movDur: string; // duración base de las transiciones; con prefers-reduced-motion se anula en isotipo.css
}

/**
 * Cada skin: sus tokens y `alfaTextoMin`, el piso de opacidad del texto translúcido (--alfa-texto-min). El texto que se escribe como
 * rgb(var(--veil) / 0.5) se publica como rgb(var(--veil) / max(0.5, var(--alfa-texto-min))): con piso 0 (skins oscuras) nada cambia; en una
 * skin clara, una veladura oscura al 50 % sobre blanco da 3.4:1, así que el piso la sube hasta cumplir el contraste.
 */
type DefSkin = { nombre: string; descripcion: string; alfaTextoMin: number; tokens: Tokens };
const SKINS_BASE: Record<Exclude<SkinId, 'isotipo'>, DefSkin> = {
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
      tonoDanger950: '#450A0A', tonoDanger900: '#7F1D1D', tonoDanger800: '#991B1B', tonoDanger700: '#B91C1C',
      tonoDanger200: '#FECACA', tonoDanger100: '#FEE2E2', tonoOk900: '#14532D', tonoOk700: '#15803D',
      tonoYellow900: '#713F12', tonoYellow700: '#A16207', tonoYellow600: '#CA8A04', tonoYellow300: '#FDE047',
      tonoAmber900: '#78350F', tonoAmber700: '#B45309', tonoAmber300: '#FCD34D', tonoOrange700: '#C2410C',
      tonoOrange400: '#FB923C', tonoBlue950: '#172554', tonoBlue900: '#1E3A8A', tonoBlue400: '#60A5FA',
      tonoPurple600: '#9333EA', tonoPurple700: '#7E22CE', tonoIndigo700: '#4338CA', tonoSlate800: '#1E293B',
      tonoSlate700: '#334155', tonoSlate600: '#475569', tonoSlate300: '#CBD5E1', tonoSlate200: '#E2E8F0',
      tonoInk: '#000000', onYellow: '#0A0A0A', stOk: '#22C55E', stDanger: '#EF4444',
      stWarn: '#F59E0B', stNeutral: '#94A3B8', papel: '#FFFFFF', papelBg: '#F0F4F8',
      papelSoft: '#F8FAFC', papelLinea: '#E2E8F0', papelLinea2: '#F1F5F9', papelLinea3: '#CBD5E1',
      papelAzul: '#1D4ED8', papelAzulBg: '#EFF6FF', papelRojo: '#DC2626', papelRojoBg: '#FEF2F2',
      papelRojoLinea: '#FECACA', papelVerde: '#16A34A', papelVerdeBg: '#F0FDF4', papelVerdeTx: '#166534',
      papelAmbar: '#D97706', papelAmbarBg: '#FFFBEB', papelAmbarLinea: '#FDE68A', papelWhats: '#128C7E',
      tinta1: '#111827', tinta2: '#475569', tinta3: '#5B6B82', tinta4: '#94A3B8',
      tinta5: '#374151', tintaNavy: '#0F172A', papelNavy: '#0F172A', papelNavy2: '#1E293B',
      tonoDanger300: '#FCA5A5',
      chatWarnBg: '#1A1A0A',
      chatOkBg: '#0A1A0A',
      chatDangerBg: '#1A0A0A',
      chatDangerBtn: '#2A1515',
      chatMineBg: '#1A1A2A',
      chatMineLine: '#3D3D6D',
      chatInfoBg: '#1B1B2B',
      chatInfoText: '#BDBDFF',
      toggleOn: '#1A5C3A',
      surfaceAlt: '#1A1A1A',
      navAlt: '#111111',
      onStrong: '#F5F5F5',
      papelOnVerde: '#0B1F13',
      tintaNavyTx: '#94A3B8',
      marcaCian: '#8FAFD4', marcaAzul: '#2D2D2D', marcaCobalto: '#2D2D2D', marcaFaceta: '#7B9CCC', marcaFacetaOsc: '#222222',
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
      tonoDanger950: '#450A0A', tonoDanger900: '#7F1D1D', tonoDanger800: '#991B1B', tonoDanger700: '#B91C1C',
      tonoDanger200: '#FECACA', tonoDanger100: '#FEE2E2', tonoOk900: '#14532D', tonoOk700: '#15803D',
      tonoYellow900: '#713F12', tonoYellow700: '#A16207', tonoYellow600: '#CA8A04', tonoYellow300: '#FDE047',
      tonoAmber900: '#78350F', tonoAmber700: '#B45309', tonoAmber300: '#FCD34D', tonoOrange700: '#C2410C',
      tonoOrange400: '#FB923C', tonoBlue950: '#172554', tonoBlue900: '#1E3A8A', tonoBlue400: '#60A5FA',
      tonoPurple600: '#9333EA', tonoPurple700: '#7E22CE', tonoIndigo700: '#4338CA', tonoSlate800: '#1E293B',
      tonoSlate700: '#334155', tonoSlate600: '#475569', tonoSlate300: '#CBD5E1', tonoSlate200: '#E2E8F0',
      tonoInk: '#000000', onYellow: '#0A0A0A', stOk: '#22C55E', stDanger: '#EF4444',
      stWarn: '#F59E0B', stNeutral: '#94A3B8', papel: '#FFFFFF', papelBg: '#F0F4F8',
      papelSoft: '#F8FAFC', papelLinea: '#E2E8F0', papelLinea2: '#F1F5F9', papelLinea3: '#CBD5E1',
      papelAzul: '#1D4ED8', papelAzulBg: '#EFF6FF', papelRojo: '#DC2626', papelRojoBg: '#FEF2F2',
      papelRojoLinea: '#FECACA', papelVerde: '#16A34A', papelVerdeBg: '#F0FDF4', papelVerdeTx: '#166534',
      papelAmbar: '#D97706', papelAmbarBg: '#FFFBEB', papelAmbarLinea: '#FDE68A', papelWhats: '#128C7E',
      tinta1: '#111827', tinta2: '#475569', tinta3: '#5B6B82', tinta4: '#94A3B8',
      tinta5: '#374151', tintaNavy: '#0F172A', papelNavy: '#0F172A', papelNavy2: '#1E293B',
      tonoDanger300: '#FCA5A5',
      chatWarnBg: '#1A1A0A',
      chatOkBg: '#0A1A0A',
      chatDangerBg: '#1A0A0A',
      chatDangerBtn: '#2A1515',
      chatMineBg: '#1A1A2A',
      chatMineLine: '#3D3D6D',
      chatInfoBg: '#1B1B2B',
      chatInfoText: '#BDBDFF',
      toggleOn: '#1A5C3A',
      surfaceAlt: '#1A1A1A',
      navAlt: '#111111',
      onStrong: '#FFFFFF',
      papelOnVerde: '#0B1F13',
      tintaNavyTx: '#94A3B8',
      marcaCian: '#6EA8FE', marcaAzul: '#2F5FB5', marcaCobalto: '#2B3040', marcaFaceta: '#7B9CCC', marcaFacetaOsc: '#1F232D',
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
      tonoDanger950: '#FEF2F2', tonoDanger900: '#FEE2E2', tonoDanger800: '#FCA5A5', tonoDanger700: '#F87171',
      tonoDanger200: '#991B1B', tonoDanger100: '#7F1D1D', tonoOk900: '#DCFCE7', tonoOk700: '#86EFAC',
      tonoYellow900: '#FEF9C3', tonoYellow700: '#A16207', tonoYellow600: '#B45309', tonoYellow300: '#854D0E',
      tonoAmber900: '#FEF3C7', tonoAmber700: '#B45309', tonoAmber300: '#92400E', tonoOrange700: '#FDBA74',
      tonoOrange400: '#9A3412', tonoBlue950: '#EFF6FF', tonoBlue900: '#DBEAFE', tonoBlue400: '#1D4ED8',
      tonoPurple600: '#7E22CE', tonoPurple700: '#6B21A8', tonoIndigo700: '#3730A3', tonoSlate800: '#E2E8F0',
      tonoSlate700: '#CBD5E1', tonoSlate600: '#475569', tonoSlate300: '#CBD5E1', tonoSlate200: '#E2E8F0',
      tonoInk: '#111827', onYellow: '#FFFFFF', stOk: '#166534', stDanger: '#B91C1C',
      stWarn: '#92400E', stNeutral: '#475569', papel: '#FFFFFF', papelBg: '#F0F4F8',
      papelSoft: '#F8FAFC', papelLinea: '#E2E8F0', papelLinea2: '#F1F5F9', papelLinea3: '#CBD5E1',
      papelAzul: '#1D4ED8', papelAzulBg: '#EFF6FF', papelRojo: '#DC2626', papelRojoBg: '#FEF2F2',
      papelRojoLinea: '#FECACA', papelVerde: '#16A34A', papelVerdeBg: '#F0FDF4', papelVerdeTx: '#166534',
      papelAmbar: '#D97706', papelAmbarBg: '#FFFBEB', papelAmbarLinea: '#FDE68A', papelWhats: '#128C7E',
      tinta1: '#111827', tinta2: '#475569', tinta3: '#5B6B82', tinta4: '#94A3B8',
      tinta5: '#374151', tintaNavy: '#0F172A', papelNavy: '#0F172A', papelNavy2: '#1E293B',
      tonoDanger300: '#B91C1C',
      chatWarnBg: '#FEF9C3',
      chatOkBg: '#DCFCE7',
      chatDangerBg: '#FEE2E2',
      chatDangerBtn: '#FEE2E2',
      chatMineBg: '#EEF2FF',
      chatMineLine: '#A5B4FC',
      chatInfoBg: '#EEF2FF',
      chatInfoText: '#3730A3',
      toggleOn: '#16A34A',
      surfaceAlt: '#F1F4F8',
      navAlt: '#FFFFFF',
      onStrong: '#FFFFFF',
      papelOnVerde: '#0B1F13',
      tintaNavyTx: '#94A3B8',
      marcaCian: '#1D4ED8', marcaAzul: '#1D4ED8', marcaCobalto: '#DDE3EB', marcaFaceta: '#2563EB', marcaFacetaOsc: '#E8EDF3',
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
      tonoDanger950: '#2B0000', tonoDanger900: '#3D0F0F', tonoDanger800: '#FF8A8A', tonoDanger700: '#FF8A8A',
      tonoDanger200: '#FFC9C9', tonoDanger100: '#FFE0E0', tonoOk900: '#0B2E1A', tonoOk700: '#5CFF9A',
      tonoYellow900: '#2E2500', tonoYellow700: '#FFD60A', tonoYellow600: '#FFD60A', tonoYellow300: '#FFE95C',
      tonoAmber900: '#2E1C00', tonoAmber700: '#FFD60A', tonoAmber300: '#FFE95C', tonoOrange700: '#FFB066',
      tonoOrange400: '#FFB066', tonoBlue950: '#0A1A33', tonoBlue900: '#1A3A5C', tonoBlue400: '#8AD0FF',
      tonoPurple600: '#C4B5FD', tonoPurple700: '#DDD6FE', tonoIndigo700: '#C4B5FD', tonoSlate800: '#1A1A1A',
      tonoSlate700: '#262626', tonoSlate600: '#D6D6D6', tonoSlate300: '#B3B3B3', tonoSlate200: '#FFFFFF',
      tonoInk: '#000000', onYellow: '#000000', stOk: '#5CFF9A', stDanger: '#FF8A8A',
      stWarn: '#FFD60A', stNeutral: '#D6D6D6', papel: '#0A0A0A', papelBg: '#000000',
      papelSoft: '#121212', papelLinea: '#B3B3B3', papelLinea2: '#262626', papelLinea3: '#E0E0E0',
      papelAzul: '#FFD60A', papelAzulBg: '#1A3A5C', papelRojo: '#FF8A8A', papelRojoBg: '#3D0F0F',
      papelRojoLinea: '#FF8A8A', papelVerde: '#5CFF9A', papelVerdeBg: '#0B2E1A', papelVerdeTx: '#5CFF9A',
      papelAmbar: '#FFD60A', papelAmbarBg: '#2E2500', papelAmbarLinea: '#FFD60A', papelWhats: '#5CFF9A',
      tinta1: '#FFFFFF', tinta2: '#F0F0F0', tinta3: '#D6D6D6', tinta4: '#BDBDBD',
      tinta5: '#F0F0F0', tintaNavy: '#FFFFFF', papelNavy: '#000000', papelNavy2: '#1A1A1A',
      tonoDanger300: '#FFC9C9',
      chatWarnBg: '#2E2500',
      chatOkBg: '#0B2E1A',
      chatDangerBg: '#3D0F0F',
      chatDangerBtn: '#3D0F0F',
      chatMineBg: '#1A1A33',
      chatMineLine: '#C4B5FD',
      chatInfoBg: '#1A1A33',
      chatInfoText: '#DDD6FE',
      toggleOn: '#5CFF9A',
      surfaceAlt: '#121212',
      navAlt: '#000000',
      onStrong: '#000000',
      papelOnVerde: '#000000',
      tintaNavyTx: '#F0F0F0',
      marcaCian: '#FFD60A', marcaAzul: '#FFD60A', marcaCobalto: '#262626', marcaFaceta: '#8AD0FF', marcaFacetaOsc: '#1A1A1A',
    },
  },
};

/**
 * ESTIA Isotipo: la identidad geométrica del isotipo oficial (rejilla isométrica 30°/90°, bisel a 30° en vez de radio, elevación dura,
 * degradado cian→cobalto solo decorativo). Parte de ESTIA para los tonos de estado/papel (mismos valores) y cambia la paleta azul marino.
 * Ver docs/IDENTIDAD-ISOTIPO.md. En preparación: solo ADMIN y SOPORTE (SKINS_EN_PREPARACION).
 */
const ISOTIPO: DefSkin = {
  nombre: 'ESTIA Isotipo',
  descripcion: 'Azul marino con la geometría del isotipo: biseles a 30°, rejilla isométrica y degradado cian a cobalto.',
  alfaTextoMin: 0,
  tokens: {
    ...SKINS_BASE.estia.tokens,
    bg: '#050B1A', nav: '#071231', surface1: '#0A1838', field: '#0E2048', surface2: '#12285A', surface3: '#1C3A7C', surface4: '#2448A0',
    border: '#24407F', borderField: '#7C9AE0',
    text1: '#F2F6FF', text2: '#BCC9E8', text3: '#9AAAD2',
    accent: '#35C8E0', onAccent: '#04101F', link: '#6ED7EC',
    btn: '#0A63E6', btnHover: '#0A3FA8', onSolid: '#FFFFFF',
    ok: '#4CC38A', danger: '#FF8A80', warn: '#F2B84B',
    okSolid: '#1B7450', dangerSolid: '#B3372F', warnSolid: '#8A5A0A',
    okSoft: '#0B2A25', dangerSoft: '#34141C',
    focus: '#FFD60A',
    canvas: '#060E24', panel: '#081433', popover: '#0C1C45', textSoft: '#C9D6F2', textBright: '#F2F6FF',
    accentAlt: '#6C98F2', chip: '#12306B', modal: '#0A1838', viz5: '#7E8AA8', viz6: '#4A5578',
    marcaCian: '#00ABC6', marcaAzul: '#0057A6', marcaCobalto: '#0A2BA5', marcaFaceta: '#3973F9', marcaFacetaOsc: '#004281',
  },
};

export const SKINS: Record<SkinId, DefSkin> = { ...SKINS_BASE, isotipo: ISOTIPO };

const FORMA_NEUTRA: Forma = {
  biselL: '0px', biselA: '0px', elevX: '0px', elevY: '0px',
  fuenteUi: "'Inter', system-ui, sans-serif", fuenteNum: "'Inter', system-ui, sans-serif", movDur: '150ms',
};

/** Forma de cada skin. Las existentes, neutras; Isotipo: bisel 24×14 (30°), elevación dura a 30° de 8 px, Montserrat en las cifras. */
export const FORMAS: Record<SkinId, Forma> = {
  estia: FORMA_NEUTRA,
  oscuro: FORMA_NEUTRA,
  claro: FORMA_NEUTRA,
  contraste: FORMA_NEUTRA,
  isotipo: {
    biselL: '24px', biselA: '14px', elevX: '7px', elevY: '4px',
    fuenteUi: "'Inter', system-ui, sans-serif", fuenteNum: "'Montserrat', 'Inter', system-ui, sans-serif", movDur: '160ms',
  },
};

/** Skins que se ofrecen a todos los usuarios (el orden es el de la pantalla de Apariencia). */
export const SKINS_VISIBLES: SkinId[] = ['estia', 'oscuro'];

/** Skins ya definidas pero aún no ofrecidas a todos: solo para estos roles hasta terminar las olas 2 a 4. (El backend repite la lista: users/ui-prefs.util.ts.) */
export const SKINS_EN_PREPARACION: SkinId[] = ['claro', 'contraste', 'isotipo'];
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
    '\n' + Object.entries(FORMAS[id]).map(([k, v]) => `  ${nombreVar(k)}: ${v};`).join('\n') +
    `\n  --alfa-texto-min: ${SKINS[id].alfaTextoMin};\n}\n`;
  return (
    '/* GENERADO desde src/core/theme/skins.ts — no editar a mano. Para regenerar: npm run skins:css */\n' +
    bloque(':root, [data-skin="estia"]', 'estia') +
    bloque('[data-skin="oscuro"]', 'oscuro') +
    bloque('[data-skin="claro"]', 'claro') +
    bloque('[data-skin="contraste"]', 'contraste') +
    bloque('[data-skin="isotipo"]', 'isotipo') +
    // Impresión (recibos, cortes): siempre sobre papel claro, sea cual sea la skin. Gana a [data-skin=…] por especificidad (html[data-skin]).
    '@media print {\n' + bloque('html, html[data-skin]', 'claro') + '}\n'
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
