// «Negocio activo» de SOPORTE.
//
// SOPORTE no pertenece a ningún negocio (su token no trae tenantId). Desde que el servidor exige un negocio explícito en los
// listados y altas (?tenantId=), toda pantalla ERP que SOPORTE abre necesita saber de cuál negocio se trata. En vez de tocar cada
// pantalla, el negocio elegido en la barra superior se guarda aquí y el interceptor de api.ts lo agrega como ?tenantId= a cada
// petición. Para cualquier otro rol el servidor ignora ?tenantId=, y esta marca solo la escribe SOPORTE (ver SelectorNegocio).

export const CLAVE_NEGOCIO_ID = 'soporte_tenant_id';
export const CLAVE_NEGOCIO_NOMBRE = 'soporte_tenant_name';

export interface AlmacenNegocio {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

// Rutas que NO llevan negocio: sesión, catálogo de negocios y administración de la plataforma (son de SOPORTE por sí mismas).
const RUTAS_SIN_NEGOCIO = [/^\/?auth(\/|$)/, /^\/?tenants(\/|$|\?)/, /^\/?administration(\/|$)/];

export function leerNegocioActivo(almacen: AlmacenNegocio): { id: string; nombre: string } | null {
  const id = almacen.getItem(CLAVE_NEGOCIO_ID);
  if (!id) return null;
  return { id, nombre: almacen.getItem(CLAVE_NEGOCIO_NOMBRE) || '' };
}

export function guardarNegocioActivo(almacen: AlmacenNegocio, negocio: { id: string; nombre: string } | null): void {
  if (negocio?.id) {
    almacen.setItem(CLAVE_NEGOCIO_ID, negocio.id);
    almacen.setItem(CLAVE_NEGOCIO_NOMBRE, negocio.nombre || '');
  } else {
    almacen.removeItem(CLAVE_NEGOCIO_ID);
    almacen.removeItem(CLAVE_NEGOCIO_NOMBRE);
  }
}

export function limpiarNegocioActivo(almacen: AlmacenNegocio): void {
  guardarNegocioActivo(almacen, null);
}

/**
 * Parámetros de la petición con el negocio activo de SOPORTE. No pisa un `tenantId` que la pantalla ya mande de forma explícita
 * (incluso vacío: la pantalla de Usuarios usa '' para «todos los negocios») ni toca las rutas de sesión/plataforma.
 */
export function parametrosConNegocio(
  url: string | undefined,
  params: Record<string, unknown> | undefined,
  negocioId: string | null,
): Record<string, unknown> | undefined {
  if (!negocioId) return params;
  const ruta = (url || '').replace(/^https?:\/\/[^/]+/i, '').replace(/^\/?api\/v\d+/i, '');
  if (RUTAS_SIN_NEGOCIO.some((r) => r.test(ruta))) return params;
  if (params && Object.prototype.hasOwnProperty.call(params, 'tenantId')) return params;
  // Si la URL ya trae ?tenantId= en la cadena, tampoco se duplica
  if (/[?&]tenantId=/.test(url || '')) return params;
  return { ...(params || {}), tenantId: negocioId };
}
