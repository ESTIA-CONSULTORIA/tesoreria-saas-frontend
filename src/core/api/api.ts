import axios from "axios";

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

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenantId && tenantId !== '') {
    config.headers["tenant-id"] = tenantId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      error.message = 'Tiempo de espera agotado. El servidor tardó demasiado en responder.';
    } else if (!error.response) {
      error.message = `No se puede conectar al servidor. Verifica que el backend esté corriendo en ${baseURL}`;
    }
    return Promise.reject(error);
  }
);