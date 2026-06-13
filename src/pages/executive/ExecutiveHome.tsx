import { useEffect, useState } from "react";
import { execApi } from "./execApi";
import { useBrandingStore } from "../../core/store/useBrandingStore";
import { getTheme, variationColor } from "./theme";
import { MODULES, fmtValue } from "./modules";
import type { ExecConfig } from "./ExecutivePage";

interface Props {
  token: string;
  config: ExecConfig;
  onReport: (module: string) => void;
  onConfig: () => void;
  onAuthError: () => void;
}

export default function ExecutiveHome({ token, config, onReport, onConfig, onAuthError }: Props) {
  const t = getTheme(config.theme);
  const { systemName } = useBrandingStore();
  const [values, setValues] = useState<Record<string, number>>({});
  const [variations, setVariations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
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
        setVariations({
          VENTAS: Number(kpisData.incomeVariation || 0),
          GASTOS: Number(kpisData.expenseVariation || 0),
        });
      } catch (err: any) {
        if (err.response?.status === 401) { onAuthError(); return; }
        setError("Error al cargar datos");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const visibleModules = MODULES.filter((m) => config.modules[m.key] !== false);

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
      {/* Header — single line */}
      <div
        style={{
          flexShrink: 0,
          padding: "20px 24px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p style={{ color: t.text, fontSize: 15, fontWeight: 500 }}>
          {systemName || "Vista Ejecutiva"}
        </p>
        <p style={{ color: t.secondary, fontSize: 12 }}>{today}</p>
      </div>

      {/* Module list */}
      {loading ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ color: t.secondary, fontSize: 13 }}>Cargando...</p>
        </div>
      ) : error ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ color: "#EF4444", fontSize: 13 }}>{error}</p>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "0 24px",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {visibleModules.map((mod, i) => {
            const value = values[mod.key] ?? 0;
            const variation = variations[mod.key];
            const isLast = i === visibleModules.length - 1;
            return (
              <button
                key={mod.key}
                onClick={() => onReport(mod.key)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "none",
                  border: "none",
                  borderBottom: isLast ? "none" : `1px solid ${t.border}`,
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  WebkitTapHighlightColor: "transparent",
                  outline: "none",
                  minHeight: 0,
                }}
              >
                <span
                  style={{
                    color: t.secondary,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textAlign: "left",
                    flexShrink: 0,
                  }}
                >
                  {mod.label}
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  {variation !== undefined && (
                    <span
                      style={{
                        fontSize: 11,
                        color: variationColor(variation, mod.positiveGood, t),
                      }}
                    >
                      {variation >= 0 ? "+" : ""}
                      {variation.toFixed(1)}%
                    </span>
                  )}
                  <span
                    style={{
                      color: t.text,
                      fontSize: "1.45rem",
                      fontWeight: 300,
                      lineHeight: 1,
                    }}
                  >
                    {fmtValue(value, mod.format)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          padding: "10px 24px 30px",
          textAlign: "center",
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
            letterSpacing: "0.06em",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Configuración
        </button>
      </div>
    </div>
  );
}
