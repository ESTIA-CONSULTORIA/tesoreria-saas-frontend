// Nombre para mostrar de un usuario a partir de lo que guardan ventas y turnos en `cajero` / `autorizadoPor` /
// `cobradoPor`: un id interno (UUID), un correo (las cuentas de mesas guardan el correo del mesero) o texto libre de
// datos viejos. Solo cambia la PRESENTACIÓN: el id sigue guardándose y enviándose igual al servidor. Los nombres salen del
// directorio del propio tenant (GET /pos/cashiers/directorio); un id que no esté ahí nunca se muestra crudo.

export interface UsuarioDirectorio {
  id: string;
  nombre: string | null;
  email: string;
}

export interface DirectorioUsuarios {
  porId: Map<string, UsuarioDirectorio>;
  porEmail: Map<string, UsuarioDirectorio>;
}

export const DIRECTORIO_VACIO: DirectorioUsuarios = { porId: new Map(), porEmail: new Map() };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const esUuid = (v: unknown): boolean => typeof v === 'string' && UUID_RE.test(v.trim());

export function construirDirectorio(lista: UsuarioDirectorio[] | null | undefined): DirectorioUsuarios {
  const dir: DirectorioUsuarios = { porId: new Map(), porEmail: new Map() };
  for (const u of Array.isArray(lista) ? lista : []) {
    if (!u || typeof u.id !== 'string') continue;
    dir.porId.set(u.id.toLowerCase(), u);
    if (typeof u.email === 'string' && u.email) dir.porEmail.set(u.email.trim().toLowerCase(), u);
  }
  return dir;
}

const etiqueta = (u: UsuarioDirectorio): string => (u.nombre && u.nombre.trim() ? u.nombre.trim() : u.email);

// Nombre completo; si no tiene, su correo. `respaldo` es lo que se muestra cuando no hay forma de resolverlo (nunca el id).
export function nombreUsuario(valor: string | null | undefined, directorio?: DirectorioUsuarios | null, respaldo = '—'): string {
  const v = typeof valor === 'string' ? valor.trim() : '';
  if (!v) return respaldo;
  const dir = directorio ?? DIRECTORIO_VACIO;
  if (esUuid(v)) {
    const u = dir.porId.get(v.toLowerCase());
    return u ? etiqueta(u) : respaldo;
  }
  if (v.includes('@')) {
    const u = dir.porEmail.get(v.toLowerCase());
    return u ? etiqueta(u) : v;
  }
  return v; // texto libre de datos anteriores ('Usuario Demo'): se muestra tal cual
}

// Leyenda del encabezado de la cuenta de mesa. `nombreResuelto` ya pasó por nombreUsuario: si no se pudo resolver llega
// vacío y se muestra "—"; nunca se cae al valor crudo de `cuenta.cajero` (puede ser un id interno).
export function textoAtiende(sinCuenta: boolean, nombreResuelto?: string | null): string {
  if (sinCuenta) return 'Mesa libre: arma la cuenta y ábrela.';
  const n = typeof nombreResuelto === 'string' ? nombreResuelto.trim() : '';
  return `Atiende: ${n || '—'}`;
}
