import axios from "axios";

const BASE = ((import.meta.env.VITE_API_URL as string) ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://api.estiaconsultoria.com')) + '/api/v1';

// withCredentials: necesario desde la migración a cookies httpOnly de /auth/executive-*
// (mismo mecanismo que el ERP normal, ver api.ts) — sin esto, el navegador nunca manda ni
// guarda la cookie exec_access_token. x-session-scope: le dice a jwt.middleware.ts que
// valide SOLO esa cookie, incluso si el mismo navegador también tiene abierta una sesión
// del ERP normal (evita servir datos con la identidad equivocada — ver jwt.middleware.ts).
// Se usa tanto para /auth/executive-login como para el resto porque login también
// necesita withCredentials para que el navegador acepte el Set-Cookie de la respuesta.
export const execPublicApi = axios.create({
  baseURL: BASE,
  timeout: 30000,
  withCredentials: true,
  headers: { "x-session-scope": "executive" },
});

// Para llamadas autenticadas de Vista Ejecutiva — ya no recibe token (httpOnly, no hay
// nada legible en JS); la cookie viaja sola gracias a withCredentials.
export function execApi(companyId?: string | null) {
  const headers: Record<string, string> = { "x-session-scope": "executive" };
  if (companyId) headers["x-company-id"] = String(companyId);
  return axios.create({ baseURL: BASE, timeout: 30000, withCredentials: true, headers });
}
