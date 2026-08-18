import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import ExecutiveLogin from "./ExecutiveLogin";
import ExecutiveDashboard from "./ExecutiveDashboard";
import ExecutiveHome from "./ExecutiveHome";
import ExecutiveReport from "./ExecutiveReport";
import ExecutiveConfig from "./ExecutiveConfig";
import { execApi, execPublicApi } from "./execApi";
import type { ExecTheme } from "./theme";

export interface ExecConfig {
  theme: ExecTheme;
  modules: Record<string, boolean>;
}

export interface Company {
  id: string | number;
  name: string;
  razonSocial?: string;
}

export const DEFAULT_CONFIG: ExecConfig = {
  theme: "dark",
  modules: {
    VENTA: true, COSTO: true, GASTO: true, PRESUPUESTO: true,
    FLUJO: true, BANCO: true, NOMINA: true, VACANTES: true, ROTACION: true,
  },
};

type View = "login" | "dashboard" | "grid" | "report" | "config";

const BG: Record<ExecTheme, string> = {
  dark: "linear-gradient(160deg, #0A0A0A 0%, #111111 50%, #0D0D0D 100%)",
  light: "linear-gradient(160deg, #F8F8F6 0%, #F2F2EF 50%, #F5F5F2 100%)",
};

export default function ExecutivePage() {
  // Ya no hay token legible en JS (httpOnly) — la verdad es el bootstrap de abajo
  // (GET /auth/executive-me), igual que App.tsx hace con GET /auth/me para el ERP normal.
  // authChecked evita un flash a la pantalla de PIN mientras esa llamada sigue en vuelo.
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  // Reemplaza el decode de JWT que hacía ExecutiveDashboard.tsx con atob(token...) — ya no
  // hay token legible en JS, así que el tenantId viaja explícito desde el backend (login o
  // bootstrap), no se extrae del lado del cliente.
  const [sessionTenantId, setSessionTenantId] = useState<string>("");
  const [view, setView] = useState<View>("login");
  const [activeModule, setActiveModule] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [config, setConfig] = useState<ExecConfig>(() => {
    try {
      const saved = localStorage.getItem("executive_config");
      return saved ? JSON.parse(saved) : { theme: "dark", modules: {} };
    } catch {
      return { theme: "dark", modules: {} };
    }
  });
  // Separate displayTheme so ExecutiveConfig can preview theme changes before saving
  const [displayTheme, setDisplayTheme] = useState<ExecTheme>(() => config.theme);

  // Bootstrap de sesión — GET /auth/executive-me confirma contra el backend si hay una
  // cookie exec_access_token válida. Corre una sola vez al montar, igual que el bootstrap
  // de App.tsx para el ERP normal.
  useEffect(() => {
    execPublicApi
      .get("/auth/executive-me")
      .then((r) => {
        setAuthenticated(true);
        setUserName(r.data?.user?.name || "");
        setSessionTenantId(r.data?.user?.tenantId || "");
        setView("dashboard");
      })
      .catch(() => {
        setAuthenticated(false);
        setView("login");
      })
      .finally(() => setAuthChecked(true));
  }, []);

  // Config real del backend, compartida por tenant — localStorage es solo caché para
  // pintar rápido al abrir (lo que ya quedó de la sesión anterior en este dispositivo);
  // en cuanto responde el backend, esa es la fuente de verdad. Si no hay fila todavía
  // (tenant nunca guardó config) o falla la red, se queda con el default/caché local.
  useEffect(() => {
    if (!authenticated) return;
    execApi()
      .get("/executive-config")
      .then((r) => {
        const data = r.data;
        if (data && (data.theme || data.modules)) {
          const loaded: ExecConfig = { theme: data.theme || "dark", modules: data.modules || {} };
          setConfig(loaded);
          setDisplayTheme(loaded.theme);
          localStorage.setItem("executive_config", JSON.stringify(loaded));
        }
      })
      .catch(() => {});
  }, [authenticated]);

  function onLogin(name?: string, tenantId?: string) {
    // La cookie ya la puso el backend en la respuesta de /auth/executive-login — acá solo
    // se actualiza el estado de la UI.
    setAuthenticated(true);
    setUserName(name || "");
    setSessionTenantId(tenantId || "");
    setView("dashboard");
  }

  async function doLogout() {
    // await obligatorio antes de limpiar estado/navegar — mismo fix que useAuthStore.ts
    // logout() del ERP normal (sin esto, la navegación puede abortar la conexión antes de
    // que el navegador procese el Set-Cookie de limpieza).
    await execPublicApi.post("/auth/executive-logout").catch(() => {});
    setAuthenticated(false);
    setUserName("");
    setSessionTenantId("");
    setView("login");
  }

  function onLogout() {
    doLogout();
  }

  function onAuthError() {
    doLogout();
  }

  function onSaveConfig(c: ExecConfig) {
    setConfig(c);
    setDisplayTheme(c.theme);
    localStorage.setItem("executive_config", JSON.stringify(c));
    if (authenticated) {
      execApi().put("/executive-config", c).catch(() => {});
    }
  }

  let content: ReactNode;

  if (!authChecked) {
    content = null;
  } else if (!authenticated || view === "login") {
    content = <ExecutiveLogin onLogin={onLogin} config={config} />;
  } else if (view === "dashboard") {
    content = (
      <ExecutiveDashboard
        userName={userName}
        tenantId={sessionTenantId}
        config={config}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={setSelectedCompanyId}
        onCompaniesLoaded={setCompanies}
        onViewModules={() => setView("grid")}
        onLogout={onLogout}
        onAuthError={onAuthError}
      />
    );
  } else if (view === "config") {
    content = (
      <ExecutiveConfig
        config={config}
        onSave={onSaveConfig}
        onBack={() => {
          setDisplayTheme(config.theme);
          setView("grid");
        }}
        onLogout={onLogout}
        onThemePreview={setDisplayTheme}
      />
    );
  } else if (view === "report" && activeModule) {
    content = (
      <ExecutiveReport
        key={activeModule}
        tenantId={sessionTenantId}
        module={activeModule}
        config={config}
        selectedCompanyId={selectedCompanyId}
        onBack={() => setView("grid")}
        onAuthError={onAuthError}
      />
    );
  } else {
    content = (
      <ExecutiveHome
        config={config}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onReport={(mod) => { setActiveModule(mod); setView("report"); }}
        onConfig={() => setView("config")}
        onLogout={onLogout}
        onAuthError={onAuthError}
        onBack={() => setView("dashboard")}
      />
    );
  }

  return (
    <div
      id="exec-root"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: BG[displayTheme],
      }}
    >
      <div
        style={{
          maxWidth: 430,
          margin: "0 auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {content}
      </div>
    </div>
  );
}
