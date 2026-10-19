// Guía de inicio de la prueba como wizard POR GIRO. Lógica pura (sin React): qué pasos tiene cada giro, cuáles se marcan solos con el avance real
// del negocio (GET /prueba/progreso), el texto de «estado vacío» de cada paso y sus accesos directos. Los giros sin pasos propios usan el genérico.
// Las rutas son las del ERP (App.tsx); no se inventa ninguna pantalla.
import type { NipSocio, Progreso } from './pruebaLogic';

/** Avance real del negocio (conteos de SU tenant; lo calcula el servidor). */
export interface ProgresoNegocio {
  categorias: number;
  productos: number;
  usuarios: number;
  turnos: number;
  turnosCerrados: number;
  ventas: number;
  /** true = el negocio sigue vacío: se pueden cargar los datos de ejemplo. */
  puedeCargarEjemplo: boolean;
}

export function esProgresoNegocio(x: any): x is ProgresoNegocio {
  return !!x && ['categorias', 'productos', 'usuarios', 'turnos', 'turnosCerrados', 'ventas'].every((k) => typeof x[k] === 'number' && x[k] >= 0) && typeof x.puedeCargarEjemplo === 'boolean';
}

export interface AccesoGuia { texto: string; ruta: string }

export interface PasoGuia {
  id: string;
  titulo: string;
  detalle: string;
  /** Qué ver cuando el negocio todavía no tiene lo que este paso necesita (estado vacío útil). */
  vacio?: string;
  ruta: string;
  accesos: AccesoGuia[];
  /** Si existe, el paso se marca solo cuando el avance real lo cumple. Sin ella, se marca a mano. */
  auto?: (p: ProgresoNegocio) => boolean;
}

const ROLES_POR_GIRO: Record<string, string> = {
  gimnasio: 'GERENTE, RECEPCION (cobra y registra entradas) y CAJERO',
  restaurante: 'GERENTE, CAJERO, MESERO y CAPITAN',
  retail: 'GERENTE y CAJERO',
  generico: 'GERENTE y CAJERO',
};

type Fabrica = (giro: string) => PasoGuia;

const PASOS: Record<string, Fabrica> = {
  categoria: () => ({
    id: 'categoria', titulo: 'Crea tu primera categoría',
    detalle: 'En POS, sección «Categorías», crea una para agrupar lo que vendes.',
    vacio: 'Aún no tienes categorías. Crea la primera o carga los datos de ejemplo.',
    ruta: '/pos', accesos: [{ texto: 'Ir a POS', ruta: '/pos' }], auto: (p) => p.categorias > 0,
  }),
  productos: (g) => ({
    id: 'productos', titulo: g === 'gimnasio' ? 'Agrega tus productos y servicios' : 'Agrega tus productos',
    detalle: 'En POS, sección «Productos», da de alta lo que vendes con su precio. Los precios van sin IVA: el sistema suma el 16 %.',
    vacio: 'Aún no tienes productos: sin ellos no hay qué vender. Agrega el primero o carga los datos de ejemplo.',
    ruta: '/pos', accesos: [{ texto: 'Ir a POS', ruta: '/pos' }], auto: (p) => p.productos > 0,
  }),
  insumos: () => ({
    id: 'insumos', titulo: 'Registra tus insumos',
    detalle: 'En Costos, da de alta los insumos con su unidad y costo: son la base de tus recetas.',
    ruta: '/costs', accesos: [{ texto: 'Ir a Costos', ruta: '/costs' }],
  }),
  recetas: () => ({
    id: 'recetas', titulo: 'Arma tus recetas',
    detalle: 'En Costos, define qué insumos lleva cada platillo para conocer su costo y descontar existencias al vender.',
    ruta: '/costs', accesos: [{ texto: 'Ir a Costos', ruta: '/costs' }],
  }),
  planes: () => ({
    id: 'planes', titulo: 'Crea tus planes de membresía',
    detalle: 'En Membresías define cada plan con su precio y su periodo (mensual, anual…).',
    ruta: '/membresias', accesos: [{ texto: 'Ir a Membresías', ruta: '/membresias' }],
  }),
  usuarios: (g) => ({
    id: 'usuarios', titulo: 'Da de alta a tu equipo con su rol',
    detalle: `En Usuarios agrega a tu equipo y elige su rol: ${ROLES_POR_GIRO[g] ?? ROLES_POR_GIRO.generico}. Tu prueba admite hasta 5 usuarios.`,
    vacio: 'Por ahora solo estás tú. Agrega a quien va a cobrar o atender y asígnale su rol.',
    ruta: '/users', accesos: [{ texto: 'Ver los roles', ruta: '/roles' }], auto: (p) => p.usuarios > 1,
  }),
  turno: () => ({
    id: 'turno', titulo: 'Abre tu turno',
    detalle: 'En POS abre el turno con un fondo de caja, por ejemplo $500.',
    vacio: 'Sin turno abierto no se puede cobrar. Ábrelo en POS.',
    ruta: '/pos', accesos: [{ texto: 'Ir a POS', ruta: '/pos' }], auto: (p) => p.turnos > 0,
  }),
  mesa: () => ({
    id: 'mesa', titulo: 'Abre una cuenta de mesa',
    detalle: 'En Mesas abre una cuenta, agrega platillos y envíalos a cocina; en la pantalla de cocina verás la comanda.',
    ruta: '/mesas', accesos: [{ texto: 'Ir a Mesas', ruta: '/mesas' }, { texto: 'Pantalla de cocina', ruta: '/cocina' }],
  }),
  venta: (g) => ({
    id: 'venta', titulo: 'Haz tu primera venta',
    detalle: g === 'gimnasio' ? 'En POS agrega una bebida o un pase al ticket y cobra en efectivo.' : 'En POS agrega productos al ticket y cobra. El corte la incluirá.',
    vacio: 'Aún no has vendido nada: agrega un producto al ticket y cobra.',
    ruta: '/pos', accesos: [{ texto: 'Ir a POS', ruta: '/pos' }], auto: (p) => p.ventas > 0,
  }),
  membresia: () => ({
    id: 'membresia', titulo: 'Cobra una membresía',
    detalle: 'En Membresías cobra un plan a un socio. Con los datos de ejemplo, el plan Mensual cuesta $580.00 con IVA.',
    ruta: '/membresias', accesos: [{ texto: 'Ir a Membresías', ruta: '/membresias' }],
  }),
  checkin: () => ({
    id: 'checkin', titulo: 'Registra una entrada',
    detalle: 'En Check-in escribe el n.º de socio. Con los datos de ejemplo es el 1 y su NIP se muestra al cargarlos.',
    ruta: '/membresias', accesos: [{ texto: 'Ir a Check-in', ruta: '/membresias' }],
  }),
  corte: () => ({
    id: 'corte', titulo: 'Haz el corte',
    detalle: 'Precorte y cierre de turno (corte Z): tus ventas aparecen en el total de caja.',
    vacio: 'Cuando termines de vender, cierra el turno para ver tu corte.',
    ruta: '/pos', accesos: [{ texto: 'Ir a POS', ruta: '/pos' }], auto: (p) => p.turnosCerrados > 0,
  }),
};

/** Orden de los pasos por giro. «insumos» y «recetas» entran solo si el negocio tiene el módulo de Costos (el plan PRUEBA hoy no lo trae). */
const ORDEN: Record<string, string[]> = {
  gimnasio: ['categoria', 'productos', 'planes', 'usuarios', 'turno', 'venta', 'membresia', 'checkin', 'corte'],
  restaurante: ['categoria', 'productos', 'insumos', 'recetas', 'usuarios', 'turno', 'mesa', 'venta', 'corte'],
  retail: ['categoria', 'productos', 'usuarios', 'turno', 'venta', 'corte'],
  generico: ['categoria', 'productos', 'usuarios', 'turno', 'venta', 'corte'],
};
const SOLO_CON_COSTOS = ['insumos', 'recetas'];

/** Giros con pasos propios; cualquier otro usa el genérico. */
export const GIROS_CON_GUIA = Object.keys(ORDEN);

export function pasosDeGiro(giro: string | null | undefined, opts: { costos?: boolean } = {}): PasoGuia[] {
  const g = giro && ORDEN[giro] ? giro : 'generico';
  return ORDEN[g].filter((id) => opts.costos === true || !SOLO_CON_COSTOS.includes(id)).map((id) => PASOS[id](g));
}

/** ¿Hecho? A mano, o solo porque el avance real del negocio ya lo cumple. */
export function pasoHecho(p: PasoGuia, manual: Progreso, real: ProgresoNegocio | null): boolean {
  return manual[p.id] === true || (!!real && !!p.auto && p.auto(real));
}

/** Los pasos que se marcan solos no se desmarcan a mano. */
export const esAutomatico = (p: PasoGuia): boolean => typeof p.auto === 'function';

/** Texto de estado vacío que corresponde mostrar ahora (solo si hay avance real y el paso aún no se cumple). */
export function textoVacio(p: PasoGuia, real: ProgresoNegocio | null): string | null {
  if (!real || !p.auto || !p.vacio) return null;
  return p.auto(real) ? null : p.vacio;
}

export const hechosGuia = (pasos: readonly PasoGuia[], manual: Progreso, real: ProgresoNegocio | null): number => pasos.filter((p) => pasoHecho(p, manual, real)).length;

/** Índice del primer paso pendiente (o el último si todo está hecho). */
export function pasoActualGuia(pasos: readonly PasoGuia[], manual: Progreso, real: ProgresoNegocio | null): number {
  const i = pasos.findIndex((p) => !pasoHecho(p, manual, real));
  return i === -1 ? Math.max(0, pasos.length - 1) : i;
}

/** Texto de un paso; el de check-in incluye el NIP del socio de ejemplo solo si se conoce en esta pestaña. */
export function detallePaso(p: PasoGuia, nip: NipSocio | null): string {
  if (p.id !== 'checkin') return p.detalle;
  return nip
    ? `En Check-in escribe el n.º de socio ${nip.numero} o su NIP ${nip.nip}: debe salir en verde.`
    : p.detalle;
}

/** Resumen de lo que sembró «Cargar datos de ejemplo». */
export function resumenEjemplo(r: { categorias?: number; productos?: number; planes?: number; socios?: number }): string {
  const partes = [`${r.categorias ?? 0} categorías`, `${r.productos ?? 0} productos`];
  if ((r.planes ?? 0) > 0) partes.push(`${r.planes} planes de membresía`);
  if ((r.socios ?? 0) > 0) partes.push(`${r.socios} socio de ejemplo`);
  return `Listo: cargamos ${partes.join(', ')}.`;
}
