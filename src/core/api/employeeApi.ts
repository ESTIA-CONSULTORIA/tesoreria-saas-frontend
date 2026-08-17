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

employeeApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("employee_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
