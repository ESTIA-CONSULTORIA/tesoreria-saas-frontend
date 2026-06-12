import { useAuthStore } from "../store/useAuthStore";

// Modules always shown regardless of plan configuration
const BUILT_IN_MODULES = ['ocr', 'rh'];

export function useModulo(modulo: string): boolean {
  const modulosActivos = useAuthStore((state) => state.modulosActivos);
  const user = useAuthStore((state) => state.user);

  // SOPORTE tiene acceso a todos los módulos
  if (user?.roleCode === "SOPORTE") {
    return true;
  }

  // Built-in modules are always available
  if (BUILT_IN_MODULES.includes(modulo)) {
    return true;
  }

  // Fallback: si modulosActivos está vacío, permitir todos los módulos
  // (para no rompar sesiones existentes sin este campo)
  if (!modulosActivos || modulosActivos.length === 0) {
    return true;
  }

  return modulosActivos.includes(modulo);
}
