import axios from "axios";

const baseURL =
  (import.meta.env.VITE_API_URL ||
    (window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : `http://${window.location.hostname}:3000`)) + "/api/v1";

// withCredentials: necesario desde la migración a cookies httpOnly de /auth/portal-login
// (mismo mecanismo que el ERP normal, ver api.ts) — sin esto, el navegador nunca manda la
// cookie de sesión que el backend ya pone en el login del Portal del Empleado.
export const employeeApi = axios.create({ baseURL, timeout: 30000, withCredentials: true });

// Auditoría de seguridad (GoodsHabits, cookies httpOnly, Pendiente 4): este interceptor
// leía sessionStorage.getItem("employee_token") y lo mandaba como Authorization — pero
// EmployeeLogin.tsx (el único login de este Portal) nunca escribe esa clave, solo
// "employee_user" (para pintar el nombre en pantalla, no para autenticar). Confirmado con
// grep en todo el repo: "employee_token" no se escribe en ningún lado — código muerto
// desde que este Portal migró a cookies httpOnly, retirado.

employeeApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Sin redirect automático a propósito: cada pantalla ya maneja su propio 401
    // (EmployeeHome/EmployeeProfile/EmployeeRequests navegan a /employee en su catch;
    // EmployeeDocuments cae a su estado vacío). Un window.location.href acá encima
    // pisaría esos mensajes/estados con un hard reload — y en check-in/check-out o los
    // formularios de solicitudes, cortaría al usuario a mitad de una acción. Este Portal
    // no tiene refresh token como el ERP normal, así que tampoco hay nada que reintentar
    // acá — solo limpieza pasiva de la sesión cacheada.
    if (error.response?.status === 401) {
      sessionStorage.removeItem("employee_user");
    }
    return Promise.reject(error);
  }
);
