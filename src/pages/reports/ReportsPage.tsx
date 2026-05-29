import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import ReportsFiltersModal from "./ReportsFiltersModal";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [period, setPeriod] = useState("mes");
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

        <div className="flex gap-2 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "general"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("estado-resultados")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "estado-resultados"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Estado de Resultados Integral
          </button>
        </div>

        {error && <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">{error}</div>}
        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando reportes...</div>
        ) : (
          <div className="space-y-4">
            {activeTab === "general" && (
              <>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-3 text-lg font-semibold">Flujo de efectivo</h3>
                  <p className="text-sm text-slate-400">Ingresos: {Number(cashFlow?.income || 0)}</p>
                  <p className="text-sm text-slate-400">Egresos: {Number(cashFlow?.expense || 0)}</p>
                  <p className="text-sm text-white">Neto: {Number(cashFlow?.net || 0)}</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-3 text-lg font-semibold">Balance por cuenta</h3>
                  {balances.length === 0 ? (
                    <p className="text-sm text-slate-400">No hay cuentas bancarias registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {balances.map((row) => (
                        <div key={row.accountId} className="text-sm text-slate-300">
                          {row.accountName} ({row.bank}) - {Number(row.balance)} {row.currency}
                        </div>
                      ))}
                    </div>
                  )}
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
              </>
            )}

            {activeTab === "estado-resultados" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Estado de Resultados Integral</h3>
                  <div className="flex gap-2">
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm"
                    >
                      <option value="mes">Mes</option>
                      <option value="trimestre">Trimestre</option>
                      <option value="anio">Año</option>
                    </select>
                    <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                      Imprimir
                    </button>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="p-4 rounded-lg bg-slate-800">
                    <div className="font-semibold text-white mb-2">(+) INGRESOS</div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>Ventas brutas</span>
                      <span>{Number(incomeStatement?.ventas || 0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>(-) Descuentos y cortesías</span>
                      <span>-{Number(incomeStatement?.cortesiasDescuentos || 0)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-white pl-4 pt-2 border-t border-slate-700">
                      <span>(=) Ventas netas</span>
                      <span>{Number(incomeStatement?.ventas || 0) - Number(incomeStatement?.cortesiasDescuentos || 0)}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-800">
                    <div className="font-semibold text-white mb-2">(-) COSTO DE VENTA</div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>Inventario inicial</span>
                      <span>{Number(incomeStatement?.inventarioInicial || 0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>(+) Compras del período</span>
                      <span>{Number(incomeStatement?.comprasPeriodo || 0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>(-) Inventario final</span>
                      <span>-{Number(incomeStatement?.inventarioFinal || 0)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-white pl-4 pt-2 border-t border-slate-700">
                      <span>(=) Costo de venta</span>
                      <span>{Number(incomeStatement?.costoVenta || 0)}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-700">
                    <div className="flex justify-between font-bold text-white">
                      <span>(=) UTILIDAD BRUTA</span>
                      <span>{Number(incomeStatement?.utilidadBruta || 0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 mt-1">
                      <span>Margen bruto %</span>
                      <span>{incomeStatement?.ventas ? ((Number(incomeStatement?.utilidadBruta || 0) / Number(incomeStatement?.ventas)) * 100).toFixed(2) : 0}%</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-800">
                    <div className="font-semibold text-white mb-2">(-) GASTOS DE OPERACIÓN (por categoría)</div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>Gastos de operación</span>
                      <span>-{Number(incomeStatement?.gastosVariables || 0)}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-800">
                    <div className="font-semibold text-white mb-2">(-) GASTOS ADMINISTRATIVOS (por categoría)</div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>Gastos administrativos</span>
                      <span>-{Number(incomeStatement?.gastosFijos || 0)}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-700">
                    <div className="flex justify-between font-bold text-white">
                      <span>(=) UTILIDAD DE OPERACIÓN</span>
                      <span>{Number(incomeStatement?.utilidadNetaAntesImpuestos || 0)}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-800">
                    <div className="flex justify-between text-slate-300">
                      <span>(-) IMPUESTOS estimados</span>
                      <span>-{Number(incomeStatement?.impuestos || 0)}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-green-900/30 border border-green-700">
                    <div className="flex justify-between font-bold text-green-400">
                      <span>(=) UTILIDAD NETA</span>
                      <span>{Number(incomeStatement?.utilidadReal || 0)}</span>
                    </div>
                    <div className="flex justify-between text-green-300 mt-1">
                      <span>Margen neto %</span>
                      <span>{incomeStatement?.ventas ? ((Number(incomeStatement?.utilidadReal || 0) / Number(incomeStatement?.ventas)) * 100).toFixed(2) : 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
