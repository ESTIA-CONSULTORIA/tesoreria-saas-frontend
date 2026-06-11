import { useEffect, useState } from "react";
import { api } from "../../core/api/api";
import MainLayout from "../../core/layout/MainLayout";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import ExecutiveKPI from "../../components/ExecutiveKPI";
import { useCompanyStore } from "../../core/store/useCompanyStore";

type TabType = "resumen" | "posicion" | "traslados" | "cxp" | "cxc" | "alertas";
type PeriodType = "week" | "month" | "quarter";

export default function TreasuryPage() {
  const { activeBranch, activeCompany } = useCompanyStore();
  const [activeTab, setActiveTab] = useState<TabType>("resumen");
  const [period, setPeriod] = useState<PeriodType>("month");
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [bankPosition, setBankPosition] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [scheduledPayments, setScheduledPayments] = useState<any[]>([]);
  const [accountsPayable, setAccountsPayable] = useState<any[]>([]);
  const [accountsReceivable, setAccountsReceivable] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [alertConfig, setAlertConfig] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);
  const [showScheduledPayments, setShowScheduledPayments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transferForm, setTransferForm] = useState({
    tipo: "INTERNA" as "INTERNA" | "INTERCOMPAÑIA",
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    concept: "",
    referencia: "",
  });
  const [alertForm, setAlertForm] = useState({
    saldoMinimo: "",
    diasAnticipacionAlerta: "",
  });

  useEffect(() => {
    loadData();
  }, [activeTab, period, activeBranch?.id, activeCompany?.id]);

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
        case "traslados":
          const banksRes = await api.get("/banks");
          setBanks(Array.isArray(banksRes.data) ? banksRes.data : []);
          break;
        case "cxp":
          const cxpRes = await api.get("/treasury/accounts-payable");
          const cxpData = Array.isArray(cxpRes.data) ? cxpRes.data : [];
          setAccountsPayable(cxpData);
          const suppliersRes = await api.get("/suppliers");
          setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
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

  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/treasury/transfers", {
        ...transferForm,
        amount: Number(transferForm.amount),
      });
      setError("");
      alert("Traslado realizado exitosamente");
      setTransferForm({
        tipo: "INTERNA",
        fromAccountId: "",
        toAccountId: "",
        amount: "",
        concept: "",
        referencia: "",
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible realizar el traslado");
    }
  }

  async function handleAlertConfigSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.put("/treasury/alert-config", {
        saldoMinimo: Number(alertForm.saldoMinimo),
        diasAnticipacionAlerta: Number(alertForm.diasAnticipacionAlerta),
      });
      alert("Configuración de alertas guardada exitosamente");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar la configuración");
    }
  }

  return (
    <MainLayout>
      {!activeCompany ? (
        <div style={{ padding: '24px', backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', color: '#8A6A3A', textAlign: 'center' }}>
          Selecciona una empresa para ver los datos
        </div>
      ) : (
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#F5F5F5' }}>Tesorería</h1>
            <p style={{ color: '#A3A3A3', fontSize: '14px' }}>Gestión financiera integral</p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            className="px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: '#2D2D2D',
              color: '#F5F5F5',
              borderRadius: '4px',
              border: '1px solid #2D2D2D',
            }}
          >
            <option value="week">Semana</option>
            <option value="month">Mes</option>
            <option value="quarter">Trimestre</option>
          </select>
        </div>

      {error && (
        <div style={{ backgroundColor: '#2D2D2D', border: '1px solid #C53030', borderRadius: '6px', padding: '16px', color: '#F5F5F5' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto" style={{ borderColor: '#2D2D2D' }}>
        {[
          { id: 'resumen', label: 'Resumen' },
          { id: 'posicion', label: 'Posición Bancaria' },
          { id: 'traslados', label: 'Traslado de Fondos' },
          { id: 'cxp', label: 'CxP' },
          { id: 'cxc', label: 'CxC' },
          { id: 'alertas', label: 'Alertas' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className="px-4 py-2 font-medium transition-colors text-sm"
            style={{
              color: activeTab === tab.id ? '#C0C0C0' : '#A3A3A3',
              borderBottom: activeTab === tab.id ? '2px solid #C0C0C0' : '2px solid transparent',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = '#F5F5F5'; }}
            onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = '#A3A3A3'; }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px', color: '#A3A3A3' }}>
          Cargando...
        </div>
      ) : (
        <>
          {/* TAB 1: Resumen - 4 KPIs + Gráfica + Próximos vencimientos + Alertas */}
          {activeTab === "resumen" && executiveSummary && (
            <div className="space-y-6">
              {/* Executive KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <ExecutiveKPI
                  label="Saldo Total"
                  value={Number(executiveSummary.totalBalance || 0)}
                  secondary={executiveSummary.comparison?.netChangePercent || 0}
                  context="Liquidez total consolidada"
                  trend={executiveSummary.comparison?.netChangePercent >= 0 ? 'up' : 'down'}
                  trendValue={`${executiveSummary.comparison?.netChangePercent >= 0 ? '+' : ''}${Number(executiveSummary.comparison?.netChangePercent || 0).toFixed(1)}% vs mes anterior`}
                />
                <ExecutiveKPI
                  label="Ingresos del Período"
                  value={Number(executiveSummary.monthlyFlow?.income || 0)}
                  context="Total ingresos del período"
                />
                <ExecutiveKPI
                  label="Egresos del Período"
                  value={Number(executiveSummary.monthlyFlow?.expense || 0)}
                  context="Total egresos del período"
                />
                <ExecutiveKPI
                  label="Flujo Neto"
                  value={Number(executiveSummary.monthlyFlow?.net || 0)}
                  context="Diferencia ingresos - egresos"
                  trend={executiveSummary.monthlyFlow?.net >= 0 ? 'up' : 'down'}
                />
              </div>

              {/* Gráfica flujo proyectado */}
              {cashFlow && (
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>Flujo de Caja Proyectado (30 días)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={cashFlow.dailyForecast}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#A3A3A3"
                        tick={{ fill: '#A3A3A3' }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                      />
                      <YAxis 
                        stroke="#A3A3A3"
                        tick={{ fill: '#A3A3A3' }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F1F1F', border: '1px solid #2D2D2D', borderRadius: '4px', color: '#F5F5F5' }}
                        labelStyle={{ color: '#F5F5F5' }}
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                        labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES')}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="income" 
                        stackId="1"
                        stroke="#C0C0C0" 
                        fill="#C0C0C0" 
                        fillOpacity={0.2}
                        name="Ingresos"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="expense" 
                        stackId="2"
                        stroke="#C53030" 
                        fill="#C53030" 
                        fillOpacity={0.2}
                        name="Egresos"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="#2F855A" 
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
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>Próximos 5 Vencimientos (CxP)</h3>
                  <div className="space-y-2">
                    {alerts.upcomingAlerts
                      .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
                      .slice(0, 5)
                      .map((alert: any, index: number) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 transition-colors"
                          style={{ backgroundColor: '#0F0F0F', borderRadius: '4px', border: '1px solid #2D2D2D' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1F1F1F'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0F0F0F'}
                        >
                          <div className="flex items-center gap-3">
                            <div style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: alert.daysUntil < 7 ? '#C53030' : alert.daysUntil < 15 ? '#B7791F' : '#2F855A'
                            }} />
                            <div>
                              <p style={{ fontWeight: 500, color: '#F5F5F5' }}>{alert.concept || alert.message}</p>
                              <p style={{ fontSize: '13px', color: '#A3A3A3' }}>
                                ${Number(alert.amount).toFixed(2)} - En {alert.daysUntil} días
                              </p>
                            </div>
                          </div>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: alert.daysUntil < 7 ? '#2D2D2D' : alert.daysUntil < 15 ? '#2D2D2D' : '#2D2D2D',
                            color: alert.daysUntil < 7 ? '#C53030' : alert.daysUntil < 15 ? '#B7791F' : '#2F855A',
                          }}>
                            {alert.daysUntil < 7 ? "CRÍTICO" : alert.daysUntil < 15 ? "ADVERTENCIA" : "PROGRAMADO"}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Alertas activas */}
              {alerts && (
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>Alertas Activas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {alerts.lowBalanceAccounts?.length > 0 && (
                      <div style={{ padding: '16px', borderRadius: '4px', backgroundColor: '#0F0F0F', border: '1px solid #C53030' }}>
                        <p style={{ color: '#C53030', fontWeight: 600 }}>🏦 Saldo Bajo: {alerts.lowBalanceAccounts.length}</p>
                      </div>
                    )}
                    {alerts.overdueAlerts?.length > 0 && (
                      <div style={{ padding: '16px', borderRadius: '4px', backgroundColor: '#0F0F0F', border: '1px solid #C53030' }}>
                        <p style={{ color: '#C53030', fontWeight: 600 }}>📄 Vencidos: {alerts.overdueAlerts.length}</p>
                      </div>
                    )}
                    {alerts.pendingAlerts?.length > 0 && (
                      <div style={{ padding: '16px', borderRadius: '4px', backgroundColor: '#0F0F0F', border: '1px solid #B7791F' }}>
                        <p style={{ color: '#B7791F', fontWeight: 600 }}>💸 Pendientes: {alerts.pendingAlerts.length}</p>
                      </div>
                    )}
                  </div>
                  {alerts.totalAlerts === 0 && (
                    <p style={{ color: '#2F855A', textAlign: 'center', padding: '16px' }}>✅ No hay alertas activas</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Posición Bancaria - Tabla con botón transferir */}
          {activeTab === "posicion" && bankPosition && (
            <div className="space-y-6">
              {/* Resumen */}
              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
                <p style={{ fontSize: '12px', color: '#7E7E7E', marginBottom: '8px', letterSpacing: '0.05em' }}>TOTAL CONSOLIDADO</p>
                <p style={{ fontSize: '36px', fontWeight: 600, color: '#F5F5F5', fontFamily: 'monospace' }}>
                  ${Number(bankPosition.totalBalance || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              {/* Tabla de cuentas */}
              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', overflow: 'hidden' }}>
                <h3 style={{ padding: '16px 24px', fontSize: '16px', fontWeight: 600, color: '#F5F5F5' }}>Posición por Cuenta</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead style={{ backgroundColor: '#0F0F0F', borderBottom: '1px solid #2D2D2D' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Cuenta</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Banco</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Saldo</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Variación Hoy</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankPosition.accounts?.map((account: any, index: number) => (
                        <tr 
                          key={account.id} 
                          style={{ 
                            backgroundColor: index % 2 === 0 ? '#0A0A0A' : '#0F0F0F',
                            borderBottom: index < bankPosition.accounts.length - 1 ? '1px solid #2D2D2D' : 'none',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1F1F1F'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#0A0A0A' : '#0F0F0F'}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <p style={{ fontWeight: 500, color: '#F5F5F5', fontSize: '13px' }}>{account.name}</p>
                            <p style={{ fontSize: '12px', color: '#7E7E7E' }}>{account.accountNumber}</p>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#A3A3A3' }}>{account.bank}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#F5F5F5', fontSize: '13px' }}>
                            ${Number(account.balance).toFixed(2)}
                          </td>
                          <td style={{ 
                            padding: '12px 16px', 
                            textAlign: 'right', 
                            fontSize: '13px', 
                            fontWeight: 600,
                            color: account.todayNet >= 0 ? '#2F855A' : '#C53030'
                          }}>
                            {account.todayNet >= 0 ? "+" : ""}${Number(account.todayNet).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: account.balance >= 0 ? '#0F0F0F' : '#0F0F0F',
                              color: account.balance >= 0 ? '#2F855A' : '#C53030',
                              border: `1px solid ${account.balance >= 0 ? '#2F855A' : '#C53030'}`
                            }}>
                              {account.balance >= 0 ? "ACTIVO" : "NEGATIVO"}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              onClick={() => setActiveTab("traslados")}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: '#C0C0C0',
                                color: '#0A0A0A',
                                border: '1px solid #C0C0C0',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E8E8'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C0C0C0'}
                            >
                              Transferir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ backgroundColor: '#0F0F0F', borderTop: '1px solid #2D2D2D' }}>
                      <tr>
                        <td colSpan={2} style={{ padding: '12px 16px', fontWeight: 600, color: '#F5F5F5', fontSize: '13px' }}>Total</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#F5F5F5', fontSize: '14px' }}>
                          ${Number(bankPosition.totalBalance || 0).toFixed(2)}
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right', 
                          fontWeight: 700, 
                          fontSize: '14px',
                          color: (bankPosition.totalTodayIncome - bankPosition.totalTodayExpense) >= 0 ? '#2F855A' : '#C53030'
                        }}>
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

          {/* TAB 3: Traslado de Fondos - Form e historial */}
          {activeTab === "traslados" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formulario de traslado */}
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>Nuevo Traslado</h3>
                  <form onSubmit={handleTransferSubmit} className="space-y-4">
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>Tipo de Traslado</label>
                      <select 
                        value={transferForm.tipo}
                        onChange={(e) => setTransferForm({ ...transferForm, tipo: e.target.value as any })}
                        className="w-full" style={{
                        backgroundColor: '#0F0F0F',
                        color: '#F5F5F5',
                        borderRadius: '4px',
                        border: '1px solid #2D2D2D',
                        padding: '10px 12px',
                        fontSize: '13px',
                      }}>
                        <option value="INTERNA">Traslado Interno</option>
                        <option value="INTERCOMPAÑIA">Traslado Intercompañía</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>Cuenta Origen</label>
                      <select 
                        value={transferForm.fromAccountId}
                        onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
                        className="w-full" style={{
                        backgroundColor: '#0F0F0F',
                        color: '#F5F5F5',
                        borderRadius: '4px',
                        border: '1px solid #2D2D2D',
                        padding: '10px 12px',
                        fontSize: '13px',
                      }}>
                        <option value="">Seleccionar cuenta</option>
                        {banks.map((bank: any) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.name} - ${Number(bank.balance).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>Cuenta Destino</label>
                      <select 
                        value={transferForm.toAccountId}
                        onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                        className="w-full" style={{
                        backgroundColor: '#0F0F0F',
                        color: '#F5F5F5',
                        borderRadius: '4px',
                        border: '1px solid #2D2D2D',
                        padding: '10px 12px',
                        fontSize: '13px',
                      }}>
                        <option value="">Seleccionar cuenta</option>
                        {banks.map((bank: any) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.name} - ${Number(bank.balance).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>Monto</label>
                      <input
                        type="number"
                        step="0.01"
                        value={transferForm.amount}
                        onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                        placeholder="0.00"
                        required
                        style={{
                          width: '100%',
                          backgroundColor: '#0F0F0F',
                          color: '#F5F5F5',
                          borderRadius: '4px',
                          border: '1px solid #2D2D2D',
                          padding: '10px 12px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>Concepto</label>
                      <input
                        type="text"
                        value={transferForm.concept}
                        onChange={(e) => setTransferForm({ ...transferForm, concept: e.target.value })}
                        placeholder="Descripción del traslado"
                        required
                        style={{
                          width: '100%',
                          backgroundColor: '#0F0F0F',
                          color: '#F5F5F5',
                          borderRadius: '4px',
                          border: '1px solid #2D2D2D',
                          padding: '10px 12px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>Referencia (opcional)</label>
                      <input
                        type="text"
                        value={transferForm.referencia}
                        onChange={(e) => setTransferForm({ ...transferForm, referencia: e.target.value })}
                        placeholder="Número de referencia"
                        style={{
                          width: '100%',
                          backgroundColor: '#0F0F0F',
                          color: '#F5F5F5',
                          borderRadius: '4px',
                          border: '1px solid #2D2D2D',
                          padding: '10px 12px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '4px',
                        backgroundColor: '#C0C0C0',
                        color: '#0A0A0A',
                        border: '1px solid #C0C0C0',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E8E8'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C0C0C0'}
                    >
                      Realizar Traslado
                    </button>
                  </form>
                </div>

                {/* Historial reciente */}
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>Historial de Traslados</h3>
                  <div className="space-y-2">
                    <p style={{ color: '#7E7E7E', textAlign: 'center', padding: '32px' }}>No hay traslados recientes</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CxP - Facturas por pagar con sub-secciones */}
          {activeTab === "cxp" && (
            <div className="space-y-6">
              <div className="flex gap-4 border-b" style={{ borderColor: '#2D2D2D' }}>
                <button className="px-4 py-2 font-medium transition-colors text-sm" style={{
                  color: '#C0C0C0',
                  borderBottom: '2px solid #C0C0C0',
                  backgroundColor: 'transparent',
                }}>
                  Facturas pendientes de pago
                </button>
                <button 
                  onClick={() => setShowScheduledPayments(!showScheduledPayments)}
                  className="px-4 py-2 font-medium transition-colors text-sm"
                  style={{
                    color: '#A3A3A3',
                    borderBottom: '2px solid transparent',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#F5F5F5'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#A3A3A3'}
                >
                  Pagos programados {showScheduledPayments ? '▼' : '▶'}
                </button>
              </div>

              {/* SECCIÓN 1: Facturas pendientes de pago */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>Facturas pendientes de pago</h3>
                {accountsPayable.length === 0 ? (
                  <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '32px', textAlign: 'center', color: '#7E7E7E' }}>
                    No hay facturas pendientes de pago
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', overflow: 'hidden' }}>
                    <table className="w-full">
                      <thead style={{ backgroundColor: '#0F0F0F', borderBottom: '1px solid #2D2D2D' }}>
                        <tr>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Proveedor</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Factura #</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Saldo pendiente</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Vencimiento</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Días restantes</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accountsPayable.map((cxp: any, index: number) => {
                          const daysRemaining = cxp.diasHastaVencimiento || 0;
                          const urgencyColor = daysRemaining < 0 ? '#C53030' : daysRemaining < 7 ? '#C53030' : daysRemaining < 15 ? '#B7791F' : '#2F855A';
                          const urgencyBorder = daysRemaining < 0 ? '#C53030' : daysRemaining < 7 ? '#C53030' : daysRemaining < 15 ? '#B7791F' : '#2F855A';
                          const saldoPendiente = Number(cxp.saldoPendiente || 0).toFixed(2);
                          return (
                            <tr 
                              key={cxp.id}
                              style={{ 
                                backgroundColor: index % 2 === 0 ? '#0A0A0A' : '#0F0F0F',
                                borderBottom: index < accountsPayable.length - 1 ? '1px solid #2D2D2D' : 'none',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1F1F1F'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#0A0A0A' : '#0F0F0F'}
                            >
                              <td style={{ padding: '12px 16px', fontSize: '13px', color: '#F5F5F5' }}>{cxp.supplierName || 'N/A'}</td>
                              <td style={{ padding: '12px 16px', fontSize: '13px', color: '#F5F5F5' }}>{cxp.numero || 'Sin número'}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#F5F5F5', fontSize: '13px' }}>${saldoPendiente}</td>
                              <td style={{ padding: '12px 16px', fontSize: '13px', color: '#A3A3A3' }}>{cxp.fechaVencimiento ? new Date(cxp.fechaVencimiento).toLocaleDateString() : 'Sin fecha'}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: '#0F0F0F',
                                  color: urgencyColor,
                                  border: `1px solid ${urgencyBorder}`
                                }}>
                                  {daysRemaining} días
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: '#0F0F0F',
                                  color: '#A3A3A3',
                                  border: '1px solid #2D2D2D'
                                }}>{cxp.status}</span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <button 
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    backgroundColor: '#2D2D2D',
                                    color: '#F5F5F5',
                                    border: '1px solid #2D2D2D',
                                    marginRight: '4px',
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D3D3D'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2D2D2D'}
                                >
                                  Programar pago
                                </button>
                                <button 
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    backgroundColor: '#C0C0C0',
                                    color: '#0A0A0A',
                                    border: '1px solid #C0C0C0',
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E8E8'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C0C0C0'}
                                >
                                  Pagar ahora
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: Pagos programados (toggle) */}
              {showScheduledPayments && (
                <div style={{ borderTop: '1px solid #2D2D2D', paddingTop: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>Pagos programados</h3>
                  <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '32px', textAlign: 'center', color: '#7E7E7E' }}>
                    No hay pagos programados
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CxC - Cuentas por cobrar */}
          {activeTab === "cxc" && (
            <div className="space-y-6">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>Cuentas por Cobrar (CxC)</h3>

              {accountsReceivable.length === 0 ? (
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '32px', textAlign: 'center', color: '#7E7E7E' }}>
                  No hay cuentas por cobrar
                </div>
              ) : (
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', overflow: 'hidden' }}>
                  <table className="w-full">
                    <thead style={{ backgroundColor: '#0F0F0F', borderBottom: '1px solid #2D2D2D' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Concepto</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Monto</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Fecha Esperada</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Días</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountsReceivable.map((cxc: any, index: number) => (
                        <tr 
                          key={cxc.id}
                          style={{ 
                            backgroundColor: index % 2 === 0 ? '#0A0A0A' : '#0F0F0F',
                            borderBottom: index < accountsReceivable.length - 1 ? '1px solid #2D2D2D' : 'none',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1F1F1F'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#0A0A0A' : '#0F0F0F'}
                        >
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#F5F5F5' }}>{cxc.concepto}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#F5F5F5', fontSize: '13px' }}>
                            ${Number(cxc.monto).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#A3A3A3' }}>
                            {new Date(cxc.fechaEsperada).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#A3A3A3' }}>
                            {cxc.diasHastaCobro} días
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#0F0F0F',
                              color: '#A3A3A3',
                              border: '1px solid #2D2D2D'
                            }}>
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
              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>Configuración de Alertas</h3>
                <form onSubmit={handleAlertConfigSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>Saldo Mínimo ($)</label>
                    <input
                      type="number"
                      value={alertForm.saldoMinimo}
                      onChange={(e) => setAlertForm({ ...alertForm, saldoMinimo: e.target.value })}
                      placeholder={alertConfig?.saldoMinimo || 0}
                      required
                      style={{
                        width: '100%',
                        backgroundColor: '#0F0F0F',
                        color: '#F5F5F5',
                        borderRadius: '4px',
                        border: '1px solid #2D2D2D',
                        padding: '10px 12px',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>Días Anticipación</label>
                    <input
                      type="number"
                      value={alertForm.diasAnticipacionAlerta}
                      onChange={(e) => setAlertForm({ ...alertForm, diasAnticipacionAlerta: e.target.value })}
                      placeholder={alertConfig?.diasAnticipacionAlerta || 7}
                      required
                      style={{
                        width: '100%',
                        backgroundColor: '#0F0F0F',
                        color: '#F5F5F5',
                        borderRadius: '4px',
                        border: '1px solid #2D2D2D',
                        padding: '10px 12px',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '4px',
                        backgroundColor: '#C0C0C0',
                        color: '#0A0A0A',
                        border: '1px solid #C0C0C0',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E8E8'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C0C0C0'}
                    >
                      Guardar Configuración
                    </button>
                  </div>
                </form>
              </div>

              {/* Alertas activas */}
              {alerts && (
                <div className="space-y-4">
                  {alerts.lowBalanceAccounts?.length > 0 && (
                    <div style={{ backgroundColor: '#161616', border: '1px solid #C53030', borderRadius: '6px', padding: '24px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#C53030', marginBottom: '16px' }}>⚠️ Cuentas con Saldo Bajo</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {alerts.lowBalanceAccounts.map((alert: any, index: number) => (
                          <div key={index} style={{ padding: '16px', borderRadius: '4px', backgroundColor: '#0F0F0F', border: '1px solid #C53030' }}>
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
                    <div style={{ backgroundColor: '#161616', border: '1px solid #C53030', borderRadius: '6px', padding: '24px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#C53030', marginBottom: '16px' }}>📄 Facturas Vencidas</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {alerts.overdueAlerts.map((alert: any, index: number) => (
                          <div key={index} style={{ padding: '16px', borderRadius: '4px', backgroundColor: '#0F0F0F', border: '1px solid #C53030' }}>
                            <div className="flex items-center gap-3 mb-2">
                              <span style={{ fontSize: '20px' }}>📄</span>
                              <div>
                                <p style={{ fontWeight: 500, color: '#F5F5F5', fontSize: '13px' }}>{alert.concept}</p>
                                <p style={{ fontSize: '12px', color: '#C53030' }}>Monto: ${Number(alert.amount).toFixed(2)}</p>
                              </div>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#C53030' }}>VENCIDO</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {alerts.pendingAlerts?.length > 0 && (
                    <div style={{ backgroundColor: '#161616', border: '1px solid #B7791F', borderRadius: '6px', padding: '24px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#B7791F', marginBottom: '16px' }}>🔄 Transferencias Pendientes</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {alerts.pendingAlerts.map((alert: any, index: number) => (
                          <div key={index} style={{ padding: '16px', borderRadius: '4px', backgroundColor: '#0F0F0F', border: '1px solid #B7791F' }}>
                            <div className="flex items-center gap-3 mb-2">
                              <span style={{ fontSize: '20px' }}>💸</span>
                              <div>
                                <p style={{ fontWeight: 500, color: '#F5F5F5', fontSize: '13px' }}>{alert.concept}</p>
                                <p style={{ fontSize: '12px', color: '#B7791F' }}>Monto: ${Number(alert.amount).toFixed(2)}</p>
                              </div>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#B7791F' }}>PENDIENTE</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {alerts.totalAlerts === 0 && (
                    <div style={{ backgroundColor: '#161616', border: '1px solid #2F855A', borderRadius: '6px', padding: '24px', textAlign: 'center' }}>
                      <p style={{ color: '#2F855A', fontSize: '16px' }}>✅ No hay alertas activas</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
      )}
    </MainLayout>
  );
}
