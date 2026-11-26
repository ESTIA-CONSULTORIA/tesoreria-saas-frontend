// Nombre para mostrar de una empresa. La API manda `tradeName` (nombre comercial) y `legalName` (razón social); nunca `name`.
// Antes la pantalla «Executive Access» leía `name`: los botones salían VACÍOS y al tocar uno, `name.charAt(0)` lanzaba un error y la pantalla se quedaba en negro.
export function nombreEmpresa(c: { tradeName?: string | null; legalName?: string | null; name?: string | null } | null | undefined): string {
  return (c?.tradeName || c?.legalName || c?.name || '').trim() || 'Empresa sin nombre';
}

export function inicialEmpresa(c: Parameters<typeof nombreEmpresa>[0]): string {
  return nombreEmpresa(c).charAt(0).toUpperCase();
}
