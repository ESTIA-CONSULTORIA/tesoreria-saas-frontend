import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  tenantId: string | null;
  user: User | null;

  login: (
    token: string,
    tenantId: string,
    user: User
  ) => void;

  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("access_token"),
  tenantId: localStorage.getItem("tenant_id"),
  user: null,

  login: (token, tenantId, user) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("tenant_id", tenantId);

    set({
      token,
      tenantId,
      user,
    });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("tenant_id");

    set({
      token: null,
      tenantId: null,
      user: null,
    });
  },
}));