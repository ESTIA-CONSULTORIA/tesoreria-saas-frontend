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
  splashBg: string;
  fontFamily: string;
  theme: 'dark' | 'light';
  companyDisplayName: string;
  loaded: boolean;

  load: () => Promise<void>;
  update: (systemName: string, logoUrl: string, accentColor: string, backgroundImage?: string) => void;
  setBranding: (b: Partial<Omit<BrandingState, 'load' | 'update' | 'setBranding' | 'reset'>>) => void;
  reset: () => void;
}

const defaults = {
  systemName: lsGet("system_name", "ESTIA ERP"),
  logoUrl: lsGet("system_logo"),
  accentColor: lsGet("system_accent", "#8fafd4"),
  backgroundImage: lsGet("system_bg"),
  splashBg: '#0f1117',
  fontFamily: 'Inter',
  theme: 'dark' as const,
  companyDisplayName: '',
  loaded: false,
};

export const useBrandingStore = create<BrandingState>((set) => ({
  ...defaults,

  load: async () => {
    try {
      const tenantId = localStorage.getItem("tenant_id");
      if (!tenantId) return;
      const res = await api.get(`/tenant-settings/${tenantId}`);
      if (res.data) {
        const systemName = res.data.name || "ESTIA ERP";
        const logoUrl = res.data.logoUrl || "";
        const accentColor = res.data.accentColor || "#8fafd4";
        const backgroundImage = res.data.backgroundImage || "";
        const splashBg = res.data.splashBg || '#0f1117';
        const fontFamily = res.data.fontFamily || 'Inter';
        const theme = res.data.theme || 'dark';
        const companyDisplayName = res.data.companyDisplayName || res.data.name || '';
        lsSet("system_name", systemName);
        lsSet("system_logo", logoUrl);
        lsSet("system_accent", accentColor);
        lsSet("system_bg", backgroundImage);
        set({ systemName, logoUrl, accentColor, backgroundImage, splashBg, fontFamily, theme, companyDisplayName, loaded: true });
      }
    } catch {
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

  setBranding: (b) => set((s) => ({ ...s, ...b })),

  reset: () => set({ ...defaults }),
}));
