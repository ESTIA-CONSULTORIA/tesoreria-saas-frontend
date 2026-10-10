import { create } from "zustand";
import { api } from "../api/api";
import { esTasaIva, type TasaIva } from "../utils/iva";

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
  // Auditoría de producto (GoodsHabits, Punto 1): política de stock insuficiente en POS,
  // vive en TenantSetting igual que el resto de estos campos — se reusa este store (ya se
  // carga temprano en App.tsx cuando hay sesión) en vez de crear un fetch aparte.
  stockPolicy: 'BLOQUEAR' | 'PERMITIR_NEGATIVO';
  // IVA del negocio (tasa por defecto y si los precios del catálogo ya lo incluyen). Se guarda también en localStorage para
  // que el POS sin conexión muestre el mismo desglose; el servidor es quien manda al sincronizar.
  ivaTasaDefault: TasaIva;
  preciosIncluyenIva: boolean;
  // Gimnasio: el negocio tiene activa la capacidad membresias (cobro de membresías y beneficio de socio en el POS).
  membresiasOn: boolean;
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
  stockPolicy: 'PERMITIR_NEGATIVO' as const,
  ivaTasaDefault: (esTasaIva(lsGet("iva_tasa_default")) ? lsGet("iva_tasa_default") : '16') as TasaIva,
  preciosIncluyenIva: lsGet("iva_precios_incluyen") === "1",
  membresiasOn: false,
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
        const stockPolicy = res.data.stockPolicy || 'PERMITIR_NEGATIVO';
        const caps = res.data.posCapabilities || {};
        const ivaTasaDefault: TasaIva = esTasaIva(caps.ivaTasaDefault) ? caps.ivaTasaDefault : '16';
        const preciosIncluyenIva = caps.preciosIncluyenIva === true;
        const membresiasOn = caps.membresias === true;
        lsSet("iva_tasa_default", ivaTasaDefault);
        lsSet("iva_precios_incluyen", preciosIncluyenIva ? "1" : "0");
        lsSet("system_name", systemName);
        lsSet("system_logo", logoUrl);
        lsSet("system_accent", accentColor);
        lsSet("system_bg", backgroundImage);
        set({ systemName, logoUrl, accentColor, backgroundImage, splashBg, fontFamily, theme, companyDisplayName, stockPolicy, ivaTasaDefault, preciosIncluyenIva, membresiasOn, loaded: true });
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
