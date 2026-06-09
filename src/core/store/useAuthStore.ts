import { create } from "zustand";

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

  login: (
    token: string,
    tenantId: string,
    user: User,
    modulosActivos?: string[]
  ) => void;

  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("access_token"),
  tenantId: localStorage.getItem("tenant_id"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  modulosActivos: JSON.parse(localStorage.getItem("modulos_activos") || "[]"),
  companyId: localStorage.getItem("user_company_id"),
  branchId: localStorage.getItem("user_branch_id"),

  login: (token, tenantId, user, modulosActivos = []) => {
    localStorage.setItem("access_token", token);
    if (tenantId) {
      localStorage.setItem("tenant_id", tenantId);
    } else {
      localStorage.removeItem("tenant_id");
    }
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("modulos_activos", JSON.stringify(modulosActivos));
    
    if (user.companyId) {
      localStorage.setItem("user_company_id", user.companyId);
    } else {
      localStorage.removeItem("user_company_id");
    }
    
    if (user.branchId) {
      localStorage.setItem("user_branch_id", user.branchId);
    } else {
      localStorage.removeItem("user_branch_id");
    }

    set({
      token,
      tenantId,
      user,
      modulosActivos,
      companyId: user.companyId || null,
      branchId: user.branchId || null,
    });
  },

  logout: () => {
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
}));