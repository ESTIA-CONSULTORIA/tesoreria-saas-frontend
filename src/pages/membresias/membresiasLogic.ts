import { desgloseTicket, esTasaIva, IVA_DEFAULT, type IvaConfig } from '../../core/utils/iva';

// Lógica pura de la pantalla de membresías (sin React ni HTTP) para poder probarla con specs. El precio, el IVA y las fechas
// de vigencia los calcula SIEMPRE el servidor; aquí solo se muestran y se arma lo que se manda.

export type SituacionSocio = 'VIGENTE' | 'CONGELADA' | 'PROGRAMADA' | 'VENCIDA' | 'SIN_MEMBRESIA';
export type PeriodoTipo = 'DIAS' | 'MESES' | 'ANOS';

export interface Plan {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio: number | string;
  periodoTipo: PeriodoTipo;
  periodoCantidad: number;
  tasaIva?: string | null;
  diasCongelacionMax: number;
  beneficios?: { descuentoPct?: number; notas?: string[] };
  productId?: string | null;
  activo: boolean;
}

export interface Situacion {
  estado: SituacionSocio;
  dias?: number;
  periodo?: { id?: string; fechaInicio: string; fechaFin: string; estado: string; planNombre?: string };
}

export const ETIQUETA_SITUACION: Record<SituacionSocio, string> = {
  VIGENTE: 'Vigente',
  CONGELADA: 'Congelada',
  PROGRAMADA: 'Por comenzar',
  VENCIDA: 'Vencida',
  SIN_MEMBRESIA: 'Sin membresía',
};

export const CLASE_SITUACION: Record<SituacionSocio, string> = {
  VIGENTE: 'bg-green-900/40 text-green-300',
  CONGELADA: 'bg-sky-900/40 text-sky-300',
  PROGRAMADA: 'bg-indigo-900/40 text-indigo-300',
  VENCIDA: 'bg-red-900/40 text-red-300',
  SIN_MEMBRESIA: 'bg-slate-700 text-slate-300',
};

export function periodoTexto(tipo: PeriodoTipo, cantidad: number): string {
  const unidad = tipo === 'DIAS' ? ['día', 'días'] : tipo === 'MESES' ? ['mes', 'meses'] : ['año', 'años'];
  return cantidad === 1 ? `1 ${unidad[0]}` : `${cantidad} ${unidad[1]}`;
}

// "12 de octubre de 2026" desde YYYY-MM-DD, sin pasar por Date (evita el corrimiento de zona horaria).
export function fechaCorta(ymd?: string | null): string {
  if (!ymd) return '—';
  const [y, m, d] = ymd.split('-').map(Number);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${meses[m - 1]} ${y}`;
}

export function textoSituacion(s: Situacion): string {
  if (s.estado === 'VIGENTE') return s.dias === 0 ? 'Vence hoy' : `Vence en ${s.dias} día(s) · ${fechaCorta(s.periodo?.fechaFin)}`;
  if (s.estado === 'VENCIDA') return `Venció el ${fechaCorta(s.periodo?.fechaFin)} (hace ${s.dias} día(s))`;
  if (s.estado === 'PROGRAMADA') return `Empieza el ${fechaCorta(s.periodo?.fechaInicio)}`;
  if (s.estado === 'CONGELADA') return 'En pausa';
  return 'No ha contratado';
}

// Lo que cuesta el plan con la regla de IVA del negocio (vista previa: el servidor vuelve a calcularlo al cobrar).
export function precioDelPlan(plan: Pick<Plan, 'precio' | 'tasaIva'>, cfg: IvaConfig = IVA_DEFAULT) {
  return desgloseTicket([{ cantidad: 1, precioUnitario: Number(plan.precio), descuento: 0, tasaIva: plan.tasaIva ?? null }], cfg);
}

export type FormaPagoMembresia = 'EFECTIVO' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA';

// El cobro de una membresía es una venta normal del POS: el plan es un producto, el servidor recalcula precio, IVA y total.
export function armarCobro(p: {
  plan: Plan;
  socioId: string;
  forma: FormaPagoMembresia;
  turnoId: string;
  sucursalId: string;
  cajero: string;
  cfg?: IvaConfig;
}) {
  if (!p.plan.productId) throw new Error('El plan no tiene producto de cobro: edítalo y guárdalo de nuevo.');
  const d = precioDelPlan(p.plan, p.cfg);
  return {
    items: [{
      productoId: p.plan.productId, nombre: `Membresía: ${p.plan.nombre}`, cantidad: 1,
      precioUnitario: Number(p.plan.precio), descuento: 0, subtotal: d.base,
    }],
    subtotal: d.subtotal, descuento: 0, impuestos: d.impuestos, total: d.total,
    formasPago: [{ forma: p.forma, monto: d.total }],
    cajero: p.cajero, turnoId: p.turnoId, sucursalId: p.sucursalId, socioId: p.socioId,
  };
}

export interface PlanForm {
  nombre: string;
  descripcion: string;
  precio: string;
  periodoTipo: PeriodoTipo;
  periodoCantidad: string;
  tasaIva: string; // '' = la del negocio
  diasCongelacionMax: string;
  descuentoPct: string;
  notas: string; // un beneficio por renglón
  activo: boolean;
}

export const PLAN_FORM_VACIO: PlanForm = {
  nombre: '', descripcion: '', precio: '', periodoTipo: 'MESES', periodoCantidad: '1', tasaIva: '', diasCongelacionMax: '0',
  descuentoPct: '', notas: '', activo: true,
};

export function planAForm(p: Plan): PlanForm {
  return {
    nombre: p.nombre, descripcion: p.descripcion ?? '', precio: String(p.precio), periodoTipo: p.periodoTipo,
    periodoCantidad: String(p.periodoCantidad), tasaIva: p.tasaIva ?? '', diasCongelacionMax: String(p.diasCongelacionMax),
    descuentoPct: p.beneficios?.descuentoPct ? String(p.beneficios.descuentoPct) : '', notas: (p.beneficios?.notas ?? []).join('\n'),
    activo: p.activo,
  };
}

// Valida lo evidente antes de mandar (el servidor valida de nuevo y manda siempre).
export interface ResultadoPlanForm { ok: boolean; error: string; body: Record<string, unknown> }

export function validarPlanForm(f: PlanForm): ResultadoPlanForm {
  if (!f.nombre.trim()) return { ok: false, error: 'Escribe el nombre del plan.', body: {} };
  const precio = Number(f.precio);
  if (f.precio.trim() === '' || !Number.isFinite(precio) || precio < 0) return { ok: false, error: 'El precio debe ser un número mayor o igual a cero.', body: {} };
  const cant = Number(f.periodoCantidad);
  if (!Number.isInteger(cant) || cant <= 0) return { ok: false, error: 'La duración debe ser un entero mayor a cero.', body: {} };
  const cong = Number(f.diasCongelacionMax || 0);
  if (!Number.isInteger(cong) || cong < 0 || cong > 365) return { ok: false, error: 'Los días de congelación van de 0 a 365.', body: {} };
  const desc = f.descuentoPct.trim() === '' ? 0 : Number(f.descuentoPct);
  if (!Number.isFinite(desc) || desc < 0 || desc > 100) return { ok: false, error: 'El descuento del beneficio va de 0 a 100.', body: {} };
  if (f.tasaIva !== '' && !esTasaIva(f.tasaIva)) return { ok: false, error: 'El IVA del plan no es válido.', body: {} };
  return {
    ok: true,
    error: '',
    body: {
      nombre: f.nombre.trim(),
      descripcion: f.descripcion.trim() || null,
      precio,
      periodoTipo: f.periodoTipo,
      periodoCantidad: cant,
      tasaIva: f.tasaIva === '' ? null : f.tasaIva,
      diasCongelacionMax: cong,
      beneficios: { descuentoPct: desc, notas: f.notas.split('\n').map((l) => l.trim()).filter(Boolean) },
      activo: f.activo,
    },
  };
}

// Quién ve qué pestaña (el backend decide siempre; esto solo oculta lo que daría 403).
export function pestanasVisibles(rol: string | undefined | null): Array<'socios' | 'checkin' | 'alertas' | 'planes' | 'reportes'> {
  const gestion = rol === 'ADMIN' || rol === 'GERENTE' || rol === 'SOPORTE';
  return gestion ? ['socios', 'checkin', 'alertas', 'planes', 'reportes'] : ['socios', 'checkin', 'alertas'];
}
