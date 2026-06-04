import { create } from 'zustand';

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
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
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

  loadConfig: async () => {
    try {
      const stored = localStorage.getItem('loginConfig');
      if (stored) {
        set({ config: JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Error loading login config:', error);
    }
  },

  saveConfig: async () => {
    try {
      const { config } = get();
      localStorage.setItem('loginConfig', JSON.stringify(config));
    } catch (error) {
      console.error('Error saving login config:', error);
    }
  },
}));
