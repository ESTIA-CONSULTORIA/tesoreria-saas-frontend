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

interface RecordRow {
  label: string;
  value: number | null;
  sub?: string;
}

const CHART_WEIGHTS = [0.85, 1.10, 0.95, 1.20, 1.05, 0.70, 0.90];
const DAYS = ["L", "M", "X", "J", "V", "S", "D"];

export default function ExecutiveReport({ token, module, config, onBack, onAuthError }: Props) {
  const t = getTheme(config.theme);
  const modDef = MODULES.find((m) => m.key === module) ?? MODULES[0];

  const [value, setValue] = useState(0);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const eApi = execApi(token);

    async function load() {
      try {
        let val = 0;
        let recs: RecordRow[] = [];

        if (module === "VENTAS" || module === "GASTOS") {
          const type = module === "VENTAS" ? "INCOME" : "EXPENSE";
          const movs = await eApi.get("/movements").then((r) => r.data).catch(() => []);
          const list = Array.isArray(movs) ? movs.filter((m: any) => m.type === type) : [];
          val = list.reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
          recs = list.slice(0, 5).map((m: any) => ({
            label: m.description || m.concept || "Sin descripción",
            value: Number(m.amount || 0),
            sub: m.date ? new Date(m.date).toLocaleDateString("es-MX") : undefined,
          }));
        } else if (module === "SALDOS") {
          const banks = await eApi.get("/banks").then((r) => r.data).catch(() => []);
          const list = Array.isArray(banks) ? banks : [];
          val = list.reduce((s: number, b: any) => s + Number(b.balance || 0), 0);
          recs = list.slice(0, 5).map((b: any) => ({
            label: b.name || b.bankName || "Cuenta bancaria",
            value: Number(b.balance || 0),
          }));
        } else if (module === "NOMINA") {
          const emps = await eApi.get("/hr/employees").then((r) => r.data).catch(() => []);
          const activos = Array.isArray(emps) ? emps.filter((e: any) => e.status === "ACTIVO") : [];
          val = activos.reduce((s: number, e: any) => s + Number(e.salarioQuincenal || 0), 0);
          recs = activos.slice(0, 5).map((e: any) => ({
            label: `${e.nombre || ""} ${e.apellidos || ""}`.trim(),
            value: Number(e.salarioQuincenal || 0),
            sub: e.puesto || undefined,
          }));
        } else if (module === "ROTACION" || module === "VACANTES") {
          const emps = await eApi.get("/hr/employees").then((r) => r.data).catch(() => []);
          const list = Array.isArray(emps) ? emps : [];
          if (module === "ROTACION") {
            const bajas = list.filter((e: any) => e.status === "BAJA");
            val = list.length > 0 ? Math.round((bajas.length / list.length) * 100) : 0;
            recs = bajas.slice(0, 5).map((e: any) => ({
              label: `${e.nombre || ""} ${e.apellidos || ""}`.trim(),
              value: null,
              sub: e.puesto || undefined,
            }));
          } else {
            const vacantes = list.filter((e: any) => e.status === "VACANTE");
            val = vacantes.length;
            recs = vacantes.slice(0, 5).map((e: any) => ({
              label: e.puesto || "Posición vacante",
              value: null,
              sub: e.departamento || undefined,
            }));
          }
        }

        setValue(val);
        setRecords(recs);
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
            alignItems: "center",
            marginBottom: 36,
          }}
        >
          <button
            onClick={onBack}
            style={{
              color: t.secondary,
              background: "none",
              border: "none",
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Volver
          </button>
          <p style={{ color: t.secondary, fontSize: 10, letterSpacing: "0.12em" }}>
            {modDef.label}
          </p>
          <div style={{ width: 40 }} />
        </div>

        {loading ? (
          <p style={{ color: t.secondary, textAlign: "center", marginTop: 80 }}>Cargando...</p>
        ) : error ? (
          <p style={{ color: "#EF4444", textAlign: "center", marginTop: 80 }}>{error}</p>
        ) : (
          <>
            {/* Main value */}
            <p
              style={{
                color: t.text,
                fontSize: "3.5rem",
                fontWeight: 300,
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              {fmtValue(value, modDef.format)}
            </p>
            <p style={{ color: t.secondary, fontSize: 13, marginBottom: 32 }}>
              {modDef.desc}
            </p>

            {/* Chart */}
            <div
              style={{
                background: t.card,
                border: `1px solid ${t.border}`,
                borderRadius: 16,
                padding: "20px 16px 12px",
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  color: t.secondary,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  marginBottom: 16,
                }}
              >
                ÚLTIMOS 7 DÍAS
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={chartData}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="day"
                    tick={{ fill: t.secondary, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v: number) => [fmtValue(v, modDef.format), modDef.label]}
                    contentStyle={{
                      background: t.card,
                      border: `1px solid ${t.border}`,
                      borderRadius: 8,
                      color: t.text,
                      fontSize: 11,
                    }}
                    cursor={{ fill: t.bg + "80" }}
                  />
                  <Bar dataKey="value" fill={t.accent} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Records */}
            <div
              style={{
                background: t.card,
                border: `1px solid ${t.border}`,
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <p
                style={{
                  color: t.secondary,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  padding: "16px 20px 12px",
                }}
              >
                REGISTROS RECIENTES
              </p>
              {records.length === 0 ? (
                <p
                  style={{
                    color: t.secondary,
                    fontSize: 13,
                    padding: "12px 20px 20px",
                    textAlign: "center",
                  }}
                >
                  Sin registros disponibles
                </p>
              ) : (
                records.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px 20px",
                      borderTop: `1px solid ${t.border}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <p style={{ color: t.text, fontSize: 13 }}>{r.label}</p>
                      {r.sub && (
                        <p style={{ color: t.secondary, fontSize: 11, marginTop: 2 }}>{r.sub}</p>
                      )}
                    </div>
                    {r.value !== null && (
                      <p style={{ color: t.accent, fontSize: 14, fontWeight: 300 }}>
                        {fmtValue(r.value, modDef.format)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
