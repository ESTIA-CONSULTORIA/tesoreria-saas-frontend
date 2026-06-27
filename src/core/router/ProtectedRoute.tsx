import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({
  children,
}: Props) {
  const token = useAuthStore((state) => state.token) || localStorage.getItem('access_token');
  const user = useAuthStore((state) => state.user) || JSON.parse(localStorage.getItem('user') || 'null');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return <Navigate to="/login" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }

  // SOPORTE tiene acceso a todos los módulos sin verificación
  if (user?.roleCode === 'SOPORTE') {
    return <>{children}</>;
  }

  return <>{children}</>;
}