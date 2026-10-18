// Aplica la skin al documento y recuerda la elección. Las claves de localStorage son las mismas que lee el script de index.html
// (así la skin está puesta antes de que React pinte y no hay parpadeo).
import { resolverSkin, SKINS, type SkinId } from './skins';

export const CLAVE_DISPOSITIVO = 'ui_skin_device'; // elección de ESTE equipo (gana a todo)
export const CLAVE_NEGOCIO = 'ui_skin'; // último valor del negocio, para pintar rápido en la siguiente carga

function leer(clave: string): string | null {
  try { return localStorage.getItem(clave); } catch { return null; }
}
function escribir(clave: string, valor: string | null) {
  try { if (valor === null) localStorage.removeItem(clave); else localStorage.setItem(clave, valor); } catch { /* sin almacenamiento: la skin vale solo esta sesión */ }
}

export function skinActual(): SkinId {
  return resolverSkin(leer(CLAVE_DISPOSITIVO), leer(CLAVE_NEGOCIO));
}

export function aplicarSkin(id: SkinId = skinActual()): SkinId {
  if (typeof document === 'undefined') return id;
  document.documentElement.setAttribute('data-skin', id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SKINS[id].tokens.bg);
  return id;
}

/** El negocio eligió (o cargó) su skin: se recuerda y se aplica, salvo que este equipo tenga la suya. */
export function fijarSkinNegocio(valor: string | null | undefined): SkinId {
  escribir(CLAVE_NEGOCIO, valor ?? null);
  return aplicarSkin();
}

/** Elección de este equipo. `null` = usar la del negocio. */
export function fijarSkinDispositivo(id: SkinId | null): SkinId {
  escribir(CLAVE_DISPOSITIVO, id);
  return aplicarSkin();
}

export function skinDispositivo(): string | null {
  return leer(CLAVE_DISPOSITIVO);
}
