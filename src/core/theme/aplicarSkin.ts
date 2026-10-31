// Aplica la skin al documento y recuerda la elección. Las claves de localStorage son las mismas que lee el script de index.html
// (así la skin está puesta antes de que React pinte y no hay parpadeo).
// Orden: este equipo → preferencia del usuario → negocio → ESTIA. Las skins en preparación (Claro, Alto contraste) solo cuentan para
// los roles de ROLES_SKINS_EN_PREPARACION; el rol se lee de la sesión guardada (localStorage «user»).
import { resolverSkin, SKINS, type SkinId } from './skins';

export const CLAVE_DISPOSITIVO = 'ui_skin_device'; // elección de ESTE equipo (gana a todo)
export const CLAVE_USUARIO = 'ui_skin_user'; // preferencia propia del usuario (viene de login/refresh y de Apariencia)
export const CLAVE_NEGOCIO = 'ui_skin'; // último valor del negocio, para pintar rápido en la siguiente carga
export const CLAVE_POS_HEX = 'ui_pos_hex'; // «Teclas hexagonales» del POS (solo se ven con la skin ESTIA Isotipo); '1' = activada, en este equipo

function leer(clave: string): string | null {
  try { return localStorage.getItem(clave); } catch { return null; }
}
function escribir(clave: string, valor: string | null) {
  try { if (valor === null) localStorage.removeItem(clave); else localStorage.setItem(clave, valor); } catch { /* sin almacenamiento: la skin vale solo esta sesión */ }
}

/** Rol de la sesión guardada (null si no hay). */
export function rolActual(): string | null {
  try { return JSON.parse(leer('user') || 'null')?.roleCode ?? null; } catch { return null; }
}

export function skinActual(): SkinId {
  return resolverSkin(leer(CLAVE_DISPOSITIVO), leer(CLAVE_NEGOCIO), { usuario: leer(CLAVE_USUARIO), rol: rolActual() });
}

export function aplicarSkin(id: SkinId = skinActual()): SkinId {
  if (typeof document === 'undefined') return id;
  document.documentElement.setAttribute('data-skin', id);
  if (posHexActivo()) document.documentElement.setAttribute('data-pos-hex', '1'); else document.documentElement.removeAttribute('data-pos-hex');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SKINS[id].tokens.bg);
  return id;
}

/** El negocio eligió (o cargó) su skin: se recuerda y se aplica, salvo que este equipo o el usuario tengan la suya. */
export function fijarSkinNegocio(valor: string | null | undefined): SkinId {
  escribir(CLAVE_NEGOCIO, valor ?? null);
  return aplicarSkin();
}

/** Preferencia propia del usuario (la que devuelven login y refresh, o la que acaba de guardar). `null` = usar la del negocio. */
export function fijarSkinUsuario(valor: string | null | undefined): SkinId {
  escribir(CLAVE_USUARIO, valor ?? null);
  return aplicarSkin();
}

/** Elección de este equipo. `null` = usar la del negocio / la del usuario. */
export function fijarSkinDispositivo(id: SkinId | null): SkinId {
  escribir(CLAVE_DISPOSITIVO, id);
  return aplicarSkin();
}

export function skinDispositivo(): string | null {
  return leer(CLAVE_DISPOSITIVO);
}

export function skinUsuario(): string | null {
  return leer(CLAVE_USUARIO);
}

/** ¿Teclas hexagonales en el POS? Es una opción de este equipo (apagada por defecto); solo tiene efecto con la skin ESTIA Isotipo (isotipo.css). */
export function posHexActivo(): boolean {
  return leer(CLAVE_POS_HEX) === '1';
}

export function fijarPosHex(activo: boolean): void {
  escribir(CLAVE_POS_HEX, activo ? '1' : null);
  aplicarSkin();
}
