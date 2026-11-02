// Lógica pura de los bloques «Facturas vencidas» y «Transferencias pendientes» de la pestaña Alertas de Tesorería (sin React: se prueba aparte).

export interface AlertaApi {
  concept?: string | null;
  amount?: number | string | null;
  date?: string | Date | null; // fecha del movimiento/traslado que originó la alerta
}

export interface FilaAlerta {
  concepto: string;
  monto: number;
  /** Días transcurridos desde la fecha de la alerta (0 = hoy); null si la fecha falta o no es válida. */
  dias: number | null;
}

const MS_DIA = 86_400_000;

export function diasDesde(fecha: string | Date | null | undefined, ahora: Date = new Date()): number | null {
  if (!fecha) return null;
  const t = new Date(fecha).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((ahora.getTime() - t) / MS_DIA));
}

/** Filas listas para mostrar: más antiguas primero (las que no tienen fecha, al final) y a igual antigüedad, de mayor a menor monto. */
export function filasDeAlertas(items: AlertaApi[] | null | undefined, ahora: Date = new Date()): FilaAlerta[] {
  const filas = (Array.isArray(items) ? items : []).map((a) => {
    const monto = Number(a?.amount);
    return {
      concepto: String(a?.concept ?? '').trim() || 'Sin concepto',
      monto: Number.isFinite(monto) ? monto : 0,
      dias: diasDesde(a?.date, ahora),
    };
  });
  return filas.sort((x, y) => {
    if (x.dias === null && y.dias !== null) return 1;
    if (y.dias === null && x.dias !== null) return -1;
    return (y.dias ?? 0) - (x.dias ?? 0) || y.monto - x.monto;
  });
}

export function resumenDeFilas(filas: FilaAlerta[]): { cuenta: number; total: number } {
  return { cuenta: filas.length, total: filas.reduce((s, f) => s + f.monto, 0) };
}

export const formatoMonto = (n: number): string =>
  '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** «hoy», «1 d», «12 d»; «—» si no hay fecha. */
export const textoDias = (dias: number | null): string => (dias === null ? '—' : dias === 0 ? 'hoy' : `${dias} d`);

/** Texto para lectores de pantalla: «12 días de vencida». `adjetivo` = «vencida» / «pendiente». */
export function dichoDias(dias: number | null, adjetivo: string): string {
  if (dias === null) return `Sin fecha`;
  if (dias === 0) return `${adjetivo} desde hoy`;
  return `${dias} ${dias === 1 ? 'día' : 'días'} de ${adjetivo}`;
}

export const conteoTexto = (cuenta: number, singular: string, plural: string): string => `${cuenta} ${cuenta === 1 ? singular : plural}`;
