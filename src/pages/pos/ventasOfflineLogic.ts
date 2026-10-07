// Lógica pura de la pantalla de ventas offline fallidas (sin React ni HTTP): se prueba con specs.
// OJO: aquí solo se decide qué se muestra y qué botón aplica. El servidor decide siempre, recalcula al precio vigente y
// registra quién resolvió; el precio del cliente (lo que quedó guardado en el dispositivo) nunca se acepta.

export interface ItemEvaluado {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioCliente: number | null;
  precioVigente: number | null;
}

export interface EvaluacionVenta {
  folio: string;
  valida: boolean;
  motivo: string | null;
  yaExiste: boolean;
  cobrado: number;
  totalCliente: number | null;
  totalNuevo: number | null;
  diferencia: number | null; // > 0: el cobro no alcanza
  cubre: boolean;
  items: ItemEvaluado[];
}

export type AccionRegistrar = 'registrar' | 'confirmar' | 'no_disponible' | 'ya_registrada';

// Registrar al precio vigente: directo solo si el cobro cubre el total nuevo; si no, solo con la confirmación explícita de la
// diferencia (el servidor la absorbe como cortesía autorizada por quien confirma).
export function accionRegistrar(ev: EvaluacionVenta | null | undefined): AccionRegistrar {
  if (!ev || !ev.valida) return 'no_disponible';
  if (ev.yaExiste) return 'ya_registrada';
  return ev.cubre ? 'registrar' : 'confirmar';
}

export const MOTIVO_MIN = 5;
export const motivoDescarteValido = (m: string): boolean => m.trim().length >= MOTIVO_MIN;

export interface OpFallida {
  id?: number;
  error?: string;
  payload: { folio?: string; tenantId?: string; cajero?: string; total?: number; formasPago?: Array<{ monto?: number }>; clientTimestamp?: string };
}

export function motivoVisible(op: OpFallida, ev?: EvaluacionVenta | null): string {
  if (op.error) return op.error;
  if (ev && !ev.valida && ev.motivo) return ev.motivo;
  if (ev && ev.valida && !ev.cubre) return 'El cobro no cubre el total al precio vigente.';
  return 'Sin motivo registrado (se rechazó antes de que el motor guardara el motivo).';
}

// La cola vive en el dispositivo: si el mismo equipo se usó con otro negocio, esas ventas no se muestran aquí (y el servidor
// las rechazaría de todos modos).
export const esDelTenant = (op: OpFallida, tenantId: string | null | undefined): boolean => !!tenantId && op.payload?.tenantId === tenantId;

export function cobradoDelPayload(payload: OpFallida['payload']): number {
  const pagos = Array.isArray(payload?.formasPago) ? payload.formasPago : [];
  return Math.round(pagos.reduce((s, p) => s + (Number(p?.monto) > 0 ? Number(p.monto) : 0), 0) * 100) / 100;
}

export const dinero = (n: number | null | undefined): string =>
  n === null || n === undefined ? '—' : `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
