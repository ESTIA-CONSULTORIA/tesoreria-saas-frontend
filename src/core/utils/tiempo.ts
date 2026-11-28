// Única forma de mostrar horas y fechas de operación (turnos, cortes, ventas): siempre en la zona del negocio (America/Tijuana), sin
// importar la zona del navegador ni la del servidor (UTC). Antes la apertura salía en UTC (horaApertura del servidor) y el cierre en la
// hora local del navegador, y el cierre aparecía antes que la apertura.
/** Zona del negocio (America/Tijuana por defecto). El servidor la entrega al iniciar sesión y la pantalla la fija con fijarZonaNegocio(). */
export let ZONA_NEGOCIO = 'America/Tijuana';
export function fijarZonaNegocio(zona?: string | null): void {
  if (typeof zona !== 'string' || !zona) return;
  try { new Intl.DateTimeFormat('es-MX', { timeZone: zona }); ZONA_NEGOCIO = zona; } catch { /* zona desconocida: se queda la actual */ }
}

type Instante = string | number | Date | null | undefined;

function aFecha(valor: Instante): Date | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** «16:45» (24 h). Vacío si no hay instante válido. */
export function formatoHora(valor: Instante, conSegundos = false): string {
  const d = aFecha(valor);
  if (!d) return '';
  return d.toLocaleTimeString('es-MX', { timeZone: ZONA_NEGOCIO, hour12: false, hour: '2-digit', minute: '2-digit', ...(conSegundos ? { second: '2-digit' } : {}) });
}

/** «27/10/2026». */
export function formatoFecha(valor: Instante): string {
  const d = aFecha(valor);
  if (!d) return '';
  return d.toLocaleDateString('es-MX', { timeZone: ZONA_NEGOCIO, day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** «27/10/2026 16:45». */
export function formatoFechaHora(valor: Instante): string {
  const d = aFecha(valor);
  if (!d) return '';
  return `${formatoFecha(d)} ${formatoHora(d)}`;
}

interface TurnoConHoras {
  fecha?: string | null;
  horaApertura?: string | null;
  horaCierre?: string | null;
  abiertoEn?: string | null;
  cerradoEn?: string | null;
}

/** Instante de apertura: abiertoEn; si el turno es de antes de esa columna, fecha + horaApertura (el servidor las guardaba en UTC). */
export function aperturaDelTurno(t: TurnoConHoras | null | undefined): Date | null {
  if (!t) return null;
  const real = aFecha(t.abiertoEn);
  if (real) return real;
  const dia = typeof t.fecha === 'string' ? t.fecha.slice(0, 10) : '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dia) && t.horaApertura) return aFecha(`${dia}T${t.horaApertura.slice(0, 8)}Z`);
  return null;
}

/** Instante de cierre. Con el respaldo, si la hora de cierre resulta anterior a la apertura el turno cruzó la medianoche UTC: suma un día. */
export function cierreDelTurno(t: TurnoConHoras | null | undefined): Date | null {
  if (!t) return null;
  const real = aFecha(t.cerradoEn);
  if (real) return real;
  const dia = typeof t.fecha === 'string' ? t.fecha.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !t.horaCierre) return null;
  const cierre = aFecha(`${dia}T${t.horaCierre.slice(0, 8)}Z`);
  const apertura = aperturaDelTurno(t);
  if (cierre && apertura && cierre.getTime() < apertura.getTime()) return new Date(cierre.getTime() + 24 * 60 * 60 * 1000);
  return cierre;
}

/** «8 min», «1 h 05 min». Vacío si falta alguno de los dos instantes o el orden es imposible. */
export function formatoDuracion(desde: Instante, hasta: Instante): string {
  const a = aFecha(desde);
  const b = aFecha(hasta);
  if (!a || !b || b.getTime() < a.getTime()) return '';
  const min = Math.round((b.getTime() - a.getTime()) / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

// ───────── Días calendario «YYYY-MM-DD» en la zona del negocio (nunca en UTC) ─────────
// `new Date().toISOString().slice(0, 10)` es la fecha UTC: después de las 16:00 en Baja California ya es el día siguiente.

/** «2026-11-27»: el día de ese instante en la zona del negocio. */
export function fechaYmd(valor?: Instante): string {
  const d = aFecha(valor ?? new Date());
  if (!d) return '';
  return d.toLocaleDateString('en-CA', { timeZone: ZONA_NEGOCIO, year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** Hoy en la zona del negocio. */
export const hoyYmd = (): string => fechaYmd(new Date());

/** Suma días a un día calendario «YYYY-MM-DD» (sin horas de por medio). */
export function sumarDiasYmd(ymd: string, dias: number): string {
  const [a, m, d] = ymd.split('-').map(Number);
  return ymdDe(a, m - 1, d + dias);
}

/** «YYYY-MM-DD» de un año, un mes (0 a 11) y un día; acepta desbordes (día 0 = último del mes anterior). */
export function ymdDe(anio: number, mes0: number, dia: number): string {
  const f = new Date(Date.UTC(anio, mes0, dia));
  return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`;
}

/** «27/11/2026» de una fecha sola «YYYY-MM-DD» (sin convertir de zona: ya es un día calendario). */
export function formatoDiaYmd(ymd: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(ymd ?? '');
}

/** Fecha de una venta: el instante real si lo trae (en la zona del negocio); si no, su día calendario. */
export function fechaDeVenta(v: { createdAt?: string | null; fecha?: string | null }): string {
  return v.createdAt ? formatoFechaHora(v.createdAt) : formatoDiaYmd(v.fecha);
}
