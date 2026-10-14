// Cálculos puros del precorte y del corte de caja (antes repetidos en bloques IIFE dentro de POSPage).
export const DENOMINACIONES = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

export interface TurnoCaja {
  fondoInicial?: number | string;
  totalEfectivo?: number | string;
  totalDepositos?: number | string;
  totalRetiros?: number | string;
  totalTarjeta?: number | string;
  totalTransferencia?: number | string;
  totalCortesia?: number | string;
}

const n = (v: unknown): number => Number(v) || 0;

/** Efectivo que debería haber en caja: fondo + ventas en efectivo + depósitos − retiros. */
export function efectivoEsperado(t: TurnoCaja): number {
  return n(t.fondoInicial) + n(t.totalEfectivo) + n(t.totalDepositos) - n(t.totalRetiros);
}

export function totalContado(conteo: Record<number | string, number>): number {
  return DENOMINACIONES.reduce((s, d) => s + (Number(conteo[d]) || 0) * d, 0);
}

export interface FilaDiferencia {
  clave: 'efectivo' | 'tarjeta' | 'transferencia';
  nombre: string;
  sistema: number;
  declarado: number;
  /** declarado − sistema: positivo = sobrante, negativo = faltante. */
  diferencia: number;
}

/** Diferencias del precorte contra lo que el sistema tiene del turno (vales no tienen total de sistema). */
export function diferenciasPrecorte(
  t: TurnoCaja,
  decl: { efectivo: number; debito: number; credito: number; transferencia: number },
): FilaDiferencia[] {
  const fila = (clave: FilaDiferencia['clave'], nombre: string, sistema: number, declarado: number): FilaDiferencia => ({
    clave,
    nombre,
    sistema,
    declarado,
    diferencia: Math.round((declarado - sistema) * 100) / 100,
  });
  return [
    fila('efectivo', 'Efectivo', efectivoEsperado(t), decl.efectivo),
    fila('tarjeta', 'Tarjeta (déb. + créd.)', n(t.totalTarjeta), decl.debito + decl.credito),
    fila('transferencia', 'Transferencia', n(t.totalTransferencia), decl.transferencia),
  ];
}

export interface FilaConciliacion {
  nombre: string;
  sistema: number;
  declarado: number;
  /** sistema − declarado (convención histórica del corte: negativo = declaró de más). */
  dif: number;
  noDeclarado?: boolean;
}

export interface ConciliacionTurno {
  filas: FilaConciliacion[];
  totalSistema: number;
  totalDeclarado: number;
  totalDif: number;
}

/** Conciliación del corte Z: sistema vs lo declarado en el precorte. `totals` = shiftSummary.calculatedTotals. */
export function conciliacionTurno(
  t: TurnoCaja,
  declaracion: Record<string, unknown> | undefined,
  totals: Record<string, number> | undefined,
): ConciliacionTurno {
  const d = declaracion || {};
  const c = totals || {};
  const efectivoSistema = c.efectivoEsperado || efectivoEsperado(t);
  const debitoSistema = c.totalVentasDebito || 0;
  const creditoSistema = c.totalVentasCredito || 0;
  const transferenciaSistema = c.totalVentasSPEI || n(t.totalTransferencia);
  const cortesiaSistema = c.totalVentasCortesia || n(t.totalCortesia);

  const efectivoDecl = n(d.efectivoContado);
  const debitoDecl = n(d.debitoDeclarado);
  const creditoDecl = n(d.creditoDeclarado);
  const transferenciaDecl = n(d.transferenciaDeclarada);

  const filas: FilaConciliacion[] = [
    { nombre: 'Efectivo', sistema: efectivoSistema, declarado: efectivoDecl, dif: efectivoSistema - efectivoDecl },
    { nombre: 'Tarjeta Débito', sistema: debitoSistema, declarado: debitoDecl, dif: debitoSistema - debitoDecl },
    { nombre: 'Tarjeta Crédito', sistema: creditoSistema, declarado: creditoDecl, dif: creditoSistema - creditoDecl },
    { nombre: 'SPEI', sistema: transferenciaSistema, declarado: transferenciaDecl, dif: transferenciaSistema - transferenciaDecl },
    { nombre: 'Cortesía', sistema: cortesiaSistema, declarado: 0, dif: 0, noDeclarado: true },
  ];
  const totalSistema = efectivoSistema + debitoSistema + creditoSistema + transferenciaSistema + cortesiaSistema;
  const totalDeclarado = efectivoDecl + debitoDecl + creditoDecl + transferenciaDecl;
  return { filas, totalSistema, totalDeclarado, totalDif: totalSistema - totalDeclarado };
}
