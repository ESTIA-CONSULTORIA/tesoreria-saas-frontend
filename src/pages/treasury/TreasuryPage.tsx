import { useEffect, useState } from "react";
import { api } from "../../core/api/api";
import MainLayout from "../../core/layout/MainLayout";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

type TabType = "resumen" | "posicion" | "transferencias" | "programar" | "cxp" | "cxc" | "alertas";
type PeriodType = "week" | "month" | "quarter";

export default function TreasuryPage() {
  const [activeTab, setActiveTab] = useState<TabType>("resumen");
  const [period, setPeriod] = useState<PeriodType>("month");
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [bankPosition, setBankPosition] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [scheduledPayments, setScheduledPayments] = useState<any[]>([]);
  const [accountsPayable, setAccountsPayable] = useState<any[]>([]);
  const [accountsReceivable, setAccountsReceivable] = useState<any[]>([]);
  const [alertConfig, setAlertConfig] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);
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
        case "resumen":
          const execResponse = await api.get("/treasury/executive-summary");
          setExecutiveSummary(execResponse.data);
          const cashResponse = await api.get(`/treasury/cash-flow-forecast?days=${days}`);
          setCashFlow(cashResponse.data);
          const alertsResponse = await api.get("/treasury/alerts");
          setAlerts(alertsResponse.data);
          break;
        case "posicion":
          const bankResponse = await api.get("/treasury/bank-position");
          setBankPosition(bankResponse.data);
          break;
        case "transferencias":
          const banksRes = await api.get("/banks");
          setBanks(Array.isArray(banksRes.data) ? banksRes.data : []);
          break;
        case "programar":
          const scheduledRes = await api.get("/treasury/scheduled-payments");
          setScheduledPayments(Array.isArray(scheduledRes.data) ? scheduledRes.data : []);
          const banksForSchedule = await api.get("/banks");
          setBanks(Array.isArray(banksForSchedule.data) ? banksForSchedule.data : []);
          break;
        case "cxp":
          const cxpRes = await api.get("/treasury/accounts-payable");
          setAccountsPayable(Array.isArray(cxpRes.data) ? cxpRes.data : []);
          break;
        case "cxc":
          const cxcRes = await api.get("/treasury/accounts-receivable");
          setAccountsReceivable(Array.isArray(cxcRes.data) ? cxcRes.data : []);
          break;
        case "alertas":
          const configRes = await api.get("/treasury/alert-config");
          setAlertConfig(configRes.data);
          const alertsData = await api.get("/treasury/alerts");
          setAlerts(alertsData.data);
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
          onClick={() => setActiveTab("resumen")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "resumen"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Resumen
        </button>
        <button
          onClick={() => setActiveTab("posicion")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "posicion"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Posición Bancaria
        </button>
        <button
          onClick={() => setActiveTab("transferencias")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "transferencias"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Transferencias
        </button>
        <button
          onClick={() => setActiveTab("programar")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "programar"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Programar Pagos
        </button>
        <button
          onClick={() => setActiveTab("cxp")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "cxp"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          CxP
        </button>
        <button
          onClick={() => setActiveTab("cxc")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "cxc"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          CxC
        </button>
        <button
          onClick={() => setActiveTab("alertas")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "alertas"
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
          {/* TAB 1: Resumen - 4 KPIs + Gráfica + Próximos vencimientos + Alertas */}
          {activeTab === "resumen" && executiveSummary && (
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

              {/* Gráfica flujo proyectado */}
              {cashFlow && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-4 text-lg font-semibold">Flujo de Caja Proyectado (30 días)</h3>
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
              )}

              {/* Próximos 5 vencimientos CxP */}
              {alerts?.upcomingAlerts?.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-4 text-lg font-semibold">Próximos 5 Vencimientos (CxP)</h3>
                  <div className="space-y-2">
                    {alerts.upcomingAlerts
                      .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
                      .slice(0, 5)
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

              {/* Alertas activas */}
              {alerts && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-4 text-lg font-semibold">Alertas Activas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {alerts.lowBalanceAccounts?.length > 0 && (
                      <div className="p-4 rounded-lg bg-red-900/30 border border-red-700">
                        <p className="text-red-300 font-semibold">🏦 Saldo Bajo: {alerts.lowBalanceAccounts.length}</p>
                      </div>
                    )}
                    {alerts.overdueAlerts?.length > 0 && (
                      <div className="p-4 rounded-lg bg-red-900/30 border border-red-700">
                        <p className="text-red-300 font-semibold">📄 Vencidos: {alerts.overdueAlerts.length}</p>
                      </div>
                    )}
                    {alerts.pendingAlerts?.length > 0 && (
                      <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-700">
                        <p className="text-blue-300 font-semibold">💸 Pendientes: {alerts.pendingAlerts.length}</p>
                      </div>
                    )}
                  </div>
                  {alerts.totalAlerts === 0 && (
                    <p className="text-green-300 text-center py-4">✅ No hay alertas activas</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Posición Bancaria - Tabla con botón transferir */}
          {activeTab === "posicion" && bankPosition && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="mb-2 text-sm text-slate-400">Total Consolidado</h3>
                <p className="text-4xl font-bold text-white">
                  ${Number(bankPosition.totalBalance || 0).toFixed(2)}
                </p>
              </div>

              {/* Tabla de cuentas */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <h3 className="p-4 text-lg font-semibold">Posición por Cuenta</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white">Cuenta</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white">Banco</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-white">Saldo</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-white">Variación Hoy</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold text-white">Status</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold text-white">Acciones</th>
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
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              account.balance >= 0 ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                            }`}>
                              {account.balance >= 0 ? "Activo" : "Negativo"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setActiveTab("transferencias")}
                              className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                            >
                              Transferir
                            </button>
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
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Transferencias - Form e historial */}
          {activeTab === "transferencias" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formulario de transferencia */}
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-4 text-lg font-semibold">Nueva Transferencia</h3>
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Cuenta Origen</label>
                      <select className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white">
                        <option value="">Seleccionar cuenta</option>
                        {banks.map((bank: any) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.name} - ${Number(bank.balance).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Cuenta Destino</label>
                      <select className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white">
                        <option value="">Seleccionar cuenta</option>
                        {banks.map((bank: any) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.name} - ${Number(bank.balance).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Monto</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Concepto</label>
                      <input
                        type="text"
                        placeholder="Descripción de la transferencia"
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Referencia (opcional)</label>
                      <input
                        type="text"
                        placeholder="Número de referencia"
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                    >
                      Realizar Transferencia
                    </button>
                  </form>
                </div>

                {/* Historial reciente */}
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-4 text-lg font-semibold">Transferencias Recientes</h3>
                  <div className="space-y-2">
                    <p className="text-slate-400 text-center py-8">No hay transferencias recientes</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Programar Pagos - Lista con botón agregar */}
          {activeTab === "programar" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Pagos Programados</h3>
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">
                  + Programar Pago
                </button>
              </div>

              {scheduledPayments.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
                  <p className="text-slate-400">No hay pagos programados</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white">Concepto</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-white">Monto</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white">Fecha</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white">Tipo</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold text-white">Status</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold text-white">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {scheduledPayments.map((payment: any) => (
                        <tr key={payment.id} className="hover:bg-slate-800/50">
                          <td className="px-4 py-3 text-white">{payment.concept}</td>
                          <td className="px-4 py-3 text-right font-semibold text-white">
                            ${Number(payment.monto).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {new Date(payment.fechaProgramada).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              payment.tipo === 'INGRESO' ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'
                            }`}>
                              {payment.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              payment.status === 'PAGADO' ? 'bg-green-900/40 text-green-300' :
                              payment.status === 'CANCELADO' ? 'bg-red-900/40 text-red-300' :
                              'bg-yellow-900/40 text-yellow-300'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="px-2 py-1 rounded bg-slate-700 text-white text-xs hover:bg-slate-600">
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CxP - Facturas por pagar */}
          {activeTab === "cxp" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Cuentas por Pagar (CxP)</h3>

              {accountsPayable.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
                  <p className="text-slate-400">No hay cuentas por pagar</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white">Concepto</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-white">Monto</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white">Vencimiento</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold text-white">Días</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold text-white">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {accountsPayable.map((cxp: any) => (
                        <tr key={cxp.id} className="hover:bg-slate-800/50">
                          <td className="px-4 py-3 text-white">{cxp.concepto}</td>
                          <td className="px-4 py-3 text-right font-semibold text-white">
                            ${Number(cxp.monto).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {new Date(cxp.fechaVencimiento).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              cxp.diasHastaVencimiento < 7 ? 'bg-red-900/40 text-red-300' :
                              cxp.diasHastaVencimiento < 15 ? 'bg-yellow-900/40 text-yellow-300' :
                              'bg-green-900/40 text-green-300'
                            }`}>
                              {cxp.diasHastaVencimiento} días
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700">
                              Pagar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CxC - Cuentas por cobrar */}
          {activeTab === "cxc" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Cuentas por Cobrar (CxC)</h3>

              {accountsReceivable.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
                  <p className="text-slate-400">No hay cuentas por cobrar</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white">Concepto</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-white">Monto</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white">Fecha Esperada</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold text-white">Días</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {accountsReceivable.map((cxc: any) => (
                        <tr key={cxc.id} className="hover:bg-slate-800/50">
                          <td className="px-4 py-3 text-white">{cxc.concepto}</td>
                          <td className="px-4 py-3 text-right font-semibold text-white">
                            ${Number(cxc.monto).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {new Date(cxc.fechaEsperada).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-slate-300">
                            {cxc.diasHastaCobro} días
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 rounded bg-blue-900/40 text-blue-300 text-xs">
                              Pendiente
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: Alertas - Configuración y alertas activas */}
          {activeTab === "alertas" && (
            <div className="space-y-6">
              {/* Configuración de alertas */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="mb-4 text-lg font-semibold">Configuración de Alertas</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Saldo Mínimo ($)</label>
                    <input
                      type="number"
                      defaultValue={alertConfig?.saldoMinimo || 0}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Días Anticipación</label>
                    <input
                      type="number"
                      defaultValue={alertConfig?.diasAnticipacionAlerta || 7}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <button className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700">
                      Guardar Configuración
                    </button>
                  </div>
                </div>
              </div>

              {/* Alertas activas */}
              {alerts && (
                <div className="space-y-4">
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

                  {alerts.overdueAlerts?.length > 0 && (
                    <div className="rounded-xl border border-red-700 bg-red-900/30 p-6">
                      <h3 className="mb-4 text-lg font-semibold text-red-300">📄 Facturas Vencidas</h3>
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
            </div>
          )}
        </>
      )}
    </div>
    </MainLayout>
  );
}
