import { Navigate } from "react-router-dom";
import { useModulo } from "../hooks/useModulo";
import { useAuthStore } from "../store/useAuthStore";

interface Props {
  children: React.ReactNode;
  modulo: string;
}

export default function ModuloRoute({ children, modulo }: Props) {
  const moduloActivo = useModulo(modulo);
  const user = useAuthStore((state) => state.user);

  // SOPORTE tiene acceso a todos los módulos - nunca redirigir
  if (user?.roleCode === "SOPORTE") {
    return <>{children}</>;
  }

  if (!moduloActivo) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
