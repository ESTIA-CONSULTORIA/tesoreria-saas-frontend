import { create } from "zustand";

// Bug 4: el filtro de periodo del Dashboard se reseteaba al cambiar de empresa/sucursal.
// No se logró reproducir el mecanismo exacto (remount, cambio de referencia, lo que sea)
// en 2 rondas de diagnóstico — en vez de seguir cazando la causa, se saca el estado del
// ciclo de vida del componente por completo: vive aquí, no en un useState local, así que
// sobrevive sin importar qué esté reiniciando el componente.
export type DashboardPeriod = "today" | "week" | "month" | "quarter" | "year";
export type DashboardLitePeriod = "semana" | "mes" | "custom";

const DASHBOARD_PERIODS: DashboardPeriod[] = ["today", "week", "month", "quarter", "year"];
const DASHBOARD_LITE_PERIODS: DashboardLitePeriod[] = ["semana", "mes", "custom"];

function readPeriod(): DashboardPeriod {
  const saved = localStorage.getItem("dashboard_period");
  return (DASHBOARD_PERIODS as string[]).includes(saved || "") ? (saved as DashboardPeriod) : "month";
}

function readPeriodLite(): DashboardLitePeriod {
  const saved = localStorage.getItem("dashboard_period_lite");
  return (DASHBOARD_LITE_PERIODS as string[]).includes(saved || "") ? (saved as DashboardLitePeriod) : "semana";
}

interface DashboardFilterState {
  period: DashboardPeriod;
  periodLite: DashboardLitePeriod;
  setPeriod: (p: DashboardPeriod) => void;
  setPeriodLite: (p: DashboardLitePeriod) => void;
}

export const useDashboardFilterStore = create<DashboardFilterState>((set) => ({
  period: readPeriod(),
  periodLite: readPeriodLite(),

  setPeriod: (p) => {
    localStorage.setItem("dashboard_period", p);
    set({ period: p });
  },

  setPeriodLite: (p) => {
    localStorage.setItem("dashboard_period_lite", p);
    set({ periodLite: p });
  },
}));
