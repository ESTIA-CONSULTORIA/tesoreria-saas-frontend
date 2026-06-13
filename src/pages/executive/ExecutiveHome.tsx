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
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const dateLabel = today.charAt(0).toUpperCase() + today.slice(1);

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
        minHeight: "100vh",
        background: t.bg,
        fontFamily: "'Inter', sans-serif",
        padding: "24px 24px 48px",
      }}
    >
      <div style={{ maxWidth: 430, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 36,
          }}
        >
          <div>
            <p style={{ color: t.secondary, fontSize: 11, letterSpacing: "0.1em", marginBottom: 4 }}>
              {dateLabel}
            </p>
            <p style={{ color: t.text, fontSize: 17, fontWeight: 600 }}>
              {systemName || "Vista Ejecutiva"}
            </p>
          </div>
          <button
            onClick={onConfig}
            style={{
              color: t.secondary,
              background: "none",
              border: "none",
              fontSize: 13,
              cursor: "pointer",
              padding: "4px 0",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Configuración
          </button>
        </div>

        {loading ? (
          <p style={{ color: t.secondary, textAlign: "center", marginTop: 80 }}>Cargando...</p>
        ) : error ? (
          <p style={{ color: "#EF4444", textAlign: "center", marginTop: 80 }}>{error}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleModules.map((mod) => {
              const value = values[mod.key] ?? 0;
              const variation = variations[mod.key];
              return (
                <button
                  key={mod.key}
                  onClick={() => onReport(mod.key)}
                  style={{
                    background: t.card,
                    border: `1px solid ${t.border}`,
                    borderRadius: 16,
                    padding: "20px 24px 18px",
                    textAlign: "left",
                    cursor: "pointer",
                    width: "100%",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <p
                    style={{
                      color: t.secondary,
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      marginBottom: 10,
                    }}
                  >
                    {mod.label}
                  </p>
                  <p
                    style={{
                      color: t.text,
                      fontSize: "2.6rem",
                      fontWeight: 300,
                      lineHeight: 1,
                      marginBottom: 10,
                    }}
                  >
                    {fmtValue(value, mod.format)}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <p style={{ color: t.secondary, fontSize: 12 }}>{mod.desc}</p>
                    {variation !== undefined && (
                      <p
                        style={{
                          fontSize: 12,
                          color: variationColor(variation, mod.positiveGood, t),
                        }}
                      >
                        {variation >= 0 ? "+" : ""}
                        {variation.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
