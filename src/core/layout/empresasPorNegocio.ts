// Lista de empresas del selector «Empresa / Sucursal». SOPORTE, sin negocio elegido, ve las empresas de TODOS los negocios: se agrupan por
// negocio (el nombre del negocio como encabezado) para que dos empresas con el mismo nombre en negocios distintos no se confundan. Con un
// negocio elegido (o para cualquier otro rol) la lista es plana, como siempre. Nunca quedan dos filas idénticas sin forma de distinguirlas.

export interface EmpresaLista { id: string; tradeName?: string | null; legalName?: string | null; tenantId?: string | null }
export interface NegocioLista { id: string; tradeName?: string | null; legalName?: string | null }
export interface FilaEmpresa { empresa: EmpresaLista; etiqueta: string; tooltip: string }
export interface GrupoEmpresas { clave: string; encabezado: string | null; filas: FilaEmpresa[] }

const nombreDe = (e: { tradeName?: string | null; legalName?: string | null }) => (e.tradeName || e.legalName || '').trim() || 'Empresa sin nombre';

export function agruparEmpresas(empresas: EmpresaLista[], negocios: NegocioLista[], agrupar: boolean): GrupoEmpresas[] {
  const nombreNegocio = new Map(negocios.map((n) => [n.id, nombreDe(n)]));
  const grupos = new Map<string, GrupoEmpresas>();
  for (const e of empresas) {
    const tid = agrupar ? (e.tenantId ?? '') : '';
    const clave = agrupar ? tid || '_sin_negocio' : '_todas';
    if (!grupos.has(clave)) {
      grupos.set(clave, { clave, encabezado: agrupar ? (nombreNegocio.get(tid) ?? 'Negocio sin nombre') : null, filas: [] });
    }
    grupos.get(clave)!.filas.push({ empresa: e, etiqueta: nombreDe(e), tooltip: '' });
  }
  const lista = [...grupos.values()];
  if (agrupar) lista.sort((a, b) => String(a.encabezado).localeCompare(String(b.encabezado), 'es'));
  for (const g of lista) {
    // Mismo nombre dentro del mismo grupo: «Nombre (1 de 2)», «Nombre (2 de 2)»
    const veces = new Map<string, number>();
    for (const f of g.filas) veces.set(f.etiqueta, (veces.get(f.etiqueta) ?? 0) + 1);
    const visto = new Map<string, number>();
    for (const f of g.filas) {
      const total = veces.get(f.etiqueta)!;
      const razon = (f.empresa.legalName || '').trim();
      const base = total > 1 ? `${f.etiqueta} (${(visto.set(f.etiqueta, (visto.get(f.etiqueta) ?? 0) + 1), visto.get(f.etiqueta))} de ${total})` : f.etiqueta;
      f.tooltip = [base, razon && razon !== f.etiqueta ? razon : '', g.encabezado ? `Negocio: ${g.encabezado}` : ''].filter(Boolean).join(' · ');
      f.etiqueta = base;
    }
  }
  return lista;
}
