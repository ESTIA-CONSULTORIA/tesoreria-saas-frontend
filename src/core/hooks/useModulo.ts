import { useAuthStore } from "../store/useAuthStore";

export function useModulo(modulo: string): boolean {
  const modulosActivos = useAuthStore((state) => state.modulosActivos);
  const user = useAuthStore((state) => state.user);

  // Debug: imprimir estructura del usuario
  console.log('useModulo - user:', user);
  console.log('useModulo - user.rol:', user?.rol);
  console.log('useModulo - modulo:', modulo);

  // SUPER_ADMIN tiene acceso a todos los módulos
  if (user?.rol === "SUPER_ADMIN") {
    console.log('useModulo - SUPER_ADMIN detected, returning true');
    return true;
  }

  // Fallback: si modulosActivos está vacío, permitir todos los módulos
  // (para no romper sesiones existentes sin este campo)
  if (!modulosActivos || modulosActivos.length === 0) {
    console.log('useModulo - modulosActivos empty, returning true');
    return true;
  }

  const result = modulosActivos.includes(modulo);
  console.log('useModulo - modulosActivos:', modulosActivos);
  console.log('useModulo - result:', result);
  return result;
}
