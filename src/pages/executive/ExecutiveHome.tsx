import { useEffect, useState } from "react";
import { execApi } from "./execApi";
import { useBrandingStore } from "../../core/store/useBrandingStore";
import { getTheme } from "./theme";
import { MODULES, fmtValue } from "./modules";
import type { ExecConfig } from "./ExecutivePage";

interface Props {
  token: string;
  config: ExecConfig;
  onReport: (module: string) => void;
  onConfig: () => void;
  onLogout: () => void;
  onAuthError: () => void;
}

export default function ExecutiveHome({
  token, config, onReport, onConfig, onLogout, onAuthError,
}: Props) {
  const t = getTheme(config.theme);
  const { systemName } = useBrandingStore();
  const [values, setValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pressedModule, setPressedModule] = useState<string | null>(null);

  const cellBg = config.theme === "dark" ? "#161616" : "#F0F0F0";

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  useEffect(() => {
    const eApi = execApi(token);
    async function load() {
      try {
        const [kpisData, banksData, empsData] = await Promise.all([
          eApi.get("/dashboard/kpis").then((r) => r.data).catch(() => ({})),
          eApi.get("/banks").then((r) => r.data).catch(() => []),
          eApi.get("/hr/employees").then((r) => r.data).catch(() => []),
        ]);
        const banks = Array.isArray(banksData) ? banksData : [];
        const emps = Array.isArray(empsData) ? empsData : [];
        const saldos = banks.reduce((s: number, b: any) => s + Number(b.balance || 0), 0);
        const activos = emps.filter((e: any) => e.status === "ACTIVO");
        const nomina = activos.reduce((s: number, e: any) => s + Number(e.salarioQuincenal || 0), 0);
        const vacantes = emps.filter((e: any) => e.status === "VACANTE").length;
        const bajas = emps.filter((e: any) => e.status === "BAJA").length;
        const rotacion = emps.length > 0 ? Math.round((bajas / emps.length) * 100) : 0;
        setValues({
          VENTAS: Number(kpisData.income || 0),
          SALDOS: saldos,
          COSTOS: 0,
          GASTOS: Number(kpisData.expense || 0),
          NOMINA: nomina,
          PRESUPUESTO: 0,
          ROTACION: rotacion,
          VACANTES: vacantes,
        });
      } catch (err: any) {
        if (err.response?.status === 401) { onAuthError(); return; }
        const msg = err.response?.data?.message || err.message || "Error al cargar datos";
        setError(`${err.response?.status ? `${err.response.status} — ` : ""}${msg}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const visibleModules = MODULES.filter((m) => config.modules[m.key] !== false);
  const nRows = Math.ceil(visibleModules.length / 2);

  return (
    <div
      style={{
        height: "100vh",
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Header — centered, two lines */}
      <div
        style={{
          flexShrink: 0,
          padding: "24px 24px 16px",
          textAlign: "center",
        }}
      >
        <p style={{ color: t.text, fontSize: 15, fontWeight: 400, letterSpacing: "0.02em" }}>
          {systemName || "Vista Ejecutiva"}
        </p>
        <p style={{ color: t.secondary, fontSize: 11, marginTop: 3, letterSpacing: "0.04em" }}>
          {today}
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: t.secondary, fontSize: 13 }}>Cargando...</p>
        </div>
      ) : error ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
          <p style={{ color: "#EF4444", fontSize: 12, textAlign: "center", lineHeight: 1.5 }}>{error}</p>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gridTemplateRows: `repeat(${nRows}, 1fr)`,
            gap: 3,
            padding: "0 3px",
            minHeight: 0,
          }}
        >
          {visibleModules.map((mod) => {
            const value = values[mod.key] ?? 0;
            const isPressed = pressedModule === mod.key;
            return (
              <button
                key={mod.key}
                onClick={() => onReport(mod.key)}
                onPointerDown={() => setPressedModule(mod.key)}
                onPointerUp={() => setPressedModule(null)}
                onPointerLeave={() => setPressedModule(null)}
                style={{
                  background: cellBg,
                  border: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                  padding: "12px 14px",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  WebkitTapHighlightColor: "transparent",
                  outline: "none",
                  opacity: isPressed ? 0.45 : 1,
                  transition: "opacity 0.08s",
                  minHeight: 0,
                }}
              >
                <span
                  style={{
                    color: t.secondary,
                    fontSize: "0.6rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                    lineHeight: 1,
                  }}
                >
                  {mod.label}
                </span>
                <span
                  style={{
                    color: t.text,
                    fontSize: "1.6rem",
                    fontWeight: 300,
                    lineHeight: 1,
                  }}
                >
                  {fmtValue(value, mod.format)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          padding: "10px 20px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={onConfig}
          style={{
            background: "none",
            border: "none",
            color: t.secondary,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.04em",
            WebkitTapHighlightColor: "transparent",
            padding: 0,
          }}
        >
          Configuración
        </button>
        <button
          onClick={onLogout}
          style={{
            background: "none",
            border: "none",
            color: t.secondary,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.04em",
            WebkitTapHighlightColor: "transparent",
            padding: 0,
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
