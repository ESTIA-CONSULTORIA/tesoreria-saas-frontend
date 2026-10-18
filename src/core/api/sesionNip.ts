// Sesión iniciada con el teclado de NIP de «Punto de Venta» (POST /pos/cashiers/nip). El backend guarda esa identidad en la cookie
// pos_access_token y SOLO la lee cuando la petición lleva `x-session-scope: pos-lite`. Sin ese encabezado el POS completo recibía
// 403 «Sesión inválida» en todas sus llamadas y regresaba al inicio. Esta marca (por dispositivo) hace que el cliente `api` lo mande.
// Se apaga al iniciar sesión por correo, al cerrar sesión o cuando el arranque descubre que no hay sesión.

export const CLAVE_SESION_NIP = 'pos_nip_session';
export const SCOPE_POS_LITE = { 'x-session-scope': 'pos-lite' } as const;

type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const almacen = (a?: Almacen): Almacen | null => {
  try { return a ?? (typeof localStorage !== 'undefined' ? localStorage : null); } catch { return null; }
};

export function marcarSesionNip(a?: Almacen) {
  try { almacen(a)?.setItem(CLAVE_SESION_NIP, '1'); } catch { /* sin almacenamiento: la sesión NIP no se podrá reanudar */ }
}
export function limpiarSesionNip(a?: Almacen) {
  try { almacen(a)?.removeItem(CLAVE_SESION_NIP); } catch { /* nada que limpiar */ }
}
export function esSesionNip(a?: Almacen): boolean {
  try { return almacen(a)?.getItem(CLAVE_SESION_NIP) === '1'; } catch { return false; }
}

/** Encabezados extra para una petición: el ámbito pos-lite solo si hay sesión NIP y la petición no trae ya otro ámbito ni token Bearer. */
export function encabezadosSesionNip(existentes: Record<string, unknown> = {}, a?: Almacen): Record<string, string> {
  if (!esSesionNip(a)) return {};
  if (existentes['x-session-scope'] || existentes['Authorization']) return {};
  return { ...SCOPE_POS_LITE };
}
