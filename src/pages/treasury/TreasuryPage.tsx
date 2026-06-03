import { useEffect, useState } from "react";
import { api } from "../../core/api/api";
import MainLayout from "../../core/layout/MainLayout";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

type TabType = "executive" | "cashflow" | "bank" | "alerts";
type PeriodType = "week" | "month" | "quarter";

export default function TreasuryPage() {
  const [activeTab, setActiveTab] = useState<TabType>("executive");
  const [period, setPeriod] = useState<PeriodType>("month");
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [bankPosition, setBankPosition] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [activeTab, period]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const days = period === "week" ? 7 : period === "month" ? 30 : 90;

      switch (activeTab) {
        case "executive":
          const execResponse = await api.get("/treasury/executive-summary");
          setExecutiveSummary(execResponse.data);
          break;
        case "cashflow":
          const cashResponse = await api.get(`/treasury/cash-flow-forecast?days=${days}`);
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

  function getDaysUntilPayment(date: string | Date): number {
    const paymentDate = new Date(date);
    const now = new Date();
    const diffTime = paymentDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function getPaymentColor(days: number): string {
    if (days < 7) return "bg-red-500";
    if (days < 15) return "bg-yellow-500";
    return "bg-green-500";
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tesorería</h1>
            <p className="text-slate-400">Gestión financiera integral</p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white"
          >
            <option value="week">Semana</option>
            <option value="month">Mes</option>
            <option value="quarter">Trimestre</option>
          </select>
        </div>

      {error && (
        <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 overflow-x-auto">
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
          {/* TAB 1: Resumen Ejecutivo - 4 KPIs */}
          {activeTab === "executive" && executiveSummary && (
            <div className="space-y-6">
              {/* 4 KPIs principales */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Saldo Total</h3>
                  <p className="text-3xl font-bold text-white">
                    ${Number(executiveSummary.totalBalance || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {executiveSummary.comparison?.netChangePercent >= 0 ? "+" : ""}
                    {Number(executiveSummary.comparison?.netChangePercent || 0).toFixed(1)}% vs mes anterior
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Ingresos del Período</h3>
                  <p className="text-3xl font-bold text-green-400">
                    ${Number(executiveSummary.monthlyFlow?.income || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Egresos del Período</h3>
                  <p className="text-3xl font-bold text-red-400">
                    ${Number(executiveSummary.monthlyFlow?.expense || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Flujo Neto</h3>
                  <p className={`text-3xl font-bold ${
                    executiveSummary.monthlyFlow?.net >= 0 ? "text-green-400" : "text-red-400"
                  }`}>
                    ${Number(executiveSummary.monthlyFlow?.net || 0).toFixed(2)}
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

          {/* TAB 2: Flujo de Caja Proyectado - Gráfica Recharts */}
          {activeTab === "cashflow" && cashFlow && (
            <div className="space-y-6">
              {/* Resumen de proyección */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Saldo Actual</h3>
                  <p className="text-2xl font-bold text-white">
                    ${Number(cashFlow.currentBalance || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Promedio Diario Ingresos</h3>
                  <p className="text-2xl font-bold text-green-400">
                    ${Number(cashFlow.avgDailyIncome || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-2 text-sm text-slate-400">Promedio Diario Egresos</h3>
                  <p className="text-2xl font-bold text-red-400">
                    ${Number(cashFlow.avgDailyExpense || 0).toFixed(2)}
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

              {/* Gráfica de flujo proyectado */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="mb-4 text-lg font-semibold">Flujo de Caja Proyectado</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={cashFlow.dailyForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8' }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => `$${value.toFixed(2)}`}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                      name="Ingresos"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expense" 
                      stackId="2"
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      fillOpacity={0.3}
                      name="Egresos"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Saldo"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla de proyección diaria */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <h3 className="p-4 text-lg font-semibold">Proyección Diaria</h3>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full min-w-[600px]">
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

          {/* TAB 3: Posición Bancaria - Tabla compacta */}
          {activeTab === "bank" && bankPosition && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="mb-2 text-sm text-slate-400">Total Consolidado</h3>
                <p className="text-4xl font-bold text-white">
                  ${Number(bankPosition.totalBalance || 0).toFixed(2)}
                </p>
              </div>

              {/* Tabla de cuentas compacta */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <h3 className="p-4 text-lg font-semibold">Posición por Cuenta</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white">Cuenta</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white">Banco</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-white">Saldo</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-white">Variación Hoy</th>
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
                          <td className={`px-4 py-3 text-right text-sm font-semibold ${
                            account.todayNet >= 0 ? "text-green-400" : "text-red-400"
                          }`}>
                            {account.todayNet >= 0 ? "+" : ""}${Number(account.todayNet).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-800">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 font-semibold text-white">Total</td>
                        <td className="px-4 py-3 text-right font-bold text-white">
                          ${Number(bankPosition.totalBalance || 0).toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${
                          (bankPosition.totalTodayIncome - bankPosition.totalTodayExpense) >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          ${(bankPosition.totalTodayIncome - bankPosition.totalTodayExpense).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Alertas - Cards con iconos y urgencia */}
          {activeTab === "alerts" && alerts && (
            <div className="space-y-6">
              {/* Próximos Vencimientos CxP con semáforo */}
              {alerts.upcomingAlerts?.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-4 text-lg font-semibold">Próximos Vencimientos (CxP)</h3>
                  <div className="space-y-2">
                    {alerts.upcomingAlerts
                      .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
                      .map((alert: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-800">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getPaymentColor(alert.daysUntil)}`} />
                            <div>
                              <p className="font-medium text-white">{alert.concept || alert.message}</p>
                              <p className="text-sm text-slate-400">
                                ${Number(alert.amount).toFixed(2)} - En {alert.daysUntil} días
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            alert.daysUntil < 7 ? "bg-red-900 text-red-300" :
                            alert.daysUntil < 15 ? "bg-yellow-900 text-yellow-300" :
                            "bg-green-900 text-green-300"
                          }`}>
                            {alert.daysUntil < 7 ? "URGENTE" : alert.daysUntil < 15 ? "PRONTO" : "PROGRAMADO"}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Cuentas con saldo bajo */}
              {alerts.lowBalanceAccounts?.length > 0 && (
                <div className="rounded-xl border border-red-700 bg-red-900/30 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-red-300">⚠️ Cuentas con Saldo Bajo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {alerts.lowBalanceAccounts.map((alert: any, index: number) => (
                      <div key={index} className="p-4 rounded-lg bg-red-900/50 border border-red-700">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">🏦</span>
                          <div>
                            <p className="font-medium text-white">{alert.account}</p>
                            <p className="text-sm text-red-300">Saldo: ${Number(alert.balance).toFixed(2)}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-red-400">ALTA URGENCIA</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Facturas vencidas */}
              {alerts.overdueAlerts?.length > 0 && (
                <div className="rounded-xl border border-red-700 bg-red-900/30 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-red-300">� Facturas Vencidas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {alerts.overdueAlerts.map((alert: any, index: number) => (
                      <div key={index} className="p-4 rounded-lg bg-red-900/50 border border-red-700">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">📄</span>
                          <div>
                            <p className="font-medium text-white">{alert.concept}</p>
                            <p className="text-sm text-red-300">Monto: ${Number(alert.amount).toFixed(2)}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-red-400">VENCIDO</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transferencias pendientes */}
              {alerts.pendingAlerts?.length > 0 && (
                <div className="rounded-xl border border-blue-700 bg-blue-900/30 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-blue-300">🔄 Transferencias Pendientes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {alerts.pendingAlerts.map((alert: any, index: number) => (
                      <div key={index} className="p-4 rounded-lg bg-blue-900/50 border border-blue-700">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">💸</span>
                          <div>
                            <p className="font-medium text-white">{alert.concept}</p>
                            <p className="text-sm text-blue-300">Monto: ${Number(alert.amount).toFixed(2)}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-blue-400">PENDIENTE</span>
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
    </MainLayout>
  );
}
