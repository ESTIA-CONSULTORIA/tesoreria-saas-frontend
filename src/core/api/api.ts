import axios from "axios";
import { useCompanyStore } from "../store/useCompanyStore";

const baseURL = import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : `http://${window.location.hostname}:3000`);

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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('tenant_id');
      window.location.href = '/';
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      error.message = 'Tiempo de espera agotado. El servidor tardó demasiado en responder.';
    } else if (!error.response) {
      error.message = `No se puede conectar al servidor. Verifica que el backend esté corriendo en ${baseURL}`;
    }
    return Promise.reject(error);
  }
);