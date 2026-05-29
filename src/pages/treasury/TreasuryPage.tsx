import { useEffect, useState } from "react";
import { api } from "../../core/api/api";

type TabType = "executive" | "cashflow" | "bank" | "alerts";

export default function TreasuryPage() {
  const [activeTab, setActiveTab] = useState<TabType>("executive");
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [bankPosition, setBankPosition] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forecastDays, setForecastDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [activeTab, forecastDays]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      switch (activeTab) {
        case "executive":
          const execResponse = await api.get("/treasury/executive-summary");
          setExecutiveSummary(execResponse.data);
          break;
        case "cashflow":
          const cashResponse = await api.get(`/treasury/cash-flow-forecast?days=${forecastDays}`);
          setCashFlow(cashResponse.data);
          break;
        case "bank":
          const bankResponse = await api.get("/treasury/bank-position");
          setBankPosition(bankResponse.data);
          break;
        case "alerts":
          const alertsResponse = await api.get("/treasury/alerts");
          setAlerts(alertsResponse.data);
          break;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tesorería</h1>
        <p className="text-slate-400">Gestión financiera integral</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("executive")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "executive"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Resumen Ejecutivo
        </button>
        <button
          onClick={() => setActiveTab("cashflow")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "cashflow"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Flujo de Caja Proyectado
        </button>
        <button
          onClick={() => setActiveTab("bank")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "bank"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Posición Bancaria
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "alerts"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Alertas
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl bg-slate-900 p-6">Cargando...</div>
      ) : (
        <>
          {/* TAB 1: Resumen Ejecutivo */}
          {activeTab === "executive" && executiveSummary && (
            <div className="space-y-6">
              {/* KPIs principales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Saldo Total</h3>
                  <p className="text-3xl font-bold text-green-400">
                    ${Number(executiveSummary.totalBalance || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Flujo Neto del Mes</h3>
                  <p className={`text-3xl font-bold ${
                    executiveSummary.monthlyFlow?.net >= 0 ? "text-green-400" : "text-red-400"
                  }`}>
                    ${Number(executiveSummary.monthlyFlow?.net || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Comparativo Mes Anterior</h3>
                  <p className={`text-3xl font-bold ${
                    executiveSummary.comparison?.netChange >= 0 ? "text-green-400" : "text-red-400"
                  }`}>
                    {executiveSummary.comparison?.netChangePercent >= 0 ? "+" : ""}
                    {Number(executiveSummary.comparison?.netChangePercent || 0).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Flujo del mes vs mes anterior */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="mb-4 text-lg font-semibold">Comparativo Mensual</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="mb-3 text-sm text-slate-400">Este Mes</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-300">Ingresos</span>
                        <span className="text-green-400">
                          ${Number(executiveSummary.monthlyFlow?.income || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">Egresos</span>
                        <span className="text-red-400">
                          ${Number(executiveSummary.monthlyFlow?.expense || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-white">Neto</span>
                        <span className={executiveSummary.monthlyFlow?.net >= 0 ? "text-green-400" : "text-red-400"}>
                          ${Number(executiveSummary.monthlyFlow?.net || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-3 text-sm text-slate-400">Mes Anterior</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-300">Ingresos</span>
                        <span className="text-green-400">
                          ${Number(executiveSummary.lastMonthFlow?.income || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">Egresos</span>
                        <span className="text-red-400">
                          ${Number(executiveSummary.lastMonthFlow?.expense || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-white">Neto</span>
                        <span className={executiveSummary.lastMonthFlow?.net >= 0 ? "text-green-400" : "text-red-400"}>
                          ${Number(executiveSummary.lastMonthFlow?.net || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top 5 cuentas */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="mb-4 text-lg font-semibold">Top 5 Cuentas con Mayor Saldo</h3>
                <div className="space-y-2">
                  {executiveSummary.topAccounts?.map((account: any, index: number) => (
                    <div key={account.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-slate-500">#{index + 1}</span>
                        <div>
                          <p className="font-medium text-white">{account.name}</p>
                          <p className="text-sm text-slate-400">{account.bank} - {account.accountNumber}</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-green-400">
                        ${Number(account.balance).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alertas de saldo bajo */}
              {executiveSummary.lowBalanceAlerts?.length > 0 && (
                <div className="rounded-xl border border-yellow-700 bg-yellow-900/30 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-yellow-300">⚠️ Alertas de Saldo Bajo</h3>
                  <div className="space-y-2">
                    {executiveSummary.lowBalanceAlerts.map((alert: any) => (
                      <div key={alert.id} className="flex justify-between p-3 rounded-lg bg-yellow-900/50">
                        <div>
                          <p className="font-medium text-white">{alert.name}</p>
                          <p className="text-sm text-yellow-300">Saldo actual: ${Number(alert.balance).toFixed(2)}</p>
                        </div>
                        <span className="text-red-400 font-semibold">
                          -${Number(alert.deficit).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Flujo de Caja Proyectado */}
          {activeTab === "cashflow" && cashFlow && (
            <div className="space-y-6">
              <div className="flex gap-4 items-center">
                <label className="text-slate-400">Proyección a:</label>
                <select
                  value={forecastDays}
                  onChange={(e) => setForecastDays(Number(e.target.value))}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                >
                  <option value={30}>30 días</option>
                  <option value={60}>60 días</option>
                  <option value={90}>90 días</option>
                </select>
              </div>

              {/* Resumen de proyección */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Saldo Actual</h3>
                  <p className="text-2xl font-bold text-white">
                    ${Number(cashFlow.currentBalance || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Ingresos Esperados</h3>
                  <p className="text-2xl font-bold text-green-400">
                    ${Number(cashFlow.totalExpectedIncome || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Egresos Esperados</h3>
                  <p className="text-2xl font-bold text-red-400">
                    ${Number(cashFlow.totalExpectedExpense || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Saldo Proyectado</h3>
                  <p className={`text-2xl font-bold ${
                    cashFlow.projectedBalance >= 0 ? "text-green-400" : "text-red-400"
                  }`}>
                    ${Number(cashFlow.projectedBalance || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Tabla de proyección diaria */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <h3 className="p-4 text-lg font-semibold">Proyección Diaria</h3>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white">Fecha</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-white">Ingresos</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-white">Egresos</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-white">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {cashFlow.dailyForecast?.map((day: any) => (
                        <tr key={day.date} className="hover:bg-slate-800/50">
                          <td className="px-4 py-2 text-sm text-slate-300">{day.date}</td>
                          <td className="px-4 py-2 text-right text-sm text-green-400">
                            ${Number(day.income).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-red-400">
                            ${Number(day.expense).toFixed(2)}
                          </td>
                          <td className={`px-4 py-2 text-right text-sm font-semibold ${
                            day.balance >= 0 ? "text-white" : "text-red-400"
                          }`}>
                            ${Number(day.balance).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Posición Bancaria */}
          {activeTab === "bank" && bankPosition && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Saldo Total</h3>
                  <p className="text-2xl font-bold text-green-400">
                    ${Number(bankPosition.totalBalance || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Ingresos del Día</h3>
                  <p className="text-2xl font-bold text-green-400">
                    ${Number(bankPosition.totalTodayIncome || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Egresos del Día</h3>
                  <p className="text-2xl font-bold text-red-400">
                    ${Number(bankPosition.totalTodayExpense || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Tabla de cuentas */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <h3 className="p-4 text-lg font-semibold">Todas las Cuentas</h3>
                <table className="w-full">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-white">Cuenta</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-white">Banco</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-white">Saldo</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold text-white">Movimientos Hoy</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-white">Neto Hoy</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-white">Última Conciliación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {bankPosition.accounts?.map((account: any) => (
                      <tr key={account.id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{account.name}</p>
                          <p className="text-sm text-slate-400">{account.accountNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">{account.bank}</td>
                        <td className="px-4 py-3 text-right font-semibold text-white">
                          ${Number(account.balance).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-300">
                          {account.todayMovements}
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${
                          account.todayNet >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          ${Number(account.todayNet).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {account.lastReconciliation ? new Date(account.lastReconciliation).toLocaleDateString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Alertas */}
          {activeTab === "alerts" && alerts && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="mb-4 text-lg font-semibold">Total de Alertas</h3>
                <p className="text-4xl font-bold text-white">{alerts.totalAlerts || 0}</p>
              </div>

              {/* Cuentas con saldo bajo */}
              {alerts.lowBalanceAccounts?.length > 0 && (
                <div className="rounded-xl border border-yellow-700 bg-yellow-900/30 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-yellow-300">⚠️ Cuentas con Saldo Bajo</h3>
                  <div className="space-y-2">
                    {alerts.lowBalanceAccounts.map((alert: any, index: number) => (
                      <div key={index} className="flex justify-between p-3 rounded-lg bg-yellow-900/50">
                        <div>
                          <p className="font-medium text-white">{alert.message}</p>
                          <p className="text-sm text-yellow-300">Saldo: ${Number(alert.balance).toFixed(2)}</p>
                        </div>
                        <span className="text-red-400 font-semibold">ALERTA</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Facturas vencidas */}
              {alerts.overdueAlerts?.length > 0 && (
                <div className="rounded-xl border border-red-700 bg-red-900/30 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-red-300">🚨 Facturas Vencidas</h3>
                  <div className="space-y-2">
                    {alerts.overdueAlerts.map((alert: any, index: number) => (
                      <div key={index} className="flex justify-between p-3 rounded-lg bg-red-900/50">
                        <div>
                          <p className="font-medium text-white">{alert.message}</p>
                          <p className="text-sm text-red-300">Monto: ${Number(alert.amount).toFixed(2)}</p>
                        </div>
                        <span className="text-red-400 font-semibold">VENCIDO</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Próximos vencimientos */}
              {alerts.upcomingAlerts?.length > 0 && (
                <div className="rounded-xl border border-blue-700 bg-blue-900/30 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-blue-300">📅 Próximos Vencimientos</h3>
                  <div className="space-y-2">
                    {alerts.upcomingAlerts.map((alert: any, index: number) => (
                      <div key={index} className="flex justify-between p-3 rounded-lg bg-blue-900/50">
                        <div>
                          <p className="font-medium text-white">{alert.message}</p>
                          <p className="text-sm text-blue-300">
                            ${Number(alert.amount).toFixed(2)} - En {alert.daysUntil} días
                          </p>
                        </div>
                        <span className={`font-semibold ${
                          alert.severity === "ERROR" ? "text-red-400" :
                          alert.severity === "WARNING" ? "text-yellow-400" :
                          "text-blue-400"
                        }`}>
                          {alert.daysUntil <= 3 ? "URGENTE" : alert.daysUntil <= 7 ? "PRONTO" : "PROGRAMADO"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transferencias pendientes */}
              {alerts.pendingAlerts?.length > 0 && (
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-300">🔄 Transferencias Pendientes</h3>
                  <div className="space-y-2">
                    {alerts.pendingAlerts.map((alert: any, index: number) => (
                      <div key={index} className="flex justify-between p-3 rounded-lg bg-slate-700">
                        <div>
                          <p className="font-medium text-white">{alert.message}</p>
                          <p className="text-sm text-slate-400">Monto: ${Number(alert.amount).toFixed(2)}</p>
                        </div>
                        <span className="text-slate-400 font-semibold">PENDIENTE</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {alerts.totalAlerts === 0 && (
                <div className="rounded-xl border border-green-700 bg-green-900/30 p-6 text-center">
                  <p className="text-green-300 text-lg">✅ No hay alertas activas</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
