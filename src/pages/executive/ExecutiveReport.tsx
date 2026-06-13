import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { execApi } from "./execApi";
import { getTheme } from "./theme";
import { MODULES, fmtValue } from "./modules";
import type { ExecConfig } from "./ExecutivePage";

interface Props {
  token: string;
  module: string;
  config: ExecConfig;
  onBack: () => void;
  onAuthError: () => void;
}

const CHART_WEIGHTS = [0.85, 1.10, 0.95, 1.20, 1.05, 0.70, 0.90];
const DAYS = ["L", "M", "X", "J", "V", "S", "D"];

export default function ExecutiveReport({ token, module, config, onBack, onAuthError }: Props) {
  const t = getTheme(config.theme);
  const modDef = MODULES.find((m) => m.key === module) ?? MODULES[0];
  const [value, setValue] = useState(0);
  const [variation, setVariation] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const eApi = execApi(token);
    async function load() {
      try {
        let val = 0;
        let varPct: number | null = null;

        if (module === "VENTAS" || module === "GASTOS") {
          const type = module === "VENTAS" ? "INCOME" : "EXPENSE";
          const movs = await eApi.get("/movements").then((r) => r.data).catch(() => []);
          const list = Array.isArray(movs) ? movs.filter((m: any) => m.type === type) : [];
          val = list.reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
          const kpis = await eApi.get("/dashboard/kpis").then((r) => r.data).catch(() => ({}));
          varPct = module === "VENTAS"
            ? Number(kpis.incomeVariation || 0)
            : Number(kpis.expenseVariation || 0);
        } else if (module === "SALDOS") {
          const banks = await eApi.get("/banks").then((r) => r.data).catch(() => []);
          val = Array.isArray(banks)
            ? banks.reduce((s: number, b: any) => s + Number(b.balance || 0), 0)
            : 0;
        } else if (module === "NOMINA") {
          const emps = await eApi.get("/hr/employees").then((r) => r.data).catch(() => []);
          const activos = Array.isArray(emps) ? emps.filter((e: any) => e.status === "ACTIVO") : [];
          val = activos.reduce((s: number, e: any) => s + Number(e.salarioQuincenal || 0), 0);
        } else if (module === "ROTACION" || module === "VACANTES") {
          const emps = await eApi.get("/hr/employees").then((r) => r.data).catch(() => []);
          const list = Array.isArray(emps) ? emps : [];
          if (module === "ROTACION") {
            const bajas = list.filter((e: any) => e.status === "BAJA");
            val = list.length > 0 ? Math.round((bajas.length / list.length) * 100) : 0;
          } else {
            val = list.filter((e: any) => e.status === "VACANTE").length;
          }
        }

        setValue(val);
        setVariation(varPct);
      } catch (err: any) {
        if (err.response?.status === 401) { onAuthError(); return; }
        setError("Error al cargar datos");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, module]);

  const base = value / 7;
  const chartData = CHART_WEIGHTS.map((w, i) => ({
    day: DAYS[i],
    value: Math.round(base * w),
  }));

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
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: "20px 24px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p style={{ color: t.secondary, fontSize: 11, letterSpacing: "0.12em" }}>
          {modDef.label}
        </p>
        <button
          onClick={onBack}
          style={{
            color: t.secondary,
            background: "none",
            border: "none",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            padding: 0,
          }}
        >
          Volver
        </button>
      </div>

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
        <>
          {/* Main value — centered */}
          <div
            style={{
              flexShrink: 0,
              padding: "28px 24px 4px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: t.text,
                fontSize: "4rem",
                fontWeight: 200,
                lineHeight: 1,
              }}
            >
              {fmtValue(value, modDef.format)}
            </p>
            {variation !== null && (
              <p
                style={{
                  color: variation >= 0 ? "#22C55E" : "#EF4444",
                  fontSize: 14,
                  marginTop: 10,
                  fontWeight: 300,
                }}
              >
                {variation >= 0 ? "+" : ""}
                {variation.toFixed(1)}%
              </p>
            )}
            <p
              style={{
                color: t.secondary,
                fontSize: 12,
                marginTop: 6,
              }}
            >
              {modDef.desc}
            </p>
          </div>

          {/* Chart fills remaining space */}
          <div
            style={{
              flex: 1,
              padding: "20px 8px 32px",
              minHeight: 0,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  tick={{ fill: t.secondary, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => [fmtValue(v, modDef.format), modDef.label]}
                  contentStyle={{
                    background: t.card,
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    color: t.text,
                    fontSize: 11,
                  }}
                  cursor={{ fill: t.bg + "80" }}
                />
                <Bar dataKey="value" fill={t.accent} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
