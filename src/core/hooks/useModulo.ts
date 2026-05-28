import { useAuthStore } from "../store/useAuthStore";

export function useModulo(modulo: string): boolean {
  const modulosActivos = useAuthStore((state) => state.modulosActivos);
  return modulosActivos.includes(modulo);
}
