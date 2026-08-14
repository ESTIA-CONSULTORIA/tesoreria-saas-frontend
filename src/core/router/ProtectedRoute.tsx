import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({
  children,
}: Props) {
  // Ya no hay JWT legible en el cliente para decodificar su exp() — una sesión de cookie
  // (ERP normal) es httpOnly. La verdad ahora es el bootstrap de App.tsx (GET /auth/me):
  // mientras no resuelva, no se decide nada (evita un flash-redirect a /login antes de
  // tiempo); si ya resolvió y no hay user, no hay sesión. Si la sesión expira después de
  // este punto, cualquier llamada normal del componente lo descubre vía 401 y el
  // interceptor de api.ts se encarga (refresh o redirect), igual que siempre.
  const authChecked = useAuthStore((state) => state.authChecked);
  const user = useAuthStore((state) => state.user);

  if (!authChecked) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}