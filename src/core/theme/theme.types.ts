export type LoginLayout =
  | "centered"
  | "split"
  | "glass"
  | "minimal";

export type DashboardLayout =
  | "sidebar"
  | "topbar"
  | "hybrid";

export type PosLayout =
  | "restaurant"
  | "retail"
  | "cafeteria"
  | "kiosk";

export type SeasonalTheme =
  | "none"
  | "christmas"
  | "halloween"
  | "summer"
  | "sports";

export interface TenantTheme {
  tenantId: string;

  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  darkMode: boolean;

  logoUrl?: string;
  backgroundImageUrl?: string;

  loginLayout: LoginLayout;
  dashboardLayout: DashboardLayout;
  posLayout: PosLayout;

  soundsEnabled: boolean;
  seasonalTheme: SeasonalTheme;

  mobileSafe: boolean;
}