import { Navigate } from "react-router-dom";
import { useModulo } from "../hooks/useModulo";

interface Props {
  children: React.ReactNode;
  modulo: string;
}

export default function ModuloRoute({ children, modulo }: Props) {
  const moduloActivo = useModulo(modulo);

  if (!moduloActivo) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
