import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import ReportsFiltersModal from "./ReportsFiltersModal";

export default function ReportsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [categorySummary, setCategorySummary] = useState<any[]>([]);
  const [incomeStatement, setIncomeStatement] = useState<any>(null);
  const [breakEvenPoint, setBreakEvenPoint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadReports();
  }, [startDate, endDate]);

  async function loadReports() {
    try {
      setLoading(true);
      setError("");
      const [cashRes, balanceRes, categoryRes, incomeRes, breakEvenRes] = await Promise.all([
        api.get("/reports/cash-flow", { params: { startDate, endDate } }),
        api.get("/reports/balance-by-account"),
        api.get("/reports/category-summary", { params: { startDate, endDate } }),
        api.get("/reports/income-statement", { params: { startDate, endDate } }),
        api.get("/reports/break-even-point", { params: { startDate, endDate } }),
      ]);

      setCashFlow(cashRes.data);
      setBalances(Array.isArray(balanceRes.data) ? balanceRes.data : []);
      setCategorySummary(Array.isArray(categoryRes.data) ? categoryRes.data : []);
      setIncomeStatement(incomeRes.data);
      setBreakEvenPoint(breakEvenRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar reportes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <ReportsFiltersModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        startDate={startDate}
        endDate={endDate}
        onApply={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }}
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Reportes</h2>
            <p className="text-slate-400">Flujo de efectivo, balance y categorias</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
            Filtros
          </button>
        </div>

        {error && <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">{error}</div>}
        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando reportes...</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-3 text-lg font-semibold">Flujo de efectivo</h3>
              <p className="text-sm text-slate-400">Ingresos: {Number(cashFlow?.income || 0)}</p>
              <p className="text-sm text-slate-400">Egresos: {Number(cashFlow?.expense || 0)}</p>
              <p className="text-sm text-white">Neto: {Number(cashFlow?.net || 0)}</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-3 text-lg font-semibold">Balance por cuenta</h3>
              <div className="space-y-2">
                {balances.map((row) => (
                  <div key={row.accountId} className="text-sm text-slate-300">
                    {row.accountName} ({row.bank}) - {Number(row.balance)} {row.currency}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-3 text-lg font-semibold">Resumen por categoria</h3>
              <div className="space-y-2">
                {categorySummary.map((row, index) => (
                  <div key={`${row.category}-${index}`} className="text-sm text-slate-300">
                    {row.category} ({row.type}) - {Number(row.total)}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-3 text-lg font-semibold">Estado de Resultados</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Ventas</span>
                  <span>{Number(incomeStatement?.ventas || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Cortesías y Descuentos</span>
                  <span>-{Number(incomeStatement?.cortesiasDescuentos || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Costo de Venta</span>
                  <span>-{Number(incomeStatement?.costoVenta || 0)}</span>
                </div>
                <div className="flex justify-between font-semibold text-white border-t border-slate-700 pt-2">
                  <span>Utilidad Bruta</span>
                  <span>{Number(incomeStatement?.utilidadBruta || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Gastos Fijos</span>
                  <span>-{Number(incomeStatement?.gastosFijos || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Gastos Variables</span>
                  <span>-{Number(incomeStatement?.gastosVariables || 0)}</span>
                </div>
                <div className="flex justify-between font-semibold text-white border-t border-slate-700 pt-2">
                  <span>Utilidad Neta antes de impuestos</span>
                  <span>{Number(incomeStatement?.utilidadNetaAntesImpuestos || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Impuestos</span>
                  <span>-{Number(incomeStatement?.impuestos || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Inversiones</span>
                  <span>-{Number(incomeStatement?.inversiones || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-green-400 border-t border-slate-700 pt-2">
                  <span>Utilidad Real del Ejercicio</span>
                  <span>{Number(incomeStatement?.utilidadReal || 0)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-3 text-lg font-semibold">Punto de Equilibrio</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Ventas</span>
                  <span>{Number(breakEvenPoint?.ventas || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Costo Variable Total</span>
                  <span>{Number(breakEvenPoint?.costoVariableTotal || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Margen de Contribución</span>
                  <span>{(Number(breakEvenPoint?.margenContribucion || 0) * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Gastos Fijos</span>
                  <span>{Number(breakEvenPoint?.gastosFijos || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-blue-400 border-t border-slate-700 pt-2">
                  <span>Punto de Equilibrio</span>
                  <span>{Number(breakEvenPoint?.puntoEquilibrio || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
