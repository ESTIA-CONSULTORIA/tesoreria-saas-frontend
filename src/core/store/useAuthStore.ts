import { create } from "zustand";
import { jwtDecode } from "jwt-decode";

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
    if (tenantId) {
      localStorage.setItem("tenant_id", tenantId);
    } else {
      localStorage.removeItem("tenant_id");
    }
    localStorage.setItem("user", JSON.stringify(enrichedUser));
    localStorage.setItem("modulos_activos", JSON.stringify(modulosActivos));
    
    if (companyId) {
      localStorage.setItem("user_company_id", companyId);
      localStorage.setItem("active_company_id", companyId);
    } else {
      localStorage.removeItem("user_company_id");
      localStorage.removeItem("active_company_id");
    }
    
    if (branchId) {
      localStorage.setItem("user_branch_id", branchId);
      localStorage.setItem("active_branch_id", branchId);
    } else {
      localStorage.removeItem("user_branch_id");
      localStorage.removeItem("active_branch_id");
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

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("tenant_id");
    localStorage.removeItem("user");
    localStorage.removeItem("modulos_activos");
    localStorage.removeItem("user_company_id");
    localStorage.removeItem("user_branch_id");
    localStorage.removeItem("active_company_id");
    localStorage.removeItem("active_branch_id");

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