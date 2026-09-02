import { create } from "zustand";
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

  // Auditoría de seguridad (GoodsHabits, cookies httpOnly, Pendiente 2): antes aceptaba un
  // tercer argumento `token` opcional para el flujo NIP del POS completo — confirmado que
  // ningún caller en el frontend lo pasaba (App.tsx, el único call site real, siempre
  // llama con 2 argumentos). Retirado junto con la rama muerta que lo procesaba. La cookie
  // la pone el backend directo en la respuesta de login/portal-login/switch-company/nip,
  // antes de que este código corra — nunca hay nada legible en JS que guardar aquí.
  login: (
    user: User,
    modulosActivos?: string[],
  ) => void;

  logout: () => Promise<void>;
  // Como logout(), pero sin llamar a POST /auth/logout ni redirigir — para cuando el
  // bootstrap descubre que no había sesión real (caché local vieja/huérfana), no para
  // cuando alguien activamente cierra sesión.
  clearSession: () => void;
  triggerLogout: () => void;
  clearLogoutTrigger: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  tenantId: localStorage.getItem("tenant_id"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  modulosActivos: JSON.parse(localStorage.getItem("modulos_activos") || "[]"),
  companyId: localStorage.getItem("user_company_id"),
  branchId: localStorage.getItem("user_branch_id"),
  logoutTrigger: false,
  authChecked: false,
  setAuthChecked: (v) => set({ authChecked: v }),

  login: (user, modulosActivos = []) => {
    const companyId: string | null = user.companyId ?? null;
    const branchId: string | null = user.branchId ?? null;

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

    // access_token: ya no hay campo `token` en el store ni ningún flujo que lo escriba
    // (ver Pendiente 2) — este removeItem se deja como limpieza defensiva de un residuo de
    // localStorage de antes de la migración a cookies, por si sobrevivía en el navegador.
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
