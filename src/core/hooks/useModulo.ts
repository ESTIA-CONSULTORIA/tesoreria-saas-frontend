import { useAuthStore } from "../store/useAuthStore";

export function useModulo(modulo: string): boolean {
  const modulosActivos = useAuthStore((state) => state.modulosActivos);
  const user = useAuthStore((state) => state.user);

  // SOPORTE tiene acceso a todos los módulos
  if (user?.roleCode === "SOPORTE") {
    return true;
  }

  // Fallback: si modulosActivos está vacío, permitir todos los módulos
  // (para no romper sesiones existentes sin este campo)
  if (!modulosActivos || modulosActivos.length === 0) {
    return true;
  }

  return modulosActivos.includes(modulo);
}
