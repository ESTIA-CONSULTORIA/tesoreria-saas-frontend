import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name?: string;
  roleCode?: string;
  tenantId?: string;
}

interface AuthState {
  token: string | null;
  tenantId: string | null;
  user: User | null;
  modulosActivos: string[];

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

  login: (token, tenantId, user, modulosActivos = []) => {
    localStorage.setItem("access_token", token);
    if (tenantId) {
      localStorage.setItem("tenant_id", tenantId);
    } else {
      localStorage.removeItem("tenant_id");
    }
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("modulos_activos", JSON.stringify(modulosActivos));

    set({
      token,
      tenantId,
      user,
      modulosActivos,
    });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("tenant_id");
    localStorage.removeItem("user");
    localStorage.removeItem("modulos_activos");

    set({
      token: null,
      tenantId: null,
      user: null,
      modulosActivos: [],
    });
  },
}));