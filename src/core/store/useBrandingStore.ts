import { create } from "zustand";
import { api } from "../api/api";

function lsGet(key: string, fallback = "") {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* quota exceeded — skip */ }
}

interface BrandingState {
  systemName: string;
  logoUrl: string;
  accentColor: string;
  backgroundImage: string;
  loaded: boolean;
  load: () => Promise<void>;
  update: (systemName: string, logoUrl: string, accentColor: string, backgroundImage?: string) => void;
}

export const useBrandingStore = create<BrandingState>((set) => ({
  // Initialize from localStorage so the UI has values immediately on refresh
  systemName: lsGet("system_name", "Tesorería SaaS"),
  logoUrl: lsGet("system_logo"),
  accentColor: lsGet("system_accent", "#2563eb"),
  backgroundImage: lsGet("system_bg"),
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
        const backgroundImage = res.data.backgroundImage || "";
        lsSet("system_name", systemName);
        lsSet("system_logo", logoUrl);
        lsSet("system_accent", accentColor);
        lsSet("system_bg", backgroundImage);
        set({ systemName, logoUrl, accentColor, backgroundImage, loaded: true });
      }
    } catch {
      // Keep whatever was loaded from localStorage; just mark as loaded
      set((s) => ({ ...s, loaded: true }));
    }
  },

  update: (systemName, logoUrl, accentColor, backgroundImage = "") => {
    lsSet("system_name", systemName);
    lsSet("system_logo", logoUrl);
    lsSet("system_accent", accentColor);
    lsSet("system_bg", backgroundImage);
    set({ systemName, logoUrl, accentColor, backgroundImage });
  },
}));
