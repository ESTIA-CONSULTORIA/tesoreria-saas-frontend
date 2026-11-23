// Lógica pura de la pantalla de pruebas para SOPORTE (sin React ni red), para poder probarla.

export interface FilaPrueba {
  id: string;
  tenantId: string | null;
  estado: string;
  giro: string;
  negocio: string;
  correoDominio: string;
  creadaEn: string;
  venceEn: string | null;
  diasRestantes: number | null;
  extendida: boolean;
}

export const ETIQUETA_ESTADO: Record<string, string> = {
  ACTIVA: 'En prueba',
  VENCIDA: 'Vencida',
  CONVERTIDA: 'Convertida',
};

export const etiquetaEstado = (estado: string): string => ETIQUETA_ESTADO[estado] ?? estado;

/** Texto corto de vigencia para la tabla. */
export function textoVigencia(f: Pick<FilaPrueba, 'estado' | 'diasRestantes'>): string {
  if (f.estado === 'CONVERTIDA') return 'Plan de pago';
  if (f.estado === 'VENCIDA' || f.diasRestantes === 0) return 'Venció';
  if (f.diasRestantes === null) return 'Sin fecha';
  return f.diasRestantes === 1 ? 'Queda 1 día' : `Quedan ${f.diasRestantes} días`;
}

/** Solo se puede convertir una prueba en curso o vencida que ya tenga negocio. */
export const puedeConvertir = (f: Pick<FilaPrueba, 'estado' | 'tenantId'>): boolean => (f.estado === 'ACTIVA' || f.estado === 'VENCIDA') && !!f.tenantId;

export const ETIQUETA_PLAN: Record<string, string> = {
  LITE_CORTE: 'Lite — Corte de caja',
  LITE_POS: 'Lite — POS sin inventario',
  BASIC: 'Básico',
  PRO: 'Pro',
  BUSINESS: 'Business',
  ENTERPRISE: 'Enterprise',
};

export const etiquetaPlan = (codigo: string): string => ETIQUETA_PLAN[codigo] ?? codigo;

export type Ciclo = 'monthly' | 'annual';
export const ETIQUETA_CICLO: Record<Ciclo, string> = { monthly: 'Mensual', annual: 'Anual' };

/** Valida lo elegido en el diálogo antes de llamar al servidor. Devuelve el mensaje de error o null. */
export function validarConversion(plan: string, planesValidos: readonly string[]): string | null {
  if (!plan) return 'Elige un plan.';
  if (!planesValidos.includes(plan)) return 'Ese plan no es válido.';
  return null;
}

/** Mensaje en español para un error del servidor (nunca muestra trazas ni detalles internos). */
export function mensajeConversion(err: any): string {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message;
  const texto = Array.isArray(msg) ? msg[0] : msg;
  if (status === 404) return 'La prueba no existe o la función está apagada.';
  if (status === 403) return 'Solo SOPORTE puede convertir pruebas.';
  if (status === 409 || status === 400) return typeof texto === 'string' && texto ? texto : 'No se pudo convertir esta prueba.';
  if (!err?.response) return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
  return 'No se pudo convertir esta prueba. Inténtalo de nuevo.';
}

export function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' });
}
