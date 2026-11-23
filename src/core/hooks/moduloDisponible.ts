// ¿Está disponible un módulo para esta sesión? Lógica pura (la usa useModulo, y con él el menú y ModuloRoute).

/** Módulos que se ofrecen por GIRO de negocio y solo si están ACTIVOS en tenant_modules (el backend los restringe igual:
 *  src/config/module-giro-requirements.config.ts). Nunca se dan por buenos «por omisión». */
export const MODULOS_VERTICALES = ['pacientes', 'membresias'] as const;

/** Módulos siempre visibles, sin importar el plan. */
const BUILT_IN_MODULES = ['ocr'];

export interface SesionModulos {
  roleCode?: string | null;
  modulosActivos?: string[] | null;
}

export function moduloDisponible(modulo: string, sesion: SesionModulos): boolean {
  if (sesion.roleCode === 'SOPORTE') return true; // SOPORTE administra todos los negocios
  if (BUILT_IN_MODULES.includes(modulo)) return true;
  const activos = sesion.modulosActivos;
  if (!activos || activos.length === 0) {
    // Sin lista (sesiones antiguas sin este campo) se permiten los módulos genéricos para no romper la sesión,
    // pero un módulo vertical exige estar en la lista: sin ella no se ofrece Pacientes a quien no lo usa.
    return !(MODULOS_VERTICALES as readonly string[]).includes(modulo);
  }
  return activos.includes(modulo);
}
