// Cálculos puros del precorte (a ciegas) y del corte Z de caja.
//
// El precorte es una DECLARACIÓN: la caja cuenta lo que tiene y lo captura sin ver lo que el sistema espera. Por eso aquí ya no hay
// «esperado» del lado de la caja: el servidor lo calcula (todas las ventas, depósitos y retiros) y solo se lo entrega a ADMIN,
// GERENTE y SOPORTE en el corte Z. (La fórmula local anterior leía totalEfectivo del turno, que vale 0 mientras está abierto, y
// por eso mostraba $450 en vez de $972.)

/** Billetes (clave = su valor) y monedas (clave «m» + valor): el $20 existe como billete y como moneda. */
export const BILLETES = [1000, 500, 200, 100, 50, 20] as const;
export const MONEDAS = [20, 10, 5, 2, 1, 0.5] as const;

export const claveBillete = (valor: number): string => String(valor);
export const claveMoneda = (valor: number): string => `m${valor}`;

const n = (v: unknown): number => Number(v) || 0;
const redondear = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

/** Efectivo declarado por denominación (SIN el fondo inicial). Acepta claves de billete («500») y de moneda («m5», «m0.5»). */
export function totalContado(conteo: Record<number | string, number>): number {
  let total = 0;
  for (const b of BILLETES) total += n(conteo[claveBillete(b)]) * b;
  for (const m of MONEDAS) total += n(conteo[claveMoneda(m)]) * m;
  return redondear(total);
}

export interface FilaCorteZ {
  clave: 'efectivo' | 'tarjeta' | 'transferencia';
  nombre: string;
  /** Lo que el sistema espera (efectivo: ventas + depósitos − retiros, sin el fondo inicial). */
  esperado: number;
  declarado: number;
  /** declarado − esperado: negativo = faltante, positivo = sobrante. */
  diferencia: number;
}

export interface CorteZ {
  filas: FilaCorteZ[];
  fondoInicial: number;
  /** Fondo + ventas en efectivo + depósitos − retiros: el efectivo total que debe haber en la caja. */
  efectivoEnCaja: number;
}

export const estadoDiferencia = (d: number): 'faltante' | 'sobrante' | 'cuadra' => (d < 0 ? 'faltante' : d > 0 ? 'sobrante' : 'cuadra');

/** Corte Z por forma de pago. `totals` = shiftSummary.calculatedTotals (solo lo recibe ADMIN, GERENTE o SOPORTE); `declaracion` = precorte. */
export function corteZ(totals: Record<string, any> | undefined, declaracion: Record<string, unknown> | undefined): CorteZ | null {
  if (!totals) return null;
  const d = declaracion || {};
  const fondo = n(totals.fondoInicial);
  const efectivoEnCaja = n(totals.efectivoEsperado);
  const esperadoEfectivo = totals.efectivoEsperadoSinFondo !== undefined ? n(totals.efectivoEsperadoSinFondo) : redondear(efectivoEnCaja - fondo);
  const esperadoTarjeta = redondear(n(totals.totalVentasDebito) + n(totals.totalVentasCredito));
  const esperadoTransf = n(totals.totalVentasSPEI);
  const declEfectivo = n(d.efectivoContado);
  const declTarjeta = redondear(n(d.debitoDeclarado) + n(d.creditoDeclarado));
  const declTransf = n(d.transferenciaDeclarada);
  const fila = (clave: FilaCorteZ['clave'], nombre: string, esperado: number, declarado: number): FilaCorteZ => ({
    clave, nombre, esperado, declarado, diferencia: redondear(declarado - esperado),
  });
  return {
    fondoInicial: fondo,
    efectivoEnCaja,
    filas: [
      fila('efectivo', 'Efectivo', esperadoEfectivo, declEfectivo),
      fila('tarjeta', 'Tarjeta (débito + crédito)', esperadoTarjeta, declTarjeta),
      fila('transferencia', 'Transferencia', esperadoTransf, declTransf),
    ],
  };
}

/** Datos propios del turno que la pantalla conoce (ninguno es un total del sistema). */
export interface TurnoCaja {
  fondoInicial?: number | string;
  totalDepositos?: number | string;
  totalRetiros?: number | string;
  totalCortesia?: number | string;
  precorteDeclaracion?: Record<string, unknown>;
}
