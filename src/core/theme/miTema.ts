// Elegir tema desde cualquier pantalla (hoy, la barra del POS): se ve al instante y, si el guardado falla, vuelve al anterior.
// Solo se aceptan las skins que el rol puede ver (skinsParaRol): un CAJERO elige entre ESTIA y Oscuro; ADMIN y SOPORTE, las cuatro.
import { fijarSkinDispositivo, fijarSkinUsuario } from './aplicarSkin';
import { esSkinId, skinsParaRol, type SkinId } from './skins';

export type ResultadoTema = { ok: boolean; mensaje?: string };

/** Skins que se ofrecen en el selector a este rol. */
export const opcionesTema = (rol?: string | null): SkinId[] => skinsParaRol(rol);

const MENSAJE_ERROR = 'No se pudo guardar tu tema. Se dejó el anterior.';

/** «Mi tema» (en todos mis equipos). `valor` vacío = igual que el negocio. `guardar` persiste en el servidor (PUT /auth/me/ui-prefs). */
export async function elegirMiTema(
  valor: string,
  previo: string,
  rol: string | null | undefined,
  guardar: (skin: SkinId | null) => Promise<unknown>,
): Promise<ResultadoTema> {
  if (valor && !(esSkinId(valor) && opcionesTema(rol).includes(valor))) return { ok: false, mensaje: 'Ese tema no está disponible para tu rol.' };
  const nueva = valor ? (valor as SkinId) : null;
  fijarSkinUsuario(nueva); // se ve al instante
  try {
    await guardar(nueva);
    return { ok: true };
  } catch (e) {
    fijarSkinUsuario(previo || null);
    const mensaje = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return { ok: false, mensaje: typeof mensaje === 'string' && mensaje ? mensaje : MENSAJE_ERROR };
  }
}

/** «Solo en este equipo»: no se guarda en el servidor, solo en este navegador. */
export function elegirTemaEquipo(valor: string, rol: string | null | undefined): ResultadoTema {
  if (valor && !(esSkinId(valor) && opcionesTema(rol).includes(valor))) return { ok: false, mensaje: 'Ese tema no está disponible para tu rol.' };
  fijarSkinDispositivo(valor ? (valor as SkinId) : null);
  return { ok: true };
}
