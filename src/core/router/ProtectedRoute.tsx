import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({
  children,
}: Props) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // SOPORTE tiene acceso a todos los módulos sin verificación
  if (user?.roleCode === 'SOPORTE') {
    return <>{children}</>;
  }

  return <>{children}</>;
}