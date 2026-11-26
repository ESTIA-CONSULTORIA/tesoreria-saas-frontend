export type AccionPermiso = 'ver' | 'crear' | 'editar' | 'eliminar';

/** Lógica pura: ¿puede este rol hacer la acción en el módulo según la matriz del negocio? Sin datos cargados = sí (el servidor decide y responde 403). */
export function puedeHacer(
  permisos: Record<string, { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean }> | null | undefined,
  modulo: string,
  accion: AccionPermiso = 'ver',
): boolean {
  if (!permisos) return true;
  const p = permisos[modulo];
  return p ? !!p[accion] : true;
}
