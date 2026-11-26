import { useAuthStore } from "../store/useAuthStore";
import { useModulo } from "./useModulo";

import { puedeHacer, type AccionPermiso } from "./puedeHacer";
export type { AccionPermiso };

/** Misma fuente que el servidor (GET /permisos/mis-permisos): para ocultar menús y botones que el rol ya no puede usar. */
export function usePuede(modulo: string, accion: AccionPermiso = 'ver'): boolean {
  const permisos = useAuthStore((s) => s.permisos);
  return puedeHacer(permisos, modulo, accion);
}

/** Módulo disponible para el negocio (plan) Y con «Ver» permitido al rol (matriz). Los dos hooks se llaman siempre (reglas de hooks). */
export function useModuloVisible(modulo: string): boolean {
  const activo = useModulo(modulo);
  const puede = usePuede(modulo, 'ver');
  return activo && puede;
}
