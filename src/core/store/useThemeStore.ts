import { create } from "zustand";

interface ThemeState {
  darkMode: boolean;

  primaryColor: string;
  secondaryColor: string;

  toggleDarkMode: () => void;

  setColors: (
    primaryColor: string,
    secondaryColor: string
  ) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  darkMode: true,

  primaryColor: "#2563eb",
  secondaryColor: "#1e293b",

  toggleDarkMode: () =>
    set((state) => ({
      darkMode: !state.darkMode,
    })),

  setColors: (primaryColor, secondaryColor) =>
    set({
      primaryColor,
      secondaryColor,
    }),
}));