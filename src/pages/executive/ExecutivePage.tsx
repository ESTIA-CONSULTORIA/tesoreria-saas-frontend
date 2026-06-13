import { useState } from "react";
import ExecutiveLogin from "./ExecutiveLogin";
import ExecutiveHome from "./ExecutiveHome";
import ExecutiveReport from "./ExecutiveReport";
import ExecutiveConfig from "./ExecutiveConfig";
import type { ExecTheme } from "./theme";

export interface ExecConfig {
  theme: ExecTheme;
  modules: Record<string, boolean>;
}

export const DEFAULT_CONFIG: ExecConfig = {
  theme: "dark",
  modules: {
    VENTAS: true, SALDOS: true, COSTOS: true, GASTOS: true,
    NOMINA: true, PRESUPUESTO: true, ROTACION: true, VACANTES: true,
  },
};

type View = "login" | "home" | "report" | "config";

export default function ExecutivePage() {
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem("executive_token"),
  );
  const [view, setView] = useState<View>(
    () => (sessionStorage.getItem("executive_token") ? "home" : "login"),
  );
  const [activeModule, setActiveModule] = useState("");
  const [config, setConfig] = useState<ExecConfig>(() => {
    try {
      return JSON.parse(localStorage.getItem("executive_config") || "null") ?? DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  function onLogin(t: string) {
    sessionStorage.setItem("executive_token", t);
    setToken(t);
    setView("home");
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
    localStorage.setItem("executive_config", JSON.stringify(c));
  }

  if (!token || view === "login") {
    return <ExecutiveLogin onLogin={onLogin} config={config} />;
  }
  if (view === "config") {
    return (
      <ExecutiveConfig
        config={config}
        onSave={onSaveConfig}
        onBack={() => setView("home")}
        onLogout={onLogout}
      />
    );
  }
  if (view === "report" && activeModule) {
    return (
      <ExecutiveReport
        token={token}
        module={activeModule}
        config={config}
        onBack={() => setView("home")}
        onAuthError={onAuthError}
      />
    );
  }
  return (
    <ExecutiveHome
      token={token}
      config={config}
      onReport={(mod) => { setActiveModule(mod); setView("report"); }}
      onConfig={() => setView("config")}
      onAuthError={onAuthError}
    />
  );
}
