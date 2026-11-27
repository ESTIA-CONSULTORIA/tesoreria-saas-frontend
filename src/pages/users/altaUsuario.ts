// Reglas puras del alta de usuario (probadas en altaUsuario.spec.ts).

export interface NegocioOpcion { id: string; tradeName?: string; legalName?: string }
export interface EmpresaOpcion { id: string; tradeName?: string; legalName?: string }
export interface SucursalOpcion { id: string; name: string; companyId?: string }

/** Negocio con el que se crea el usuario. Solo SOPORTE lo manda (el servidor lo ignora para los demás roles). */
export function negocioParaAlta(esSoporte: boolean, elegidoEnFormulario: string, filtroPantalla: string, encabezado: string | null): string {
  if (!esSoporte) return '';
  return elegidoEnFormulario || filtroPantalla || encabezado || '';
}

/** Mensaje claro cuando SOPORTE no ha elegido negocio (null = todo en orden). */
export function errorNegocioFaltante(esSoporte: boolean, negocioId: string): string | null {
  if (esSoporte && !negocioId) return 'Elige el negocio donde se creará el usuario (campo «Negocio» arriba en este formulario).';
  return null;
}

/** «Empresa · Sucursal» para distinguir sucursales con el mismo nombre. */
export function etiquetaSucursal(s: SucursalOpcion, empresas: EmpresaOpcion[]): string {
  const e = empresas.find((x) => x.id === s.companyId);
  const nombreEmpresa = e?.tradeName || e?.legalName;
  return nombreEmpresa ? `${nombreEmpresa} · ${s.name}` : s.name;
}

export function etiquetaNegocioOpcion(n: NegocioOpcion): string {
  return n.tradeName || n.legalName || 'Sin nombre';
}
