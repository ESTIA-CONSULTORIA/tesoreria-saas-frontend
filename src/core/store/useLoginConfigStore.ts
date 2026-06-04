import { create } from 'zustand';
import { api } from '../api/api';

export interface LoginConfig {
  backgroundImage?: string;
  logoUrl?: string;
  buttonOpacity: number;
  cardOpacity: number;
  primaryColor: string;
  textColor: string;
  accentColor: string;
  companyName: string;
  tagline: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  maintenanceStartTime?: string;
  maintenanceEndTime?: string;
  customCSS?: string;
}

interface LoginConfigStore {
  config: LoginConfig;
  setConfig: (config: Partial<LoginConfig>) => void;
  resetConfig: () => void;
  loadConfig: (tenantId?: string) => Promise<void>;
  saveConfig: (tenantId?: string) => Promise<void>;
}

const defaultConfig: LoginConfig = {
  backgroundImage: '',
  logoUrl: '',
  buttonOpacity: 1,
  cardOpacity: 0.95,
  primaryColor: '#C0C0C0',
  textColor: '#F5F5F5',
  accentColor: '#2F855A',
  companyName: 'Tesorería SaaS',
  tagline: 'Gestión Financiera Empresarial',
  maintenanceMode: false,
  maintenanceMessage: 'Sistema en mantenimiento. Por favor, intente más tarde.',
  customCSS: '',
};

export const useLoginConfigStore = create<LoginConfigStore>((set, get) => ({
  config: defaultConfig,

  setConfig: (newConfig) => {
    set((state) => ({
      config: { ...state.config, ...newConfig },
    }));
  },

  resetConfig: () => {
    set({ config: defaultConfig });
  },

  loadConfig: async (tenantId?: string) => {
    try {
      if (tenantId) {
        const response = await api.get(`/tenant-settings/${tenantId}`);
        const settings = response.data;
        if (settings) {
          set({
            config: {
              backgroundImage: settings.backgroundImage || '',
              logoUrl: settings.logoUrl || '',
              buttonOpacity: 1,
              cardOpacity: 0.95,
              primaryColor: settings.primaryColor || '#C0C0C0',
              textColor: settings.textColor || '#F5F5F5',
              accentColor: settings.accentColor || '#2F855A',
              companyName: settings.name || 'Tesorería SaaS',
              tagline: 'Gestión Financiera Empresarial',
              maintenanceMode: false,
              maintenanceMessage: '',
              customCSS: settings.customCSS || '',
            },
          });
        }
      } else {
        const stored = localStorage.getItem('loginConfig');
        if (stored) {
          set({ config: JSON.parse(stored) });
        }
      }
    } catch (error) {
      console.error('Error loading login config:', error);
    }
  },

  saveConfig: async (tenantId?: string) => {
    try {
      const { config } = get();
      if (tenantId) {
        await api.post(`/tenant-settings/${tenantId}`, {
          name: config.companyName,
          logoUrl: config.logoUrl,
          primaryColor: config.primaryColor,
          secondaryColor: config.textColor,
          accentColor: config.accentColor,
          fontFamily: 'Inter',
          customCSS: config.customCSS,
        });
      } else {
        localStorage.setItem('loginConfig', JSON.stringify(config));
      }
    } catch (error) {
      console.error('Error saving login config:', error);
    }
  },
}));
