import { useAuthStore } from "../store/useAuthStore";
import { moduloDisponible } from "./moduloDisponible";
import { leerNegocioActivo } from "../api/negocioActivo";

// La regla vive en moduloDisponible.ts (pura y con spec); aquí solo se leen los datos de la sesión.
export function useModulo(modulo: string): boolean {
  const modulosActivos = useAuthStore((state) => state.modulosActivos);
  const user = useAuthStore((state) => state.user);
  const modulosNegocioSoporte = useAuthStore((state) => state.modulosNegocioSoporte);
  const negocioSoporteId = user?.roleCode === 'SOPORTE' ? leerNegocioActivo(localStorage)?.id ?? null : null;
  return moduloDisponible(modulo, { roleCode: user?.roleCode, modulosActivos, negocioSoporteId, modulosNegocioSoporte });
}
