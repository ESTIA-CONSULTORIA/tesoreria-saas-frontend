// ¿Está disponible un módulo para esta sesión? Lógica pura (la usa useModulo, y con él el menú y ModuloRoute).

/** Módulos que se ofrecen por GIRO de negocio y solo si están ACTIVOS en tenant_modules (el backend los restringe igual:
 *  src/config/module-giro-requirements.config.ts). Nunca se dan por buenos «por omisión». */
export const MODULOS_VERTICALES = ['pacientes', 'membresias'] as const;

/** Planes Lite: traen otros códigos de módulo que equivalen al POS (misma tabla que el backend: plan-modulo.guard.ts).
 *  Un negocio con el código de la derecha puede usar el módulo de la izquierda. */
export const MODULOS_EQUIVALENTES: Record<string, string[]> = {
  pos: ['pos_sin_inventario', 'corte_caja_lite'],
  configuracion_pos: ['pos_sin_inventario'],
};

/** Módulos siempre visibles, sin importar el plan. */
const BUILT_IN_MODULES = ['ocr'];

export interface SesionModulos {
  roleCode?: string | null;
  modulosActivos?: string[] | null;
  /** SOPORTE: id del negocio elegido en la barra superior (null/ausente = ninguno) y sus módulos activos (null = aún sin cargar). */
  negocioSoporteId?: string | null;
  modulosNegocioSoporte?: string[] | null;
}

export function moduloDisponible(modulo: string, sesion: SesionModulos): boolean {
  if (sesion.roleCode === 'SOPORTE') {
    // SOPORTE administra todos los negocios y ve todos los módulos, salvo los VERTICALES (Pacientes, Membresías): con un negocio
    // elegido solo se ofrecen si ese negocio los tiene activos (el backend también lo exige). Sin negocio elegido se ve todo.
    if (!(MODULOS_VERTICALES as readonly string[]).includes(modulo) || !sesion.negocioSoporteId) return true;
    return (sesion.modulosNegocioSoporte ?? []).includes(modulo);
  }
  if (BUILT_IN_MODULES.includes(modulo)) return true;
  const activos = sesion.modulosActivos;
  if (!activos || activos.length === 0) {
    // Sin lista (sesiones antiguas sin este campo) se permiten los módulos genéricos para no romper la sesión,
    // pero un módulo vertical exige estar en la lista: sin ella no se ofrece Pacientes a quien no lo usa.
    return !(MODULOS_VERTICALES as readonly string[]).includes(modulo);
  }
  return activos.includes(modulo) || (MODULOS_EQUIVALENTES[modulo] ?? []).some((m) => activos.includes(m));
}

/**
 * Qué hace una RUTA protegida por módulo (la misma regla que el menú: moduloDisponible, para TODOS los roles, SOPORTE incluido):
 *  - 'permitir': el módulo está disponible para la sesión / el negocio activo;
 *  - 'redirigir': no lo está → se saca al usuario a /dashboard (antes SOPORTE entraba por URL a /patients de un negocio sin el módulo y veía «0 pacientes»);
 *  - 'esperar': SOPORTE con negocio elegido y sus módulos aún sin cargar (no se decide todavía; evita sacar a quien sí lo tiene).
 * Se vuelve a evaluar cada vez que cambia la sesión o el negocio activo, así que cambiar de negocio con la pantalla abierta también saca.
 */
export function decisionRuta(modulo: string, sesion: SesionModulos): 'permitir' | 'redirigir' | 'esperar' {
  if (
    sesion.roleCode === 'SOPORTE' &&
    (MODULOS_VERTICALES as readonly string[]).includes(modulo) &&
    sesion.negocioSoporteId &&
    sesion.modulosNegocioSoporte === null
  ) return 'esperar';
  return moduloDisponible(modulo, sesion) ? 'permitir' : 'redirigir';
}

/** Tiempo máximo de espera de la puerta de ruta (módulos del negocio de SOPORTE) antes de sacar al usuario con un aviso. */
export const ESPERA_MAXIMA_RUTA_MS = 8000;

const NOMBRE_MODULO: Record<string, string> = { pacientes: 'Pacientes', membresias: 'Membresías', rh: 'Recursos humanos', sat_cfdi: 'Datos fiscales' };

/** Aviso en español cuando una ruta saca al usuario al Dashboard. */
export function mensajeRedireccion(modulo: string, motivo: 'no-disponible' | 'tiempo-agotado'): string {
  const nombre = NOMBRE_MODULO[modulo] ?? modulo;
  return motivo === 'tiempo-agotado'
    ? `No se pudo comprobar si el negocio tiene el módulo ${nombre}. Inténtalo de nuevo en unos segundos.`
    : `El módulo ${nombre} no está disponible en este negocio.`;
}
