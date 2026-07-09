import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { parseBusinessDate } from "../../core/utils/date";
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

type Period = "Semana" | "Quincena" | "Mes" | "Personalizado";

const PERIOD_PARAM: Record<Period, string> = { Semana: "week", Quincena: "fortnight", Mes: "month", Personalizado: "custom" };
const CHART_WEIGHTS = [0.85, 1.10, 0.95, 1.20, 1.05, 0.70, 0.90];
const CHART_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

function fmt(v: number) {
  return "$" + v.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

export default function ExecutiveReport({
  token, module, config, selectedCompanyId, onBack, onAuthError,
}: Props) {
  const t = getTheme(config.theme);
  const modDef = MODULES.find((m) => m.key === module) ?? MODULES[0];
  const [mainValue, setMainValue] = useState(0);
  const [mainDesc, setMainDesc] = useState(modDef.desc);
  const [subItems, setSubItems] = useState<SubItem[]>([]);
  const [chartDays, setChartDays] = useState<{ day: string; value: number }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("Semana");
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [giroDetected, setGiroDetected] = useState<"restaurant" | "retail" | "default">("default");
  const [isLite, setIsLite] = useState(false);
  const [byDayData, setByDayData] = useState<{ label: string; total: number; canales: any[] }[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const showPeriodSelector = module === "VENTA";
  const showChart = module === "FLUJO" && chartDays !== null;

  useEffect(() => {
    const eApi = execApi(token, selectedCompanyId);
    setLoading(true);
    setError("");
    setChartDays(null);
    setMainDesc(modDef.desc);

    async function load() {
      try {
        let val = 0;
        let items: SubItem[] = [];
        let chart: { day: string; value: number }[] | null = null;

        // Detect LITE plan
        let lite = false;
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const tid: string = payload.tenantId || '';
          if (tid) {
            const r = await eApi.get(`/tenants/${tid}`);
            const plan: string = r.data?.plan || '';
            lite = plan === 'LITE_CORTE' || plan === 'LITE_POS';
            setIsLite(lite);
          }
        } catch { /* no-op */ }

        const shiftTotal = (s: any): number => {
          let total = Number(s.efectivoContado || 0);
          let tarjeta = 0, transf = 0, plat = 0, prom = 0, cortesia = 0, descuento = 0, gasto = 0;
          if (s.notas) {
            const mTar = s.notas.match(/Tarjeta[:\s]+\$?([\d,]+\.?\d*)/i);
            const mTrf = s.notas.match(/Transferencia[:\s]+\$?([\d,]+\.?\d*)/i);
            const mPlt = s.notas.match(/Plataformas[:\s]+\$?([\d,]+\.?\d*)/i);
            const mPrm = s.notas.match(/Promociones[:\s]+\$?([\d,]+\.?\d*)/i);
            const mCor = s.notas.match(/Cortesías[:\s]+\$?([\d,]+\.?\d*)/i);
            const mDes = s.notas.match(/Descuentos[:\s]+\$?([\d,]+\.?\d*)/i);
            const mGas = s.notas.match(/Gastos[:\s]+\$?([\d,]+\.?\d*)/i);
            if (mTar) tarjeta   = parseFloat(mTar[1].replace(/,/g, ''));
            if (mTrf) transf    = parseFloat(mTrf[1].replace(/,/g, ''));
            if (mPlt) plat      = parseFloat(mPlt[1].replace(/,/g, ''));
            if (mPrm) prom      = parseFloat(mPrm[1].replace(/,/g, ''));
            if (mCor) cortesia  = parseFloat(mCor[1].replace(/,/g, ''));
            if (mDes) descuento = parseFloat(mDes[1].replace(/,/g, ''));
            if (mGas) gasto     = parseFloat(mGas[1].replace(/,/g, ''));
          }
          // Columnas reales (backfill) tienen prioridad sobre notas; turnos Lite
          // normales dejan estas columnas en 0 y el monto real vive solo en notas.
          if (Number(s.totalTarjeta) > 0) tarjeta = Number(s.totalTarjeta);
          if (Number(s.totalTransferencia) > 0) transf = Number(s.totalTransferencia);
          if (Number(s.totalCortesia) > 0) cortesia = Number(s.totalCortesia);
          total += tarjeta + transf + plat + prom;
          total -= cortesia + descuento + gasto;
          return total;
        };

        if (module === "VENTA" && lite) {
          const now = new Date();
          const dateFrom = period === "Personalizado" && customFrom
            ? new Date(customFrom).toISOString()
            : period === "Quincena"
            ? new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
            : period === "Semana"
            ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

          const dateTo = period === "Personalizado" && customTo
            ? new Date(customTo + 'T23:59:59').toISOString()
            : now.toISOString();

          const res = await eApi.get('/pos/shifts', { params: { limit: 100, from: dateFrom } });
          const rawData = res.data;
          const allShifts = Array.isArray(rawData) ? rawData : Array.isArray(rawData?.value) ? rawData.value : [];
          const shifts = allShifts.filter((s: any) => {
            const fecha = parseBusinessDate(s.fecha || s.createdAt);
            return fecha >= new Date(dateFrom) && fecha <= new Date(dateTo);
          });

          val = shifts.reduce((sum: number, s: any) => sum + shiftTotal(s), 0);

          const byDayMap: Record<string, { total: number; canales: any[] }> = {};
          shifts.forEach((s: any) => {
            const fecha = parseBusinessDate(s.fecha || s.createdAt);
            const label = fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
            if (!byDayMap[label]) byDayMap[label] = { total: 0, canales: [] };

            const efectivo = Number(s.efectivoContado || 0);
            let tarjeta = 0, transf = 0, plat = 0, prom = 0, cortesia = 0, descuento = 0, gasto = 0;
            if (s.notas) {
              const mTar = s.notas.match(/Tarjeta[:\s]+\$?([\d,]+\.?\d*)/i);
              const mTrf = s.notas.match(/Transferencia[:\s]+\$?([\d,]+\.?\d*)/i);
              const mPlt = s.notas.match(/Plataformas[:\s]+\$?([\d,]+\.?\d*)/i);
              const mPrm = s.notas.match(/Promociones[:\s]+\$?([\d,]+\.?\d*)/i);
              const mCor = s.notas.match(/Cortesías[:\s]+\$?([\d,]+\.?\d*)/i);
              const mDes = s.notas.match(/Descuentos[:\s]+\$?([\d,]+\.?\d*)/i);
              const mGas = s.notas.match(/Gastos[:\s]+\$?([\d,]+\.?\d*)/i);
              if (mTar) tarjeta  = parseFloat(mTar[1].replace(/,/g, ''));
              if (mTrf) transf   = parseFloat(mTrf[1].replace(/,/g, ''));
              if (mPlt) plat     = parseFloat(mPlt[1].replace(/,/g, ''));
              if (mPrm) prom     = parseFloat(mPrm[1].replace(/,/g, ''));
              if (mCor) cortesia = parseFloat(mCor[1].replace(/,/g, ''));
              if (mDes) descuento= parseFloat(mDes[1].replace(/,/g, ''));
              if (mGas) gasto    = parseFloat(mGas[1].replace(/,/g, ''));
            }
            // Columnas reales (backfill) tienen prioridad sobre notas; turnos Lite
            // normales dejan estas columnas en 0 y el monto real vive solo en notas.
            if (Number(s.totalTarjeta) > 0) tarjeta = Number(s.totalTarjeta);
            if (Number(s.totalTransferencia) > 0) transf = Number(s.totalTransferencia);
            if (Number(s.totalCortesia) > 0) cortesia = Number(s.totalCortesia);
            byDayMap[label].total += efectivo + tarjeta + transf + plat + prom - cortesia - descuento - gasto;
            byDayMap[label].canales = [
              { label: 'Efectivo',      valor: efectivo,  resta: false },
              { label: 'Tarjeta',       valor: tarjeta,   resta: false },
              { label: 'Transferencia', valor: transf,    resta: false },
              { label: 'Plataformas',   valor: plat,      resta: false },
              { label: 'Promociones',   valor: prom,      resta: false },
              { label: 'Cortesías',     valor: cortesia,  resta: true  },
              { label: 'Descuentos',    valor: descuento, resta: true  },
              { label: 'Gastos',        valor: gasto,     resta: true  },
            ].filter(c => c.valor > 0);
          });

          const byDayArr = Object.entries(byDayMap)
            .map(([label, data]) => ({ label, ...data }))
            .sort((a, b) => new Date(b.label).getTime() - new Date(a.label).getTime());

          setByDayData(byDayArr);
          setMainDesc(`${shifts.length} corte${shifts.length !== 1 ? 's' : ''} — ${period}`);
          items = byDayArr.length === 0 ? [{ label: 'SIN CORTES', value: '—' }] : [];
        }

        else if (module === "VENTA") {
          const RESTAURANT_KEYS = ["restaurante","restaurant","food","alimento","cocina","bar","café","cafeteria"];
          const RETAIL_KEYS = ["retail","comercio","tienda"];

          let giro: "restaurant" | "retail" | "default" = "default";
          if (selectedCompanyId) {
            const compData = await eApi.get(`/companies/${selectedCompanyId}`)
              .then((r) => r.data).catch(() => null);
            if (compData) {
              const g = (compData.giro || compData.businessType || compData.tipo || "").toLowerCase();
              if (RESTAURANT_KEYS.some((k) => g.includes(k))) giro = "restaurant";
              else if (RETAIL_KEYS.some((k) => g.includes(k))) giro = "retail";
            }
          }
          setGiroDetected(giro);

          if (giro === "restaurant") {
            const salesData = await eApi.get("/pos/sales").then((r) => r.data).catch(() => null);
            const allSales = Array.isArray(salesData) ? salesData : [];
            val = allSales.reduce((s: number, sale: any) => s + Number(sale.total || 0), 0);
            const ticketProm = allSales.length > 0 ? Math.round(val / allSales.length) : 0;

            const todayStr = new Date().toISOString().slice(0, 10);
            const yd = new Date(); yd.setDate(yd.getDate() - 1);
            const yesterdayStr = yd.toISOString().slice(0, 10);

            const hoy = allSales
              .filter((s: any) => (s.date || s.createdAt || "").slice(0, 10) === todayStr)
              .reduce((s: number, sale: any) => s + Number(sale.total || 0), 0);
            const ayer = allSales
              .filter((s: any) => (s.date || s.createdAt || "").slice(0, 10) === yesterdayStr)
              .reduce((s: number, sale: any) => s + Number(sale.total || 0), 0);

            const productMap: Record<string, number> = {};
            allSales.forEach((sale: any) => {
              const saleItems = sale.items || sale.productos || [];
              if (Array.isArray(saleItems)) {
                saleItems.forEach((item: any) => {
                  const name = item.productName || item.nombre || item.product || "Producto";
                  productMap[name] = (productMap[name] || 0) + Number(item.quantity || item.cantidad || 1);
                });
              }
            });
            const top2 = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 2);

            setMainDesc("Ventas punto de venta");
            items = [
              { label: "TICKET PROMEDIO", value: fmt(ticketProm) },
              { label: "VENTAS HOY", value: fmt(hoy) },
              { label: "VENTAS AYER", value: fmt(ayer) },
              ...top2.map(([name, qty]) => ({ label: name.toUpperCase().slice(0, 18), value: `×${qty}` })),
            ];
          } else if (giro === "retail") {
            const [kpisData, movsData] = await Promise.all([
              eApi.get("/dashboard/kpis").then((r) => r.data).catch(() => ({})),
              eApi.get("/movements").then((r) => r.data).catch(() => []),
            ]);
            val = Number(kpisData.income || 0);

            const incomes = Array.isArray(movsData)
              ? movsData.filter((m: any) => m.type === "INCOME")
              : [];
            const conceptMap: Record<string, number> = {};
            incomes.forEach((m: any) => {
              const k = m.concept || m.description || "Sin concepto";
              conceptMap[k] = (conceptMap[k] || 0) + Number(m.amount || 0);
            });
            const topEntry = Object.entries(conceptMap).sort((a, b) => b[1] - a[1])[0];

            items = [
              { label: "MARGEN EST.", value: fmt(Math.round(val * 0.4)) },
              {
                label: topEntry ? topEntry[0].toUpperCase().slice(0, 18) : "SIN DATOS",
                value: topEntry ? fmt(topEntry[1]) : "—",
              },
            ];
          } else {
            const [kpisData, movsData] = await Promise.all([
              eApi.get("/dashboard/kpis", { params: { period: PERIOD_PARAM[period] } })
                .then((r) => r.data),
              eApi.get("/movements").then((r) => r.data).catch(() => []),
            ]);

            val = Number(kpisData.income || 0);
            const allMovs = Array.isArray(movsData) ? movsData : [];
            const incomes = allMovs.filter((m: any) => m.type === "INCOME");

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayVal = incomes
              .filter((m: any) => new Date(m.date || m.createdAt) >= todayStart)
              .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);

            const conceptMap: Record<string, number> = {};
            incomes.forEach((m: any) => {
              const k = m.concept || m.description || "Sin concepto";
              conceptMap[k] = (conceptMap[k] || 0) + Number(m.amount || 0);
            });
            const top3 = Object.entries(conceptMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

            items = [
              { label: "HOY", value: fmt(todayVal) },
              ...top3.map(([k, v]) => ({ label: k.toUpperCase().slice(0, 18), value: fmt(v) })),
            ];
          }
        }

        else if (module === "COSTO") {
          const [costData, kpisData, insumosData, recipesData] = await Promise.all([
            eApi.get("/costs/cost-of-sales").then((r) => r.data).catch(() => null),
            eApi.get("/dashboard/kpis").then((r) => r.data).catch(() => ({})),
            eApi.get("/costs/insumos").then((r) => r.data).catch(() => null),
            eApi.get("/costs/recipes").then((r) => r.data).catch(() => null),
          ]);

          const income = Number(kpisData.income || 0);

          if (costData) {
            const raw = Number(costData.costoVentas || costData.total || costData.value || 0);
            if (raw > 0) {
              val = raw;
              setMainDesc("Costo de ventas registrado");
            } else {
              val = Math.round(income * 0.30);
              setMainDesc("Estimado 30% sobre ventas");
            }
          } else {
            val = Math.round(income * 0.30);
            setMainDesc("Estimado 30% sobre ventas");
          }

          const insumos = Array.isArray(insumosData) ? insumosData : [];
          const recipes = Array.isArray(recipesData) ? recipesData : [];
          const topInsumo = [...insumos].sort(
            (a: any, b: any) => Number(b.costoUnitario || 0) - Number(a.costoUnitario || 0),
          )[0];
          const topRecipe = [...recipes].sort(
            (a: any, b: any) => Number(b.costoTotal || 0) - Number(a.costoTotal || 0),
          )[0];
          const margin = income - val;
          const marginPct = income > 0 ? Math.round((margin / income) * 100) : 0;

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
          const [kpisData, movsData] = await Promise.all([
            eApi.get("/dashboard/kpis").then((r) => r.data),
            eApi.get("/movements").then((r) => r.data).catch(() => []),
          ]);

          val = Number(kpisData.expense || 0);

          const expenses = Array.isArray(movsData)
            ? movsData.filter((m: any) => m.type === "EXPENSE")
            : [];

          const catMap: Record<string, number> = {};
          expenses.forEach((m: any) => {
            const k = (m.category || "OTROS").toUpperCase();
            catMap[k] = (catMap[k] || 0) + Number(m.amount || 0);
          });
          const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 2);

          const conMap: Record<string, number> = {};
          expenses.forEach((m: any) => {
            const k = m.concept || m.description || "Sin concepto";
            conMap[k] = (conMap[k] || 0) + Number(m.amount || 0);
          });
          const top2 = Object.entries(conMap).sort((a, b) => b[1] - a[1]).slice(0, 2);

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
          const kpisData = await eApi.get("/dashboard/kpis").then((r) => r.data);
          const income = Number(kpisData.income || 0);
          const expense = Number(kpisData.expense || 0);
          val = income - expense;

          items = [
            { label: "INGRESOS", value: fmt(income) },
            { label: "EGRESOS", value: fmt(expense) },
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
            .sort((a: any, b: any) => Number(b.salarioQuincenal || 0) - Number(a.salarioQuincenal || 0))
            .slice(0, 3);

          items = [
            { label: "EMPLEADOS ACTIVOS", value: activos.length.toString() },
            { label: "PROMEDIO", value: fmt(promedio) },
            ...top3.map((e: any) => ({
              label: `${e.nombre || ""} ${e.apellidos || ""}`.trim().toUpperCase().slice(0, 18) || "EMPLEADO",
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
              label: `${e.nombre || ""} ${e.apellidos || ""}`.trim().toUpperCase().slice(0, 18) || "EMPLEADO",
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
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
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
          <div style={{ flexShrink: 0, padding: "14px 24px 0", textAlign: "center" }}>
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
              {mainDesc}
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
              <button
                onClick={() => setPeriod("Personalizado")}
                style={{
                  padding: '6px 16px', borderRadius: 99,
                  border: `1px solid ${period === "Personalizado" ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  background: period === "Personalizado" ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: period === "Personalizado" ? '#e8ecf0' : 'rgba(255,255,255,0.35)',
                  fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                RANGO
              </button>
            </div>
          )}

          {/* Date range inputs — Personalizado only */}
          {showPeriodSelector && period === "Personalizado" && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '12px 24px 0', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#c8cdd8', fontSize: 12 }}
              />
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>al</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#c8cdd8', fontSize: 12 }}
              />
            </div>
          )}

          {/* Sub-items card + optional chart */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              padding: "16px 20px",
            }}
          >
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
              {isLite && module === "VENTA" && byDayData.length > 0 ? (
                byDayData.map((day) => (
                  <div key={day.label}>
                    <div
                      onClick={() => setSelectedDay(selectedDay === day.label ? null : day.label)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px', cursor: 'pointer',
                        background: selectedDay === day.label ? 'rgba(143,175,212,0.05)' : 'transparent',
                        borderBottom: `1px solid ${t.separator}`,
                      }}
                    >
                      <span style={{ fontSize: 13, color: selectedDay === day.label ? '#8fafd4' : t.secondary, textTransform: 'capitalize' }}>
                        {day.label}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 400, color: t.text }}>
                        ${day.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {selectedDay === day.label && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 24px 12px' }}>
                        {day.canales.map((c: any) => (
                          <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${t.separator}` }}>
                            <span style={{ fontSize: 12, color: c.resta ? 'rgba(252,165,165,0.6)' : t.secondary }}>
                              {c.label}
                            </span>
                            <span style={{ fontSize: 12, color: c.resta ? 'rgba(252,165,165,0.7)' : t.text }}>
                              {c.resta ? '-' : ''}${Math.abs(c.valor).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                subItems.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderBottom: i < subItems.length - 1 ? `1px solid ${t.separator}` : "none",
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
                    <span style={{ color: t.text, fontSize: "0.85rem", fontWeight: 300 }}>
                      {item.value}
                    </span>
                  </div>
                ))
              )}
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
