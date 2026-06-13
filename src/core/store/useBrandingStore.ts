import { create } from "zustand";
import { api } from "../api/api";

interface BrandingState {
  systemName: string;
  logoUrl: string;
  accentColor: string;
  loaded: boolean;
  load: () => Promise<void>;
  update: (systemName: string, logoUrl: string, accentColor: string) => void;
}

export const useBrandingStore = create<BrandingState>((set) => ({
  systemName: localStorage.getItem("system_name") || "Tesorería SaaS",
  logoUrl: localStorage.getItem("system_logo") || "",
  accentColor: localStorage.getItem("system_accent") || "#2563eb",
  loaded: false,

  load: async () => {
    try {
      const tenantId = localStorage.getItem("tenant_id");
      if (!tenantId) return;
      const res = await api.get(`/tenant-settings/${tenantId}`);
      if (res.data) {
        const systemName = res.data.name || "Tesorería SaaS";
        const logoUrl = res.data.logoUrl || "";
        const accentColor = res.data.accentColor || "#2563eb";
        localStorage.setItem("system_name", systemName);
        localStorage.setItem("system_logo", logoUrl);
        localStorage.setItem("system_accent", accentColor);
        set({ systemName, logoUrl, accentColor, loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  update: (systemName, logoUrl, accentColor) => {
    localStorage.setItem("system_name", systemName);
    localStorage.setItem("system_logo", logoUrl);
    localStorage.setItem("system_accent", accentColor);
    set({ systemName, logoUrl, accentColor });
  },
}));
