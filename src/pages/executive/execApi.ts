import axios from "axios";

const BASE =
  (import.meta.env.VITE_API_URL as string) ||
  (window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://tesoreria-saas-backend-production.up.railway.app");

// For executive-login (unauthenticated) — no interceptors that redirect on 401
export const execPublicApi = axios.create({ baseURL: BASE, timeout: 30000 });

// For authenticated executive calls — token passed per instance, optional companyId
export function execApi(token: string, companyId?: string | null) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (companyId) headers["x-company-id"] = String(companyId);
  return axios.create({ baseURL: BASE, timeout: 30000, headers });
}
