import { useAuthStore } from "../store/useAuthStore";
import { moduloDisponible } from "./moduloDisponible";

// La regla vive en moduloDisponible.ts (pura y con spec); aquí solo se leen los datos de la sesión.
export function useModulo(modulo: string): boolean {
  const modulosActivos = useAuthStore((state) => state.modulosActivos);
  const user = useAuthStore((state) => state.user);
  return moduloDisponible(modulo, { roleCode: user?.roleCode, modulosActivos });
}
