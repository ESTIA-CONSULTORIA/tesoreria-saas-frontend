// Reglas puras (con spec) de la autorización de cortesías y de descuentos sobre el límite del rol. El servidor decide todo; esto solo
// evita pedir autorización de más y detecta que el ticket cambió después de autorizar.

// Límite de descuento por ítem de cada rol (espejo informativo de TOPE_DESCUENTO_PCT del servidor). Administrador y gerente no tienen.
export const TOPE_DESCUENTO_ROL: Record<string, number> = { CAJERO: 10, CAPITAN: 20, RECEPCION: 10 };
export const topeDescuento = (rol?: string): number => TOPE_DESCUENTO_ROL[rol ?? ''] ?? Number.POSITIVE_INFINITY;

interface LineaTicket {
  productoId: string;
  cantidad: number;
  descuento?: number;
  precioUnitario?: number | string;
}

const redondea2 = (n: number) => Math.round(n * 100) / 100;

/** Las líneas a las que se ligó la autorización: si cambian (cantidad, descuento, productos) hay que autorizar de nuevo. */
export function firmaTicket(items: LineaTicket[]): string {
  return JSON.stringify(items.map((i) => [i.productoId, Number(i.cantidad), redondea2(Number(i.descuento || 0))]));
}

/** Descuento por ítem, en %, que produce lo que se está pidiendo (porcentaje, o monto fijo por ítem). */
export function descuentoPedidoPct(tipo: 'percentage' | 'fixed', valor: number, objetivo: LineaTicket[]): number {
  if (!(valor > 0) || objetivo.length === 0) return 0;
  if (tipo === 'percentage') return redondea2(valor);
  return redondea2(Math.max(...objetivo.map((i) => (valor / (i.cantidad * Number(i.precioUnitario) || 1)) * 100)));
}

/** ¿Este ticket necesita el token de un gerente? Una cortesía de quien no es gerente/admin, o un descuento por encima de su límite. */
export function ticketRequiereAutorizacion(p: { puedeCortesia: boolean; hayFormaCortesia: boolean; items: LineaTicket[]; rol?: string }): boolean {
  if (p.puedeCortesia) return false;
  const tope = topeDescuento(p.rol);
  return p.hayFormaCortesia || p.items.some((i) => Number(i.descuento ?? 0) > tope);
}
