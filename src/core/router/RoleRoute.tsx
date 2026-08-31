import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

interface Props {
  children: React.ReactNode;
  roles: string[];
}

// Auditoría de seguridad (Hallazgo 1b, GoodsHabits): a diferencia de ModuloRoute (gate por
// módulo del plan), esta ruta se protege por roleCode — para páginas como /administration
// donde el backend ya exige @Roles('SOPORTE') (RolesGuard) y la puerta del frontend debe
// coincidir exactamente, no depender de si el tenant tiene o no cierto módulo activo. Un
// tenant con el módulo mal activado por error (ej. "administracion") no debe poder entrar
// aquí solo por eso — solo el rol importa.
export default function RoleRoute({ children, roles }: Props) {
  const user = useAuthStore((state) => state.user);

  if (!user?.roleCode || !roles.includes(user.roleCode)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
