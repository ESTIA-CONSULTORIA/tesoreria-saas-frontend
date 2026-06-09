import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import ReportsFiltersModal from "./ReportsFiltersModal";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useCompanyStore } from "../../core/store/useCompanyStore";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportsPage() {
  const { activeCompany } = useCompanyStore();
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
    setDatesByPeriod(period);
  }, [period]);

  useEffect(() => {
    loadReports();
  }, [startDate, endDate, activeCompany?.id]);

  function setDatesByPeriod(selectedPeriod: string) {
    const now = new Date();
    let start = "";
    let end = "";

    switch (selectedPeriod) {
      case "mes":
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case "mes-anterior":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case "trimestre":
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), quarterStart, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), quarterStart + 3, 0).toISOString().split('T')[0];
        break;
      case "anio":
        start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
        break;
    }

    setStartDate(start);
    setEndDate(end);
  }

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

  function exportToCSV(data: any[], filename: string) {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
  }

  function exportIncomeStatementToPDF() {
    window.print();
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
      {!activeCompany ? (
        <div style={{ padding: '24px', backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', color: '#8A6A3A', textAlign: 'center' }}>
          Selecciona una empresa para ver los datos
        </div>
      ) : (
        <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Reportes</h2>
            <p className="text-slate-400">Flujo de efectivo, balance y categorías</p>
          </div>
          <div className="flex gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
            >
              <option value="mes">Mes actual</option>
              <option value="mes-anterior">Mes anterior</option>
              <option value="trimestre">Trimestre</option>
              <option value="anio">Año</option>
            </select>
            <button onClick={() => setModalOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
              Filtros personalizados
            </button>
          </div>
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
            Estado de Resultados
          </button>
          <button
            onClick={() => setActiveTab("flujo-efectivo")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "flujo-efectivo"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Flujo de Efectivo
          </button>
          <button
            onClick={() => setActiveTab("balance-cuentas")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "balance-cuentas"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Balance por Cuenta
          </button>
        </div>

        {error && <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">{error}</div>}
        
        {loading ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-900 p-6 animate-pulse">
              <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-slate-800 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            </div>
            <div className="rounded-xl bg-slate-900 p-6 animate-pulse">
              <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-slate-800 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === "general" && (
              <>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Flujo de efectivo</h3>
                    <button onClick={() => exportToCSV(cashFlow?.weekly || [], 'flujo-efectivo')} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                      Exportar CSV
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-green-900/20 border border-green-700">
                      <div className="text-sm text-green-400">Ingresos</div>
                      <div className="text-2xl font-bold text-white">${Number(cashFlow?.totalIncome || 0).toLocaleString()}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-red-900/20 border border-red-700">
                      <div className="text-sm text-red-400">Egresos</div>
                      <div className="text-2xl font-bold text-white">${Number(cashFlow?.totalExpense || 0).toLocaleString()}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-700">
                      <div className="text-sm text-blue-400">Neto</div>
                      <div className="text-2xl font-bold text-white">${Number(cashFlow?.totalNet || 0).toLocaleString()}</div>
                    </div>
                  </div>
                  {cashFlow?.weekly && cashFlow.weekly.length > 0 && (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={cashFlow.weekly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="week" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                        <Legend />
                        <Line type="monotone" dataKey="income" stroke="#10b981" name="Ingresos" strokeWidth={2} />
                        <Line type="monotone" dataKey="expense" stroke="#ef4444" name="Egresos" strokeWidth={2} />
                        <Line type="monotone" dataKey="net" stroke="#3b82f6" name="Neto" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Resumen por categoría</h3>
                    <button onClick={() => exportToCSV(categorySummary, 'resumen-categorias')} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                      Exportar CSV
                    </button>
                  </div>
                  {categorySummary.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categorySummary}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="category" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                        <Legend />
                        <Bar dataKey="total" fill="#3b82f6" name="Total" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-slate-400">No hay datos de categorías</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-3 text-lg font-semibold">Punto de Equilibrio</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-300">
                      <span>Ventas</span>
                      <span>${Number(breakEvenPoint?.ventas || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Costo Variable Total</span>
                      <span>${Number(breakEvenPoint?.costoVariableTotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Margen de Contribución</span>
                      <span>{(Number(breakEvenPoint?.margenContribucion || 0) * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Gastos Fijos</span>
                      <span>${Number(breakEvenPoint?.gastosFijos || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-blue-400 border-t border-slate-700 pt-2">
                      <span>Punto de Equilibrio</span>
                      <span>${Number(breakEvenPoint?.puntoEquilibrio || 0).toLocaleString()}</span>
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
                    <button onClick={exportIncomeStatementToPDF} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                      Exportar PDF
                    </button>
                    <button onClick={() => exportToCSV([incomeStatement], 'estado-resultados')} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                      Exportar CSV
                    </button>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="p-4 rounded-lg bg-slate-800">
                    <div className="font-semibold text-white mb-2">(+) INGRESOS</div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>Ventas</span>
                      <span>${Number(incomeStatement?.ingresos?.ventas || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>(-) Descuentos y cortesías</span>
                      <span>-${Number(incomeStatement?.ingresos?.cortesiasDescuentos || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-white pl-4 pt-2 border-t border-slate-700">
                      <span>(=) Total Ingresos</span>
                      <span>${Number(incomeStatement?.ingresos?.totalIngresos || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-800">
                    <div className="font-semibold text-white mb-2">(-) COSTO DE VENTA</div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>Costo de venta</span>
                      <span>-${Number(incomeStatement?.costos?.costoVenta || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-700">
                    <div className="flex justify-between font-bold text-white">
                      <span>(=) UTILIDAD BRUTA</span>
                      <span>${Number(incomeStatement?.utilidadBruta || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 mt-1">
                      <span>Margen bruto %</span>
                      <span>{incomeStatement?.ingresos?.ventas ? ((Number(incomeStatement?.utilidadBruta || 0) / Number(incomeStatement?.ingresos?.ventas)) * 100).toFixed(2) : 0}%</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-800">
                    <div className="font-semibold text-white mb-2">(-) GASTOS OPERATIVOS</div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>Gastos fijos</span>
                      <span>-${Number(incomeStatement?.gastosOperativos?.gastosFijos || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>Gastos variables</span>
                      <span>-${Number(incomeStatement?.gastosOperativos?.gastosVariables || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-white pl-4 pt-2 border-t border-slate-700">
                      <span>(=) Total Gastos Operativos</span>
                      <span>-${Number(incomeStatement?.gastosOperativos?.totalGastosOperativos || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-700">
                    <div className="flex justify-between font-bold text-white">
                      <span>(=) UTILIDAD OPERATIVA</span>
                      <span>${Number(incomeStatement?.utilidadOperativa || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-800">
                    <div className="font-semibold text-white mb-2">EBITDA (Estimado)</div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>EBITDA</span>
                      <span>${Number(incomeStatement?.ebitda || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-800">
                    <div className="font-semibold text-white mb-2">(-) OTROS</div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>Impuestos</span>
                      <span>-${Number(incomeStatement?.otros?.impuestos || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>Inversiones</span>
                      <span>-${Number(incomeStatement?.otros?.inversiones || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-green-900/30 border border-green-700">
                    <div className="flex justify-between font-bold text-green-400">
                      <span>(=) UTILIDAD NETA</span>
                      <span>${Number(incomeStatement?.utilidadNeta || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-green-300 mt-1">
                      <span>Margen neto %</span>
                      <span>{incomeStatement?.ingresos?.ventas ? ((Number(incomeStatement?.utilidadNeta || 0) / Number(incomeStatement?.ingresos?.ventas)) * 100).toFixed(2) : 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "flujo-efectivo" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Flujo de Efectivo Semanal</h3>
                  <button onClick={() => exportToCSV(cashFlow?.weekly || [], 'flujo-efectivo-semanal')} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                    Exportar CSV
                  </button>
                </div>
                {cashFlow?.weekly && cashFlow.weekly.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={cashFlow.weekly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="week" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                      <Legend />
                      <Line type="monotone" dataKey="income" stroke="#10b981" name="Ingresos" strokeWidth={2} dot={{ fill: '#10b981' }} />
                      <Line type="monotone" dataKey="expense" stroke="#ef4444" name="Egresos" strokeWidth={2} dot={{ fill: '#ef4444' }} />
                      <Line type="monotone" dataKey="net" stroke="#3b82f6" name="Saldo Neto" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-slate-400">No hay datos de flujo de efectivo</p>
                )}
              </div>
            )}

            {activeTab === "balance-cuentas" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Balance por Cuenta</h3>
                  <button onClick={() => exportToCSV(balances, 'balance-cuentas')} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                    Exportar CSV
                  </button>
                </div>
                {balances.length === 0 ? (
                  <p className="text-sm text-slate-400">No hay cuentas bancarias registradas</p>
                ) : (
                  <>
                    <div className="mb-6">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={balances}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="accountName" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                          <Legend />
                          <Bar dataKey="balance" fill="#3b82f6" name="Saldo" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {balances.map((row) => (
                        <div key={row.accountId} className="flex justify-between items-center p-3 rounded-lg bg-slate-800">
                          <div>
                            <div className="font-medium text-white">{row.accountName}</div>
                            <div className="text-sm text-slate-400">{row.bank}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-white">${Number(row.balance).toLocaleString()}</div>
                            <div className="text-sm text-slate-400">{row.currency}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </MainLayout>
  );
}
