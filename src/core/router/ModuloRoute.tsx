import { Navigate } from "react-router-dom";
import { useDecisionRuta } from "../hooks/useModulo";

interface Props {
  children: React.ReactNode;
  modulo: string;
}

// Puerta de ruta por módulo: la MISMA regla que el menú (moduloDisponible) para todos los roles. Sin el módulo → /dashboard.
// SOPORTE ve todos los módulos salvo los verticales (Pacientes, Membresías) cuando el negocio elegido no los tiene activos.
export default function ModuloRoute({ children, modulo }: Props) {
  const decision = useDecisionRuta(modulo);
  if (decision === 'esperar') return <div role="status" className="p-6 text-sm !text-content-2">Cargando…</div>;
  if (decision === 'redirigir') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
