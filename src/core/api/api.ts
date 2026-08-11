import axios from "axios";
import { useCompanyStore } from "../store/useCompanyStore";
import { useAuthStore } from "../store/useAuthStore";

const baseURL = (import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://api.estiaconsultoria.com')) + '/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  const tenantId = localStorage.getItem("tenant_id");
  const activeCompanyId = localStorage.getItem("active_company_id");
  const activeBranchId = localStorage.getItem("active_branch_id");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenantId && tenantId !== '') {
    config.headers["x-tenant-id"] = tenantId;
  }

  if (activeCompanyId && activeCompanyId !== '') {
    config.headers["X-Company-Id"] = activeCompanyId;
  }

  if (activeBranchId && activeBranchId !== '') {
    config.headers["X-Branch-Id"] = activeBranchId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Sesión expirada: 401 normal, o 403 "Sesión inválida" — el mensaje exacto que lanza
    // SubscriptionGuard cuando el token está ausente/expirado (verificado: es el único
    // lugar del backend que usa ese texto; otros 403 legítimos, como falta de permisos de
    // rol o de módulo, tienen mensajes distintos y no deben disparar un refresh).
    const isExpiredSession = error.response?.status === 401 ||
      (error.response?.status === 403 && error.response?.data?.message === 'Sesión inválida');

    if (isExpiredSession && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('tenant_id');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const { access_token, refresh_token } = res.data;

        localStorage.setItem('refresh_token', refresh_token);
        useAuthStore.getState().updateToken(access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('tenant_id');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.message = 'Tiempo de espera agotado. El servidor tardó demasiado en responder.';
    } else if (!error.response) {
      error.message = `No se puede conectar al servidor. Verifica que el backend esté corriendo en ${baseURL}`;
    }
    return Promise.reject(error);
  }
);
