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
