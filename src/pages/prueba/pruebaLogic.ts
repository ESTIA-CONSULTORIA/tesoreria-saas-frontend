// Lógica pura de la prueba pública (PP2): configuración, validaciones, lectura del token, mensajes de error y progreso de la guía.
// Sin React ni DOM: se prueba con vitest. Las reglas espejan las del backend (prueba-publica.util.ts); el servidor valida de nuevo.

// ── configuración (variables de COMPILACIÓN de Vite; sin ellas la prueba está apagada) ──
export interface ConfigPrueba {
  /** Solo true con el interruptor encendido Y todo lo necesario presente. */
  activa: boolean;
  avisoUrl: string;
  siteKey: string;
  /** Nombres (nunca valores) de lo que falta cuando el interruptor está encendido. */
  faltantes: string[];
}

export function leerConfigPrueba(env: Record<string, string | undefined>): ConfigPrueba {
  const interruptor = env.VITE_PRUEBA_PUBLICA_ACTIVA === 'true';
  const avisoUrl = String(env.VITE_PRUEBA_AVISO_URL ?? '').trim();
  const siteKey = String(env.VITE_TURNSTILE_SITEKEY ?? '').trim();
  const faltantes: string[] = [];
  if (interruptor) {
    if (!/^https:\/\//.test(avisoUrl)) faltantes.push('VITE_PRUEBA_AVISO_URL');
    if (!siteKey) faltantes.push('VITE_TURNSTILE_SITEKEY');
  }
  return { activa: interruptor && faltantes.length === 0, avisoUrl, siteKey, faltantes };
}

// ── lo que se le dice a la persona ──
/** Única fuente de la duración que se le dice a la persona (título, activación, guía). Debe coincidir con DIAS_PRUEBA del backend. */
export const DIAS_PRUEBA = 30;

export const LIMITES = [
  { id: 'cfdi', titulo: 'Sin CFDI timbrado', detalle: 'Los comprobantes son de prueba y no tienen validez fiscal.' },
  { id: 'tarjeta', titulo: 'Sin tarjeta integrada', detalle: 'No hay terminal conectada: el cobro con tarjeta se registra a mano.' },
  { id: 'reservas', titulo: 'Sin reservas', detalle: 'Las canchas se reservan en Playtomic; aquí solo se cobra la hora de cancha.' },
] as const;

export const INCLUYE = [
  `${DIAS_PRUEBA} días con tu propio negocio de prueba`,
  'Caja, tesorería y reportes, más los módulos de tu giro, con datos de ejemplo',
  'Hasta 5 usuarios, sin tarjeta de crédito',
] as const;

/** La línea de valor bajo el título (sale de INCLUYE para que no haya dos redacciones). */
export const LINEA_VALOR = `${INCLUYE[1]}. Sin tarjeta de crédito.`;

/**
 * Giros que se ofrecen en el formulario: los que tienen alta de punta a punta en el backend (giros-prueba.ts). Tres tarjetas propias y «Otro giro»,
 * que despliega la lista de los demás giros de giros.config que sí funcionan (hoy solo el genérico). Los médicos se excluyen (ver el backend).
 */
export const GIROS_TARJETA = [
  { valor: 'gimnasio', etiqueta: 'Gimnasio / club deportivo' },
  { valor: 'restaurante', etiqueta: 'Restaurante' },
  { valor: 'retail', etiqueta: 'Tienda' },
] as const;
export const GIROS_OTROS = [{ valor: 'generico', etiqueta: 'Otro giro' }] as const;
/** Valor de la tarjeta «Otro giro» (no es un giro: abre la lista). */
export const TARJETA_OTRO = '__otro';
export const GIROS_FORM = [...GIROS_TARJETA, ...GIROS_OTROS] as const;

// ── solicitud ──
export interface SolicitudForm {
  nombre: string;
  correo: string;
  negocio: string;
  giro: string;
  aceptaAviso: boolean;
  captcha: string;
}

export type CampoSolicitud = 'nombre' | 'correo' | 'negocio' | 'giro' | 'aceptaAviso' | 'captcha';
/** Orden visual: sirve para llevar el foco al primer campo con error. */
export const ORDEN_CAMPOS: CampoSolicitud[] = ['nombre', 'correo', 'negocio', 'giro', 'aceptaAviso', 'captcha'];

export const normalizarCorreo = (c: string): string => c.trim().toLowerCase();
export const esCorreoValido = (c: string): boolean => c.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);

export function validarSolicitud(f: SolicitudForm): Partial<Record<CampoSolicitud, string>> {
  const e: Partial<Record<CampoSolicitud, string>> = {};
  if (!f.nombre.trim()) e.nombre = 'Escribe tu nombre.';
  else if (f.nombre.trim().length > 120) e.nombre = 'Máximo 120 caracteres.';
  if (!f.correo.trim()) e.correo = 'Escribe tu correo.';
  else if (!esCorreoValido(normalizarCorreo(f.correo))) e.correo = 'Escribe un correo válido (nombre@dominio.com).';
  if (!f.negocio.trim()) e.negocio = 'Escribe el nombre de tu negocio.';
  else if (f.negocio.trim().length > 120) e.negocio = 'Máximo 120 caracteres.';
  if (!GIROS_FORM.some((g) => g.valor === f.giro)) e.giro = 'Elige el giro de tu negocio.';
  if (!f.aceptaAviso) e.aceptaAviso = 'Debes aceptar el aviso de privacidad para continuar.';
  if (!f.captcha) e.captcha = 'Confirma que eres una persona.';
  return e;
}

export const primerCampoConError = (e: Partial<Record<CampoSolicitud, string>>): CampoSolicitud | null => ORDEN_CAMPOS.find((c) => e[c]) ?? null;

/** Cuerpo exacto que espera POST /prueba/solicitar. */
export const cuerpoSolicitud = (f: SolicitudForm) => ({
  correo: normalizarCorreo(f.correo),
  nombre: f.nombre.trim(),
  negocio: f.negocio.trim(),
  giro: f.giro,
  captcha: f.captcha,
  aceptaAviso: f.aceptaAviso === true,
});

// ── activación ──
/** Lee el token del fragmento de la URL (#token=…). El token va en el fragmento para no viajar al servidor web ni en el Referer. */
export function leerTokenDeHash(hash: string): string | null {
  const m = String(hash ?? '').match(/^#?(?:.*&)?token=([^&]+)/);
  if (!m) return null;
  let t: string;
  try { t = decodeURIComponent(m[1]); } catch { return null; }
  return t.length >= 20 && t.length <= 200 && /^[A-Za-z0-9_-]+$/.test(t) ? t : null;
}

export function validarPassword(p: string): string | null {
  if (p.length < 10) return 'Debe tener al menos 10 caracteres.';
  if (p.length > 128) return 'Es demasiado larga (máx. 128).';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Debe llevar letras y números.';
  return null;
}

export function validarActivacion(password: string, confirmacion: string): { password?: string; confirmacion?: string } {
  const e: { password?: string; confirmacion?: string } = {};
  const p = validarPassword(password);
  if (p) e.password = p;
  if (!e.password && password !== confirmacion) e.confirmacion = 'Las contraseñas no coinciden.';
  return e;
}

// ── errores del servidor → texto para la persona ──
export function mensajeDeError(err: any): string {
  const status: number | undefined = err?.response?.status;
  const data = err?.response?.data;
  if (status === undefined) return 'No pudimos conectar. Revisa tu internet e intenta de nuevo.';
  if (status === 404) return 'La prueba no está disponible por ahora.';
  if (status === 429) return 'Demasiadas solicitudes desde tu red. Intenta de nuevo en un rato.';
  if (status === 503 && data?.listaDeEspera) return 'Por ahora no tenemos lugar disponible. Vuelve a intentar más tarde: estamos abriendo lugares poco a poco.';
  const msg = typeof data?.message === 'string' ? data.message : Array.isArray(data?.message) ? data.message.join(' ') : '';
  if (status === 400 || status === 503) return msg || 'No pudimos procesar tu solicitud.';
  return 'Ocurrió un error. Intenta de nuevo en unos minutos.';
}

export const fechaLarga = (iso: string | Date): string =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

// ── guía de inicio (wizard): los pasos por giro viven en guia.ts; aquí el avance guardado y el NIP ──

// ── NIP del socio de ejemplo ──
// El servidor lo devuelve UNA vez al activar y NO lo guarda en claro (en la base solo queda su HMAC). Para poder mostrarlo en la guía durante
// el primer uso se conserva únicamente en sessionStorage: solo esa pestaña, desaparece al cerrarla y se borra al marcar el check-in como hecho.
export const CLAVE_NIP_SOCIO = 'prueba_socio_nip';
type AlmacenSesion = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export interface NipSocio { numero: string; nip: string }

export const esNipValido = (n: unknown): n is string => typeof n === 'string' && /^\d{4}$/.test(n);

export function guardarNipSesion(a: AlmacenSesion | null, d: { numero?: unknown; nip?: unknown }) {
  try { if (esNipValido(d.nip)) a?.setItem(CLAVE_NIP_SOCIO, JSON.stringify({ numero: String(d.numero ?? '1').slice(0, 10), nip: d.nip })); } catch { /* sin almacenamiento: la guía mostrará el texto sin NIP */ }
}
export function leerNipSesion(a: AlmacenSesion | null): NipSocio | null {
  try {
    const j = JSON.parse(a?.getItem(CLAVE_NIP_SOCIO) ?? 'null');
    return j && esNipValido(j.nip) ? { numero: String(j.numero ?? '1'), nip: j.nip } : null;
  } catch { return null; }
}
export function borrarNipSesion(a: AlmacenSesion | null) {
  try { a?.removeItem(CLAVE_NIP_SOCIO); } catch { /* nada */ }
}

// ── estado de la prueba (GET /prueba/estado) ──
export interface EstadoPrueba { esPrueba: true; estado: string; venceEn: string; diasRestantes: number; vencida: boolean; extendida: boolean }

export function esEstadoPrueba(x: any): x is EstadoPrueba {
  return !!x && x.esPrueba === true && typeof x.diasRestantes === 'number' && typeof x.venceEn === 'string' && typeof x.vencida === 'boolean';
}

export function textoDias(e: EstadoPrueba | null): string {
  if (!e) return '';
  const hasta = fechaLarga(e.venceEn);
  if (e.vencida) return `Tu prueba terminó el ${hasta}. Escríbenos para continuar.`;
  if (e.diasRestantes <= 1) return `Último día de tu prueba (hasta el ${hasta}).`;
  return `Te quedan ${e.diasRestantes} días de prueba (hasta el ${hasta}).`;
}

/** Texto corto para el botón flotante. */
export const etiquetaDias = (e: EstadoPrueba | null): string => (!e ? '' : e.vencida ? 'terminó' : e.diasRestantes <= 1 ? 'último día' : `${e.diasRestantes} d`);

export type Progreso = Record<string, boolean>;
type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

const claveProgreso = (tenantId: string) => `prueba_guia_${tenantId}`;
const claveVista = (tenantId: string) => `prueba_guia_vista_${tenantId}`;

export function cargarProgreso(a: Almacen | null, tenantId: string): Progreso {
  try {
    const raw = a?.getItem(claveProgreso(tenantId));
    const j = raw ? JSON.parse(raw) : {};
    const out: Progreso = {};
    if (j && typeof j === 'object') for (const k of Object.keys(j)) if (j[k] === true && /^[a-z][a-z_]{1,29}$/.test(k)) out[k] = true;
    return out;
  } catch {
    return {};
  }
}

export function guardarProgreso(a: Almacen | null, tenantId: string, p: Progreso) {
  try { a?.setItem(claveProgreso(tenantId), JSON.stringify(p)); } catch { /* sin almacenamiento: el avance vale solo esta sesión */ }
}

export const alternarPaso = (p: Progreso, id: string): Progreso => {
  const n = { ...p };
  if (n[id]) delete n[id]; else n[id] = true;
  return n;
};

export const pasosHechos = (p: Progreso, pasos: ReadonlyArray<{ id: string }>): number => pasos.filter((x) => p[x.id]).length;

/** Índice del primer paso pendiente (o el último si todo está hecho). */
export const pasoActual = (p: Progreso, pasos: ReadonlyArray<{ id: string }>): number => {
  const i = pasos.findIndex((x) => !p[x.id]);
  return i === -1 ? Math.max(0, pasos.length - 1) : i;
};

export function yaVioLaGuia(a: Almacen | null, tenantId: string): boolean {
  try { return a?.getItem(claveVista(tenantId)) === '1'; } catch { return true; } // si no se puede recordar, no se insiste
}
export function marcarGuiaVista(a: Almacen | null, tenantId: string) {
  try { a?.setItem(claveVista(tenantId), '1'); } catch { /* nada */ }
}

/** Mueve la selección con las flechas, sin salirse de la lista. */
export const moverSeleccion = (actual: number, delta: number, total: number): number => Math.max(0, Math.min(total - 1, actual + delta));
