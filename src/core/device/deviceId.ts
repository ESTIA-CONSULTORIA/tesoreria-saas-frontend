// Identidad estable del dispositivo/navegador — persiste en localStorage, independiente
// de la sesión de usuario (sobrevive a login/logout de cualquier cajero en el mismo
// dispositivo). Base para folios generados en el cliente (modo offline, Fase A1).
//
// IMPORTANTE: esta clave NO debe agregarse a la lista de limpieza de useAuthStore.logout()
// — si se borra en cada logout, deja de ser una identidad de dispositivo y se vuelve una
// identidad de sesión, rompiendo el propósito de este módulo.
const DEVICE_ID_KEY = 'device_id';

// Fallback en memoria si localStorage no está disponible (ej. navegación privada en
// algunos navegadores). No sobrevive a un refresh de página, pero mantiene estabilidad
// durante la sesión de página actual — mejor que fallar o generar uno nuevo por llamada.
let memoryDeviceId: string | null = null;

export function getDeviceId(): string {
  if (memoryDeviceId) return memoryDeviceId;

  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    memoryDeviceId = id;
    return id;
  } catch {
    // localStorage inaccesible — generar uno solo en memoria para esta sesión de página.
    memoryDeviceId = crypto.randomUUID();
    return memoryDeviceId;
  }
}

/** Fragmento corto (6 hex, mayúsculas) del deviceId — para embeber en folios sin hacerlos ilegibles. */
export function getDeviceIdFragment(): string {
  return getDeviceId().replace(/-/g, '').slice(0, 6).toUpperCase();
}
