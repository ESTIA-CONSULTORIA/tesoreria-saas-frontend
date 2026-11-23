// Texto y etiqueta del selector de empresa/sucursal de la barra superior (solo presentación: no cambia el contexto que se envía al backend).
//
// SOPORTE ve junto a él el selector «Negocio». Cuando el negocio tiene una sola empresa y ésta se llama igual que el negocio
// (p. ej. «RIOVA DENTAL» → «RIOVA DENTAL — Matriz»), repetir el nombre confunde: se muestra solo la sucursal.

export interface EntradaEtiqueta {
  /** Nombre del negocio elegido por SOPORTE (null/'' si no hay: ADMIN, GERENTE… no ven el selector «Negocio»). */
  negocioNombre?: string | null;
  empresa?: { name: string } | null;
  sucursal?: { name: string } | null;
  /** Cuántas empresas tiene el negocio; null si todavía no se sabe (en ese caso se muestra la forma completa). */
  totalEmpresas?: number | null;
}

export interface EtiquetaContexto {
  /** Rótulo corto a la izquierda del control. */
  etiqueta: 'Empresa / Sucursal' | 'Sucursal';
  /** Texto dentro del control. */
  texto: string;
  /** Verdadero si hay una empresa elegida (para el punto de estado, igual que «Negocio»). */
  activo: boolean;
}

/** Compara nombres sin mayúsculas, acentos ni espacios repetidos. */
export function mismoNombre(a?: string | null, b?: string | null): boolean {
  const n = (s?: string | null) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const x = n(a), y = n(b);
  return x !== '' && x === y;
}

export function etiquetaContexto(e: EntradaEtiqueta): EtiquetaContexto {
  const { empresa, sucursal } = e;
  if (!empresa) return { etiqueta: 'Empresa / Sucursal', texto: 'Vista Global', activo: false };
  const soloSucursal = e.totalEmpresas === 1 && mismoNombre(e.negocioNombre, empresa.name);
  if (soloSucursal) return { etiqueta: 'Sucursal', texto: sucursal ? sucursal.name : 'Todas las sucursales', activo: true };
  return { etiqueta: 'Empresa / Sucursal', texto: sucursal ? `${empresa.name} — ${sucursal.name}` : empresa.name, activo: true };
}
