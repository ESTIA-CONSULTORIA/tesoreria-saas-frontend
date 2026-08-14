import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { useCompanyStore } from "./useCompanyStore";
import { api } from "../api/api";

interface User {
  id: string;
  email: string;
  name?: string;
  roleCode?: string;
  tenantId?: string;
  companyId?: string | null;
  branchId?: string | null;
}

interface AuthState {
  // Sigue existiendo, pero ahora solo lo puebla el flujo NIP (ver login() más abajo) — se
  // usa hoy como señal de "ya hay sesión" en POSPage.tsx (gate de useEffect), no como
  // fuente para armar headers (eso lo sigue leyendo el interceptor directo de
  // localStorage). Para una sesión de cookie queda null — httpOnly, no hay nada que
  // guardar aquí de todos modos.
  token: string | null;
  tenantId: string | null;
  user: User | null;
  modulosActivos: string[];
  companyId: string | null;
  branchId: string | null;

  logoutTrigger: boolean;

  // false hasta que el bootstrap de App.tsx (GET /auth/me) resuelve una vez, éxito o
  // fracaso — ProtectedRoute.tsx lo usa para no decidir un redirect a /login antes de
  // tiempo mientras esa llamada sigue en vuelo (el chequeo dejó de ser síncrono: ya no hay
  // JWT legible en el cliente para decodificar su exp() como antes).
  authChecked: boolean;
  setAuthChecked: (v: boolean) => void;

  // token es opcional: solo lo mandan flujos que no migraron a cookies httpOnly (NIP del
  // POS completo, vía /pos/cashiers/nip) — ahí sigue viviendo en localStorage como antes,
  // porque ese endpoint no tiene cookie a la que aferrarse. El ERP normal (login/
  // portal-login/switch-company) ya no manda token aquí — la cookie la puso el backend
  // directo en la respuesta, antes de que este código corra.
  login: (
    user: User,
    modulosActivos?: string[],
    token?: string,
  ) => void;

  logout: () => Promise<void>;
  // Como logout(), pero sin llamar a POST /auth/logout ni redirigir — para cuando el
  // bootstrap descubre que no había sesión real (caché local vieja/huérfana), no para
  // cuando alguien activamente cierra sesión.
  clearSession: () => void;
  triggerLogout: () => void;
  clearLogoutTrigger: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem("access_token"),
  tenantId: localStorage.getItem("tenant_id"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  modulosActivos: JSON.parse(localStorage.getItem("modulos_activos") || "[]"),
  companyId: localStorage.getItem("user_company_id"),
  branchId: localStorage.getItem("user_branch_id"),
  logoutTrigger: false,
  authChecked: false,
  setAuthChecked: (v) => set({ authChecked: v }),

  login: (user, modulosActivos = [], token) => {
    let companyId: string | null = user.companyId ?? null;
    let branchId: string | null = user.branchId ?? null;

    // Solo aplica al flujo NIP (token presente): decodifica el JWT para enriquecer
    // companyId/branchId y lo persiste en localStorage — comportamiento sin cambios para
    // ese flujo. Una sesión de cookie nunca pasa token aquí, así que nunca entra aquí.
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        companyId = decoded.companyId ?? companyId;
        branchId = decoded.branchId ?? branchId;
      } catch (e) {
        console.error('JWT decode error:', e);
      }
      localStorage.setItem("access_token", token);
    }

    const enrichedUser = { ...user, companyId, branchId };

    if (user.tenantId) {
      localStorage.setItem("tenant_id", user.tenantId);
    } else {
      localStorage.removeItem("tenant_id");
    }
    localStorage.setItem("user", JSON.stringify(enrichedUser));
    localStorage.setItem("modulos_activos", JSON.stringify(modulosActivos));

    if (companyId) {
      localStorage.setItem("user_company_id", companyId);
    } else {
      localStorage.removeItem("user_company_id");
    }

    if (branchId) {
      localStorage.setItem("user_branch_id", branchId);
    } else {
      localStorage.removeItem("user_branch_id");
    }

    set({
      // Si no llega token (flujo de cookie), no se toca el que ya hubiera en memoria — un
      // GET /auth/me en el bootstrap llama a login() sin token, y no debe borrar el token
      // de una sesión NIP activa que sí lo tenía guardado desde antes.
      token: token || get().token,
      tenantId: user.tenantId || null,
      user: enrichedUser,
      modulosActivos,
      companyId,
      branchId,
    });
  },

  logout: async () => {
    // Necesario, no cosmético: la cookie httpOnly de sesión (ERP normal) solo el
    // servidor puede borrarla — un logout puramente client-side la deja viva y el
    // próximo /auth/me reautenticaría en silencio a alguien que "cerró sesión". Inofensivo
    // para sesiones NIP (no tienen cookie que limpiar, el endpoint simplemente no encuentra
    // nada que revocar).
    // El await es obligatorio: si el POST queda en vuelo y de inmediato disparamos el
    // window.location.href de abajo, la navegación dura puede abortar la conexión antes de
    // que el navegador procese el Set-Cookie de limpieza — confirmado con evidencia real
    // (repro aislado: sin await, las cookies sobrevivían al logout; con await, no).
    await api.post('/auth/logout').catch(() => {});

    localStorage.removeItem("access_token");
    localStorage.removeItem("tenant_id");
    localStorage.removeItem("user");
    localStorage.removeItem("modulos_activos");
    localStorage.removeItem("user_company_id");
    localStorage.removeItem("user_branch_id");
    localStorage.removeItem("active_company_id");
    localStorage.removeItem("active_branch_id");
    localStorage.removeItem("active_company_name");
    localStorage.removeItem("active_branch_name");

    // Reset in-memory company store (localStorage already cleared above)
    useCompanyStore.getState().setActiveCompany(null);
    useCompanyStore.getState().setActiveBranch(null);

    set({
      token: null,
      tenantId: null,
      user: null,
      modulosActivos: [],
      companyId: null,
      branchId: null,
    });

    window.location.href = '/login';
  },

  clearSession: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("tenant_id");
    localStorage.removeItem("user");
    localStorage.removeItem("modulos_activos");
    localStorage.removeItem("user_company_id");
    localStorage.removeItem("user_branch_id");

    set({
      token: null,
      tenantId: null,
      user: null,
      modulosActivos: [],
      companyId: null,
      branchId: null,
    });
  },

  triggerLogout: () => set({ logoutTrigger: true }),
  clearLogoutTrigger: () => set({ logoutTrigger: false }),
}));
