import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3000",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  const tenantId = localStorage.getItem("tenant_id");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenantId) {
    config.headers["tenant-id"] = tenantId;
  }

  return config;
});