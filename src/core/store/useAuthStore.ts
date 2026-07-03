import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { useCompanyStore } from "./useCompanyStore";

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
  token: string | null;
  tenantId: string | null;
  user: User | null;
  modulosActivos: string[];
  companyId: string | null;
  branchId: string | null;

  logoutTrigger: boolean;

  login: (
    token: string,
    tenantId: string,
    user: User,
    modulosActivos?: string[],
    refreshToken?: string,
  ) => void;

  updateToken: (accessToken: string) => void;
  logout: () => void;
  triggerLogout: () => void;
  clearLogoutTrigger: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("access_token"),
  tenantId: localStorage.getItem("tenant_id"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  modulosActivos: JSON.parse(localStorage.getItem("modulos_activos") || "[]"),
  companyId: localStorage.getItem("user_company_id"),
  branchId: localStorage.getItem("user_branch_id"),
  logoutTrigger: false,

  login: (token, tenantId, user, modulosActivos = [], refreshToken?) => {
    // Decode JWT to extract companyId/branchId
    let companyId = null;
    let branchId = null;
    try {
      const decoded: any = jwtDecode(token);
      companyId = decoded.companyId || null;
      branchId = decoded.branchId || null;
    } catch (e) {
      console.error('JWT decode error:', e);
    }

    // Enrich user with JWT data
    const enrichedUser = {
      ...user,
      companyId,
      branchId,
    };

    localStorage.setItem("access_token", token);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }
    if (tenantId) {
      localStorage.setItem("tenant_id", tenantId);
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
      token,
      tenantId,
      user: enrichedUser,
      modulosActivos,
      companyId,
      branchId,
    });
  },

  updateToken: (accessToken: string) => {
    set({ token: accessToken });
    localStorage.setItem('access_token', accessToken);
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
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

  triggerLogout: () => set({ logoutTrigger: true }),
  clearLogoutTrigger: () => set({ logoutTrigger: false }),
}));