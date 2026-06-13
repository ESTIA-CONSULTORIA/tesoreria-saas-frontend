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
  selectedCompanyId: string | null;
  onBack: () => void;
  onAuthError: () => void;
}

interface SubItem {
  label: string;
  value: string;
}

type Period = "Semana" | "Quincena" | "Mes";

const PERIOD_DAYS: Record<Period, number> = { Semana: 7, Quincena: 15, Mes: 30 };
const CHART_WEIGHTS = [0.85, 1.10, 0.95, 1.20, 1.05, 0.70, 0.90];
const CHART_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

function fmt(v: number) {
  return "$" + v.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

function cutoffDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export default function ExecutiveReport({
  token, module, config, selectedCompanyId, onBack, onAuthError,
}: Props) {
  const t = getTheme(config.theme);
  const modDef = MODULES.find((m) => m.key === module) ?? MODULES[0];
  const [mainValue, setMainValue] = useState(0);
  const [subItems, setSubItems] = useState<SubItem[]>([]);
  const [chartDays, setChartDays] = useState<{ day: string; value: number }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("Semana");

  const showPeriodSelector = module === "VENTA";
  const showChart = module === "FLUJO" && chartDays !== null;

  useEffect(() => {
    const eApi = execApi(token, selectedCompanyId);
    setLoading(true);
    setError("");
    setChartDays(null);

    async function load() {
      try {
        let val = 0;
        let items: SubItem[] = [];
        let chart: { day: string; value: number }[] | null = null;

        if (module === "VENTA") {
          const movs = await eApi.get("/movements").then((r) => r.data);
          const incomes = Array.isArray(movs)
            ? movs.filter((m: any) => m.type === "INCOME")
            : [];

          const cutoff = cutoffDate(PERIOD_DAYS[period]);
          const periodMovs = incomes.filter(
            (m: any) => new Date(m.date || m.createdAt) >= cutoff,
          );
          val = periodMovs.reduce((s: number, m: any) => s + Number(m.amount || 0), 0);

          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayVal = incomes
            .filter((m: any) => new Date(m.date || m.createdAt) >= todayStart)
            .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);

          const conceptMap: Record<string, number> = {};
          periodMovs.forEach((m: any) => {
            const k = m.concept || m.description || "Sin concepto";
            conceptMap[k] = (conceptMap[k] || 0) + Number(m.amount || 0);
          });
          const top3 = Object.entries(conceptMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

          items = [
            { label: "HOY", value: fmt(todayVal) },
            ...top3.map(([k, v]) => ({
              label: k.toUpperCase().slice(0, 18),
              value: fmt(v),
            })),
          ];
        }

        else if (module === "COSTO") {
          const [movs, insumosData, recipesData] = await Promise.all([
            eApi.get("/movements").then((r) => r.data),
            eApi.get("/costs/insumos").then((r) => r.data).catch(() => null),
            eApi.get("/costs/recipes").then((r) => r.data).catch(() => null),
          ]);

          const allMovs = Array.isArray(movs) ? movs : [];
          const expenses = allMovs.filter((m: any) => m.type === "EXPENSE");
          const incomes = allMovs.filter((m: any) => m.type === "INCOME");
          val = expenses.reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
          const totalIncome = incomes.reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
          const margin = totalIncome - val;
          const marginPct = totalIncome > 0 ? Math.round((margin / totalIncome) * 100) : 0;

          const insumos = Array.isArray(insumosData) ? insumosData : [];
          const recipes = Array.isArray(recipesData) ? recipesData : [];
          const topInsumo = [...insumos].sort(
            (a: any, b: any) => Number(b.costoUnitario || 0) - Number(a.costoUnitario || 0),
          )[0];
          const topRecipe = [...recipes].sort(
            (a: any, b: any) => Number(b.costoTotal || 0) - Number(a.costoTotal || 0),
          )[0];

          items = [
            {
              label: "INSUMO MAYOR COSTO",
              value: topInsumo
                ? `${(topInsumo.nombre || "—").slice(0, 14)} — ${fmt(Number(topInsumo.costoUnitario || 0))}`
                : "N/D",
            },
            {
              label: "RECETA MAYOR COSTO",
              value: topRecipe
                ? `${(topRecipe.nombre || "—").slice(0, 14)} — ${fmt(Number(topRecipe.costoTotal || 0))}`
                : "N/D",
            },
            { label: "MARGEN BRUTO", value: fmt(margin) },
            { label: "% MARGEN", value: `${marginPct}%` },
          ];
        }

        else if (module === "GASTO") {
          const movs = await eApi.get("/movements").then((r) => r.data);
          const expenses = Array.isArray(movs)
            ? movs.filter((m: any) => m.type === "EXPENSE")
            : [];
          val = expenses.reduce((s: number, m: any) => s + Number(m.amount || 0), 0);

          const catMap: Record<string, number> = {};
          expenses.forEach((m: any) => {
            const k = (m.category || "OTROS").toUpperCase();
            catMap[k] = (catMap[k] || 0) + Number(m.amount || 0);
          });
          const topCats = Object.entries(catMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);

          const conMap: Record<string, number> = {};
          expenses.forEach((m: any) => {
            const k = m.concept || m.description || "Sin concepto";
            conMap[k] = (conMap[k] || 0) + Number(m.amount || 0);
          });
          const top2 = Object.entries(conMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);

          items = [
            ...topCats.map(([k, v]) => ({ label: k.slice(0, 18), value: fmt(v) })),
            ...top2.map(([k, v]) => ({ label: k.toUpperCase().slice(0, 18), value: fmt(v) })),
          ];
        }

        else if (module === "PRESUPUESTO") {
          val = 0;
          items = [
            { label: "EJECUTADO", value: "$0" },
            { label: "DISPONIBLE", value: "$0" },
            { label: "ESTADO", value: "En desarrollo" },
          ];
        }

        else if (module === "FLUJO") {
          const movs = await eApi.get("/movements").then((r) => r.data);
          const allMovs = Array.isArray(movs) ? movs : [];
          const totalIncome = allMovs
            .filter((m: any) => m.type === "INCOME")
            .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
          const totalExpense = allMovs
            .filter((m: any) => m.type === "EXPENSE")
            .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
          val = totalIncome - totalExpense;

          items = [
            { label: "INGRESOS", value: fmt(totalIncome) },
            { label: "EGRESOS", value: fmt(totalExpense) },
          ];

          const base = Math.max(Math.abs(val) / 7, 1000);
          chart = CHART_WEIGHTS.map((w, i) => ({
            day: CHART_DAYS[i],
            value: Math.round(base * w),
          }));
        }

        else if (module === "BANCO") {
          const banks = await eApi.get("/banks").then((r) => r.data);
          const list = Array.isArray(banks) ? banks : [];
          val = list.reduce((s: number, b: any) => s + Number(b.balance || 0), 0);

          const sorted = [...list].sort(
            (a: any, b: any) => Number(b.balance || 0) - Number(a.balance || 0),
          );
          items = sorted.slice(0, 5).map((b: any) => ({
            label: (b.bank || b.name || "CUENTA").toUpperCase().slice(0, 18),
            value: fmt(Number(b.balance || 0)),
          }));
          if (items.length === 0) {
            items = [{ label: "SIN CUENTAS", value: "—" }];
          }
        }

        else if (module === "NOMINA") {
          const emps = await eApi.get("/hr/employees").then((r) => r.data);
          const list = Array.isArray(emps) ? emps : [];
          const activos = list.filter((e: any) => e.status === "ACTIVO");
          val = activos.reduce((s: number, e: any) => s + Number(e.salarioQuincenal || 0), 0);
          const promedio = activos.length > 0 ? Math.round(val / activos.length) : 0;

          const top3 = [...activos]
            .sort((a: any, b: any) =>
              Number(b.salarioQuincenal || 0) - Number(a.salarioQuincenal || 0),
            )
            .slice(0, 3);

          items = [
            { label: "EMPLEADOS ACTIVOS", value: activos.length.toString() },
            { label: "PROMEDIO", value: fmt(promedio) },
            ...top3.map((e: any) => ({
              label:
                `${e.nombre || ""} ${e.apellidos || ""}`.trim().toUpperCase().slice(0, 18) ||
                "EMPLEADO",
              value: fmt(Number(e.salarioQuincenal || 0)),
            })),
          ];
        }

        else if (module === "VACANTES") {
          const emps = await eApi.get("/hr/employees").then((r) => r.data);
          const list = Array.isArray(emps) ? emps : [];
          const vacantes = list.filter((e: any) => e.status === "VACANTE");
          val = vacantes.length;

          items = vacantes.slice(0, 5).map((e: any) => ({
            label: (e.puesto || e.position || "VACANTE").toUpperCase().slice(0, 18),
            value: (e.departamento || e.department || "—").slice(0, 16),
          }));
          if (items.length === 0) {
            items = [{ label: "VACANTES ABIERTAS", value: "Ninguna" }];
          }
        }

        else if (module === "ROTACION") {
          const emps = await eApi.get("/hr/employees").then((r) => r.data);
          const list = Array.isArray(emps) ? emps : [];
          const bajas = list.filter((e: any) => e.status === "BAJA");
          val = list.length > 0 ? Math.round((bajas.length / list.length) * 100) : 0;

          const ultimas3 = [...bajas]
            .sort((a: any, b: any) => {
              const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
              const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
              return db - da;
            })
            .slice(0, 3);

          items = [
            { label: "TOTAL EMPLEADOS", value: list.length.toString() },
            { label: "BAJAS", value: bajas.length.toString() },
            ...ultimas3.map((e: any) => ({
              label:
                `${e.nombre || ""} ${e.apellidos || ""}`.trim().toUpperCase().slice(0, 18) ||
                "EMPLEADO",
              value: (e.puesto || e.position || "—").slice(0, 16),
            })),
          ];
        }

        setMainValue(val);
        setSubItems(items);
        setChartDays(chart);
      } catch (err: any) {
        if (err.response?.status === 401) { onAuthError(); return; }
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.message || "Error de red";
        setError(status ? `${status} — ${msg}` : msg);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token, module, period, selectedCompanyId]);

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
        <span
          style={{
            color: t.secondary,
            fontSize: "0.65rem",
            fontWeight: 400,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          {modDef.label}
        </span>
        <button
          onClick={onBack}
          style={{
            color: t.secondary,
            background: "none",
            border: "none",
            fontSize: "0.65rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            padding: 0,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Volver
        </button>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: t.secondary, fontSize: 13 }}>Cargando...</p>
        </div>
      ) : error ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 32px",
            gap: 16,
          }}
        >
          <p style={{ color: "#EF4444", fontSize: 13, textAlign: "center", lineHeight: 1.6 }}>
            {error}
          </p>
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              color: t.secondary,
              fontSize: 12,
              padding: "8px 20px",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Volver
          </button>
        </div>
      ) : (
        <>
          {/* Main value */}
          <div
            style={{
              flexShrink: 0,
              padding: "14px 24px 0",
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: t.text,
                fontSize: "3.5rem",
                fontWeight: 200,
                lineHeight: 1,
                letterSpacing: "-0.01em",
              }}
            >
              {fmtValue(mainValue, modDef.format)}
            </p>
            <p
              style={{
                color: t.secondary,
                fontSize: "0.65rem",
                marginTop: 6,
                letterSpacing: "0.06em",
              }}
            >
              {modDef.desc}
            </p>
          </div>

          {/* Period chips — VENTA only */}
          {showPeriodSelector && (
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                justifyContent: "center",
                gap: 8,
                padding: "14px 24px 0",
              }}
            >
              {(["Semana", "Quincena", "Mes"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    background: period === p ? t.accent : "transparent",
                    color: period === p ? "#111111" : t.secondary,
                    border: `1px solid ${period === p ? t.accent : t.border}`,
                    borderRadius: 20,
                    padding: "6px 14px",
                    fontSize: "0.65rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Sub-items card */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              padding: "16px 20px",
              gap: showChart ? 0 : 0,
            }}
          >
            {/* Card container for sub-items */}
            <div
              style={{
                background: t.card,
                border: t.cardBorder,
                boxShadow: t.cardShadow,
                borderRadius: 12,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {subItems.map((item, i) => {
                const isLast = i === subItems.length - 1;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderBottom: !isLast ? `1px solid ${t.separator}` : "none",
                    }}
                  >
                    <span
                      style={{
                        color: t.secondary,
                        fontSize: "0.6rem",
                        fontWeight: 400,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        color: t.text,
                        fontSize: "0.85rem",
                        fontWeight: 300,
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Chart — FLUJO only */}
            {showChart && (
              <div style={{ flex: 1, minHeight: 0, paddingTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartDays!}
                    margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="day"
                      tick={{ fill: t.secondary, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v: number) => [fmt(v), "Flujo"]}
                      contentStyle={{
                        background: t.cardColor,
                        border: t.cardBorder,
                        borderRadius: 6,
                        color: t.text,
                        fontSize: 11,
                      }}
                      cursor={{ fill: `${t.bgColor}40` }}
                    />
                    <Bar dataKey="value" fill={t.accent} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
