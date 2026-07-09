// Parsea una fecha de negocio ('YYYY-MM-DD', sin hora) anclándola en el
// calendario local del navegador, para que coincida con los límites de rango
// (semana/mes/rango) que también se construyen con el constructor local
// new Date(año, mes, día). Timestamps completos (ej. createdAt) se parsean
// de forma estándar, ya que sí representan un instante real en el tiempo.
export function parseBusinessDate(value?: string | number | null): Date {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value || 0);
}
