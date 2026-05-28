import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({
  children,
}: Props) {
  const token = useAuthStore(
    (state) => state.token
  );

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}