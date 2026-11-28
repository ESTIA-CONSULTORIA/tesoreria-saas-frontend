// Regla de acceso del CAJERO: solo entra al POS y al portal del empleado. Cualquier otra pantalla lo regresa al POS con un aviso.
export const INICIO_CAJERO = '/pos';
export const AVISO_SIN_ACCESO = 'No tienes acceso a esa sección';

// /mesas (mesas del POS) y /corte (corte del POS Lite) son pantallas del propio POS.
const PERMITIDAS = ['/pos', '/mesas', '/corte', '/employee'];

export function rutaPermitidaCajero(pathname: string): boolean {
  return PERMITIDAS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/** Qué hacer con un cajero que pide `pathname`: null = dejarlo pasar; si no, adónde mandarlo y si lleva aviso («/» y «/login» no avisan). */
export function destinoCajero(pathname: string): { a: string; aviso: string | null } | null {
  if (rutaPermitidaCajero(pathname)) return null;
  const silencioso = pathname === '/' || pathname === '/login' || pathname === '';
  return { a: INICIO_CAJERO, aviso: silencioso ? null : AVISO_SIN_ACCESO };
}
