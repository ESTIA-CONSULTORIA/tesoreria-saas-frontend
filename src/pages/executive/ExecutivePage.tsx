import { useState } from "react";
import type { ReactNode } from "react";
import ExecutiveLogin from "./ExecutiveLogin";
import ExecutiveDashboard from "./ExecutiveDashboard";
import ExecutiveHome from "./ExecutiveHome";
import ExecutiveReport from "./ExecutiveReport";
import ExecutiveConfig from "./ExecutiveConfig";
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
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem("executive_token"),
  );
  const [view, setView] = useState<View>(
    () => (sessionStorage.getItem("executive_token") ? "dashboard" : "login"),
  );
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

  function onLogin(t: string, name?: string) {
    sessionStorage.setItem("executive_token", t);
    sessionStorage.setItem("exec_user_name", name || "");
    setToken(t);
    setView("dashboard");
  }

  function onLogout() {
    sessionStorage.removeItem("executive_token");
    setToken(null);
    setView("login");
  }

  function onAuthError() {
    sessionStorage.removeItem("executive_token");
    setToken(null);
    setView("login");
  }

  function onSaveConfig(c: ExecConfig) {
    setConfig(c);
    setDisplayTheme(c.theme);
    localStorage.setItem("executive_config", JSON.stringify(c));
  }

  let content: ReactNode;

  if (!token || view === "login") {
    content = <ExecutiveLogin onLogin={onLogin} config={config} />;
  } else if (view === "dashboard") {
    content = (
      <ExecutiveDashboard
        token={token}
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
        token={token}
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
        token={token}
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
