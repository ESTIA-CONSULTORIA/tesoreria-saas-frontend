// Lógica pura del Dashboard Ejecutivo: nada de cifras supuestas.
// Regla: si el sistema no tiene la fuente real de un dato, se muestra «Sin datos», nunca un número calculado con un porcentaje inventado.

export const SIN_DATOS = 'Sin datos';

export interface EmpresaDesglose { companyId?: string; income?: number | string }

/**
 * Participación (%) de una empresa en las ventas del grupo.
 * Solo existe con la VISTA GLOBAL: al elegir una empresa o sucursal el backend filtra el desglose a esa sola
 * entidad, así que el total del grupo no está disponible y un porcentaje sería siempre 100 % (falso).
 * Devuelve null cuando no se puede calcular de forma real.
 */
export function participacion(ingresoEmpresa: number | string | undefined, empresas: EmpresaDesglose[] | undefined, vistaGlobal: boolean): number | null {
  if (!vistaGlobal || !empresas || empresas.length < 2) return null;
  const total = empresas.reduce((s, e) => s + (Number(e.income) || 0), 0);
  const propio = Number(ingresoEmpresa);
  if (!(total > 0) || !Number.isFinite(propio)) return null;
  return (propio / total) * 100;
}

export function textoPorcentaje(valor: number | null): string {
  return valor === null || !Number.isFinite(valor) ? SIN_DATOS : `${Math.round(valor)}%`;
}

export function textoMoneda(valor: number | null): string {
  return valor === null || !Number.isFinite(valor) ? SIN_DATOS : `$${Math.round(valor).toLocaleString('es-MX')}`;
}

export const SIN_COMPARAR = 'Sin datos para comparar';

/**
 * Variación (%) frente al periodo anterior, o null si no se puede comparar.
 * El servidor manda 0 cuando el periodo anterior vale $0 (no se puede dividir entre cero): eso NO es «+0 %», es «sin datos para comparar».
 * `anterior` (opcional, lo manda el servidor nuevo) es el total del periodo anterior; sin él, 0 con ventas en $0 se toma como sin datos.
 */
export function variacionComparable(variacion: number | null | undefined, actual: number, anterior?: number | null): number | null {
  if (typeof variacion !== 'number' || !Number.isFinite(variacion)) return null;
  if (typeof anterior === 'number') return anterior > 0 ? variacion : null;
  return variacion === 0 && !(actual > 0) ? null : variacion;
}

/** Margen (utilidad / ventas, en %) o null cuando las ventas son $0 o menos (no hay base para calcularlo). */
export function margenSobreVentas(utilidad: number, ventas: number): number | null {
  return ventas > 0 && Number.isFinite(utilidad) ? (utilidad / ventas) * 100 : null;
}

/** Nombre de la barra de respaldo (cuando el servidor no manda desglose): el ámbito que eligió la persona. */
export function nombreRespaldoGrafica(sucursal?: string | null, empresa?: string | null): string {
  return sucursal || empresa || 'Grupo Consolidado';
}
