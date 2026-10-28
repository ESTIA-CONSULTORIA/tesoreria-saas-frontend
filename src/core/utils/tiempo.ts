// Única forma de mostrar horas y fechas de operación (turnos, cortes, ventas): siempre en la zona del negocio (America/Tijuana), sin
// importar la zona del navegador ni la del servidor (UTC). Antes la apertura salía en UTC (horaApertura del servidor) y el cierre en la
// hora local del navegador, y el cierre aparecía antes que la apertura.
export const ZONA_NEGOCIO = 'America/Tijuana';

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
