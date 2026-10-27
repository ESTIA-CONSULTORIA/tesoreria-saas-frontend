// Etiquetas del detalle de un usuario: siempre el nombre, nunca el UUID. Sin id = aplica a todas.
export function etiquetaAmbito(nombre: string | null | undefined, id: string | null | undefined): string {
  if (!id) return "Todas";
  return nombre?.trim() ? nombre.trim() : "Sin nombre";
}

export function etiquetaNegocio(nombre: string | null | undefined, id: string | null | undefined): string {
  if (!id) return "Sin negocio";
  return nombre?.trim() ? nombre.trim() : "Sin nombre";
}
