import { calcularIva, totalConIva } from '../../core/utils/iva';

// Lógica pura de la pantalla de mesas (sin React ni HTTP) para poder probarla con specs.
// OJO: lo que decide esta lógica es solo qué botones SE MUESTRAN. El backend decide siempre (política y rol) y su
// mensaje de rechazo se muestra tal cual.

export type PoliticaCobro = 'SOLO_CAJA' | 'GERENTE_EN_MESA' | 'MESERO_EN_MESA';
export type PoliticaDivision = 'GERENTE_CAPITAN_CAJERO' | 'SOLO_GERENTE' | 'TODOS';

export interface PoliticasMesas {
  politicaCobro: PoliticaCobro;
  politicaDivisionCuentas: PoliticaDivision;
  rol: string | null;
  contexto: 'CAJA' | 'MESA';
  puedeCobrar: boolean;
  puedeDividir: boolean;
  soloQuitaSinCocina: boolean;
}

export type EstadoMesa = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'DIRTY';

export interface ItemCuenta {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  notaCocinaId?: string;
  anulado?: boolean;
}

export interface PagoCuenta {
  forma: string;
  monto: number;
  itemIndexes?: number[];
  cobradoPorEmail?: string;
  origen?: 'CAJA' | 'MESA';
  dividido?: boolean;
}

export interface Cuenta {
  id: string;
  subtotal?: number;
  impuestos?: number;
  folio?: string;
  tableId: string;
  cajero?: string; // el servidor estampa aquí el mesero (email) desde el token
  total: number;
  pagado: number;
  saldoPendiente: number;
  items: ItemCuenta[];
  formasPago?: PagoCuenta[];
  createdAt?: string;
}

export interface Mesa {
  id: string;
  number: number;
  capacity: number;
  status: EstadoMesa;
  isActive?: boolean;
  areaId?: string;
}

export interface Area {
  id: string;
  name: string;
  branchId?: string;
  isActive?: boolean;
  tables?: Mesa[];
}

export const ESTADO_MESA: Record<EstadoMesa, { label: string; color: string }> = {
  AVAILABLE: { label: 'Libre', color: '#22C55E' },
  OCCUPIED: { label: 'Ocupada', color: '#EF4444' },
  RESERVED: { label: 'Reservada', color: '#F59E0B' },
  DIRTY: { label: 'Por limpiar', color: '#94A3B8' },
};

export const OPCIONES_POLITICA_COBRO: Array<{ value: PoliticaCobro; label: string; linea: string }> = [
  { value: 'SOLO_CAJA', label: 'Solo en caja (recomendado)', linea: 'La cuenta se cobra únicamente en caja; mesero y capitán la pasan a caja.' },
  { value: 'GERENTE_EN_MESA', label: 'Gerente y capitán en mesa', linea: 'Gerente, capitán y administrador también pueden cobrar en la mesa.' },
  { value: 'MESERO_EN_MESA', label: 'También el mesero en mesa', linea: 'Además de los anteriores, el mesero cobra en la mesa.' },
];

export const OPCIONES_POLITICA_DIVISION: Array<{ value: PoliticaDivision; label: string; linea: string }> = [
  { value: 'GERENTE_CAPITAN_CAJERO', label: 'Gerente, capitán y cajero (recomendado)', linea: 'Ellos dividen la cuenta; el administrador siempre puede.' },
  { value: 'SOLO_GERENTE', label: 'Solo gerente', linea: 'Solo el gerente (y el administrador) divide; cajero y capitán cobran la cuenta completa.' },
  { value: 'TODOS', label: 'Todos los que cobran', linea: 'Cualquier rol que pueda cobrar puede dividir la cuenta.' },
];

export const itemsVivos = (c: Cuenta): ItemCuenta[] => (c.items ?? []).filter((it) => !it.anulado);

// Índices (posición original en `items`) de los ítems vivos que aún no se cobran por ítems.
export function indicesPorCobrar(c: Cuenta): number[] {
  const cobrados = new Set<number>((c.formasPago ?? []).flatMap((p) => p.itemIndexes ?? []));
  return (c.items ?? []).map((it, i) => (it.anulado || cobrados.has(i) ? -1 : i)).filter((i) => i >= 0);
}

export interface Acciones {
  cobrar: boolean;
  dividir: boolean;
  cancelar: boolean;
  quitarItem: (item: ItemCuenta, indice: number) => boolean;
}

export function accionesVisibles(p: PoliticasMesas | null, c: Cuenta | null): Acciones {
  const sinPoliticas: Acciones = { cobrar: false, dividir: false, cancelar: false, quitarItem: () => false };
  if (!p || !c) return sinPoliticas;
  const cobrados = new Set<number>((c.formasPago ?? []).flatMap((x) => x.itemIndexes ?? []));
  const esMesero = p.rol === 'MESERO';
  const hayEnviados = itemsVivos(c).some((it) => !!it.notaCocinaId);
  return {
    cobrar: p.puedeCobrar,
    dividir: p.puedeCobrar && p.puedeDividir,
    // Una cuenta con pagos no se cancela; el mesero tampoco si ya salió algo a cocina o barra.
    cancelar: !(c.pagado > 0) && !(esMesero && hayEnviados),
    quitarItem: (item, i) => !item.anulado && !cobrados.has(i) && !(p.soloQuitaSinCocina && !!item.notaCocinaId),
  };
}

export function cuentaDeMesa(cuentas: Cuenta[], tableId: string): Cuenta | undefined {
  return cuentas.find((c) => c.tableId === tableId);
}

export const dinero = (n: number | string | undefined | null): string =>
  `$${(Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Mensaje real del backend (string o arreglo de class-validator); sin respuesta = problema de conexión.
export function mensajeError(e: unknown, respaldo = 'No se pudo completar la operación.'): string {
  const err = e as { response?: { data?: { message?: string | string[] } }; code?: string; message?: string };
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg) && msg.length) return msg.join('. ');
  if (typeof msg === 'string' && msg) return msg;
  if (!err?.response) return 'Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.';
  return respaldo;
}

export const MENSAJE_SIN_CONEXION = 'Sin conexión: las cuentas abiertas necesitan internet. No se guarda nada sin conexión.';

// Una operación de cuenta abierta jamás se encola: sin conexión se rechaza antes de llamar al backend.
export function asegurarConexion(online: boolean): void {
  if (!online) throw new Error(MENSAJE_SIN_CONEXION);
}

export function construirItem(p: { id: string; name: string; price: number | string }, cantidad: number): ItemCuenta {
  const precioUnitario = Number(p.price) || 0;
  return { productoId: p.id, nombre: p.name, cantidad, precioUnitario, descuento: 0, subtotal: Math.round(precioUnitario * cantidad * 100) / 100 };
}

export function totalItems(items: ItemCuenta[]): number {
  return Math.round(items.reduce((s, it) => s + it.subtotal, 0) * 100) / 100;
}

// Desglose con IVA: el mismo cálculo del POS normal (neto × 16%, a centavos). Es una vista previa: el servidor es quien
// pone el precio de catálogo y el IVA de la cuenta.
export function desgloseIva(items: ItemCuenta[]): { subtotal: number; iva: number; total: number } {
  const subtotal = totalItems(items);
  return { subtotal, iva: calcularIva(subtotal), total: totalConIva(subtotal) };
}
