import axios from "axios";

const BASE =
  (import.meta.env.VITE_API_URL as string) ||
  (window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : `http://${window.location.hostname}:3000`);

// For executive-login (unauthenticated) — no interceptors that redirect on 401
export const execPublicApi = axios.create({ baseURL: BASE, timeout: 30000 });

// For authenticated executive calls — token passed per instance
export function execApi(token: string) {
  return axios.create({
    baseURL: BASE,
    timeout: 30000,
    headers: { Authorization: `Bearer ${token}` },
  });
}
