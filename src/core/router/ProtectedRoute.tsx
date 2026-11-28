import { Navigate, useLocation } from "react-router-dom";
import AvisoRuta from "../layout/AvisoRuta";
import { destinoCajero } from "./accesoCajero";
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
  const loc = useLocation();

  if (!authChecked) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // El CAJERO solo entra al POS y al portal del empleado: cualquier otra pantalla lo regresa al POS (sin mostrar nada de administración).
  if (user.roleCode === "CAJERO") {
    const destino = destinoCajero(loc.pathname);
    if (destino) return <Navigate to={destino.a} replace state={destino.aviso ? { avisoRuta: destino.aviso } : undefined} />;
    return <><AvisoRuta />{children}</>;
  }

  return <>{children}</>;
}