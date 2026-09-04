import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

const baseURL = (import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://api.estiaconsultoria.com')) + '/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 30000,
  // Migración a cookies httpOnly (login/portal-login/switch-company/refresh): necesario
  // para que el navegador mande esas cookies solo, tanto aquí como en el axios.post crudo
  // del interceptor de refresh más abajo.
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // Esta lectura se queda a propósito — sigue siendo la única fuente de auth para sesiones
  // que no migraron a cookies (NIP del POS completo, vía /pos/cashiers/nip). Para una
  // sesión de cookie (ERP normal) esto es null y el header simplemente no se manda; la
  // cookie httpOnly viaja sola gracias a withCredentials.
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

// Deduplicación del refresh: si N peticiones en paralelo reciben un 401 casi al mismo
// tiempo (ej. el Dashboard disparando varias llamadas al montar), solo la primera crea
// esta promesa y llama a POST /auth/refresh de verdad; el resto la encuentra ya en vuelo,
// la espera y reutiliza su resultado, en vez de disparar cada una su propio refresh
// (confirmado con evidencia real: sin esto, refresh_token rota y solo algunas de las
// llamadas paralelas "ganaban" la carrera — las demás fallaban y cada una cerraba sesión
// por su cuenta).
let refreshPromise: Promise<unknown> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // /auth/login, /auth/portal-login y /auth/refresh sí están excluidos de este camino —
    // un 401 ahí es un intento de login fallido (credenciales inválidas) o un refresh que
    // ya falló, no una sesión vigente que se cayó a medio uso. No hay refresh_token que
    // renovar en ese momento (login) ni sentido en reintentar un refresh que acaba de
    // fallar (refresh), y dejarlos entrar aquí disparaba un POST /auth/refresh inútil
    // seguido de un window.location.href sobre la propia pantalla de login, pisando el
    // mensaje de error que el usuario debía ver.
    const url = originalRequest?.url || '';
    const isAuthFlowRequest = url.endsWith('/auth/login') ||
      url.endsWith('/auth/portal-login') ||
      url.endsWith('/auth/refresh');

    // Sesión expirada: 401 normal, o 403 "Sesión inválida" — el mensaje exacto que lanza
    // SubscriptionGuard cuando el token está ausente/expirado (verificado: es el único
    // lugar del backend que usa ese texto; otros 403 legítimos, como falta de permisos de
    // rol o de módulo, tienen mensajes distintos y no deben disparar un refresh).
    // GET /auth/me ya NO está excluido de este camino (sí lo estuvo): la exclusión asumía
    // que un 401/403 ahí siempre era "todavía no hay sesión", pero en realidad es el caso
    // más común de expiración legítima — el access_token (15 min) vence primero y el
    // refresh_token (7 días) sigue vivo, y era justo ese 403 el que se dejaba pasar sin
    // intentar renovar, cerrando la sesión de golpe (confirmado con evidencia: solo queda
    // la cookie refresh_token, access_token ya expiró, y /auth/me daba 403 sin reintentar).
    // El costo real de quitar la exclusión es un POST /auth/refresh extra en el primer
    // /auth/me de una página nunca antes logueada (sin cookie, responde 401, cae al catch
    // de abajo, mismo resultado final que antes) — aceptable frente a cerrar sesión cada
    // 15 min a usuarios con sesión válida.
    const isExpiredSession = !isAuthFlowRequest && (error.response?.status === 401 ||
      (error.response?.status === 403 && error.response?.data?.message === 'Sesión inválida'));

    if (isExpiredSession && !originalRequest._retry) {
      originalRequest._retry = true;

      // No hay forma de inspeccionar la cookie httpOnly del refresh_token desde JS, así
      // que ya no se puede decidir de antemano si "vale la pena" intentar — se intenta
      // siempre. Si no había cookie (o era una sesión NIP sin refresh_token, que nunca
      // tuvo uno), el propio POST /auth/refresh responde 401 y cae al catch de abajo,
      // mismo resultado final que antes (redirect a /login), solo un round-trip extra.
      if (!refreshPromise) {
        refreshPromise = axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
          .finally(() => { refreshPromise = null; });
      }

      try {
        await refreshPromise;
        return api(originalRequest);
      } catch {
        // GET /auth/me es el bootstrap de App.tsx y corre en cada montaje, sin importar la
        // ruta — incluida /login. Si no hay sesión real (ni access_token ni refresh_token
        // vivos), este catch se dispara ahí también, y un window.location.href incondicional
        // aquí generaba un ciclo: recarga /login → App.tsx se remonta → llama /auth/me de
        // nuevo → vuelve a fallar → vuelve a recargar (el parpadeo reportado, confirmado con
        // evidencia real). El bootstrap (App.tsx) ya tiene su propio .catch() -> clearSession()
        // y su .finally() -> setAuthChecked(true), sin recargar nada — dejar que el error
        // se propague (reject normal) hacia ahí ya es suficiente para que ProtectedRoute
        // decida bien, sin ciclos. Para cualquier otra petición (sesión real que se cayó a
        // medio uso mientras el usuario navegaba) el comportamiento no cambia: si el refresh
        // también falla ahí, sí hay que limpiar y mandar a /login.
        // Auditoría de seguridad (GoodsHabits, diagnóstico sesión POS): mensaje claro para
        // quien SÍ tenía una sesión y se la cerraron (refresh_token inválido/revocado —
        // confirmado con evidencia real que esto pasaba en silencio, la app simplemente
        // regresaba a /login sin explicación). Solo si localStorage.user existe: un
        // visitante nuevo que nunca inició sesión también entra a este catch (su /auth/me
        // da 401, el refresh también, por no tener ninguna cookie — mismo camino, ver nota
        // arriba) y no debe ver "tu sesión expiró" porque nunca tuvo una. LoginPage.tsx lee
        // esta clave al montar y la limpia.
        if (localStorage.getItem('user')) {
          sessionStorage.setItem('session_expired_message', 'Tu sesión expiró. Por favor, inicia sesión de nuevo.');
        }

        const isMeCheck = originalRequest?.url?.endsWith('/auth/me');
        if (!isMeCheck) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('tenant_id');
          window.location.href = '/login';
        }
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
