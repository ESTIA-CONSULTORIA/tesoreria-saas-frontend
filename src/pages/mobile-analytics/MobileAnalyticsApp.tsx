import { useState, useEffect } from "react";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";

const COLORS = {
  verde: '#10B981',
  rojo: '#EF4444',
  azul: '#0EA5E9',
  amarillo: '#F59E0B',
  gris: '#64748B',
};

export default function MobileAnalyticsApp() {
  const [activeTab, setActiveTab] = useState<'inicio' | 'ventas' | 'gastos' | 'flujo' | 'alertas'>('inicio');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    loadData();
  }, [period, activeTab]);

  async function loadData() {
    try {
      setLoading(true);
      const response = await api.get("/dashboard/kpis", { params: { period } });
      setKpis(response.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    loadData();
  }

  // Datos simulados para gráficas
  const salesChartData = [
    { week: 'Sem 1', ventas: 45000 },
    { week: 'Sem 2', ventas: 52000 },
    { week: 'Sem 3', ventas: 48000 },
    { week: 'Sem 4', ventas: 61000 },
  ];

  const expenseChartData = [
    { name: 'Operativo', value: 35, color: COLORS.azul },
    { name: 'Personal', value: 25, color: COLORS.verde },
    { name: 'Marketing', value: 20, color: COLORS.amarillo },
    { name: 'Otros', value: 20, color: COLORS.gris },
  ];

  const cashFlowChartData = [
    { week: 'Sem 1', ingresos: 45000, egresos: 38000, saldo: 7000 },
    { week: 'Sem 2', ingresos: 52000, egresos: 42000, saldo: 8000 },
    { week: 'Sem 3', ingresos: 48000, egresos: 45000, saldo: 3000 },
    { week: 'Sem 4', ingresos: 61000, egresos: 50000, saldo: 11000 },
  ];

  const upcomingPayments = [
    { date: '2026-06-05', concept: 'Rent oficina', amount: 15000, urgency: 'high' },
    { date: '2026-06-10', concept: 'Proveedores', amount: 8500, urgency: 'medium' },
    { date: '2026-06-15', concept: 'Servicios', amount: 3200, urgency: 'low' },
  ];

  const alerts = [
    { type: 'critical', title: 'Saldo bajo', description: 'Cuenta principal con saldo negativo', time: 'hace 2h' },
    { type: 'important', title: 'Gasto alto', description: 'Marketing superó presupuesto mensual', time: 'hace 5h' },
    { type: 'info', title: 'Meta alcanzada', description: 'Ventas semanales superaron objetivo', time: 'hace 1d' },
  ];

  const totalBalance = Number(kpis?.totalBalance || 0);
  const balanceVariation = Number(kpis?.balanceVariation || 0);
  const isPositive = balanceVariation >= 0;

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Mi Empresa</p>
              <p className="text-xs text-slate-400">{user?.name || 'Usuario'}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            disabled={refreshing}
          >
            🔄
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {loading && !kpis ? (
          <div className="space-y-4">
            <div className="h-48 bg-slate-900 rounded-2xl animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-slate-900 rounded-xl animate-pulse" />
              <div className="h-24 bg-slate-900 rounded-xl animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'inicio' && (
              <div className="space-y-4">
                {/* Hero Card */}
                <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 p-5">
                  <p className="text-sm text-slate-400 mb-2">Saldo total global</p>
                  <p className="text-4xl font-bold font-mono text-white mb-3">
                    ${totalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '↑' : '↓'} {Math.abs(balanceVariation).toFixed(1)}%
                    </span>
                    <span className="text-sm text-slate-400">vs período anterior</span>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { value: 'today', label: 'Hoy' },
                      { value: 'week', label: 'Semana' },
                      { value: 'month', label: 'Mes' },
                      { value: 'year', label: 'Año' },
                    ].map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPeriod(p.value as any)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          period === p.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* KPIs Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-400">↓</span>
                      <p className="text-xs text-slate-400">Ingresos</p>
                    </div>
                    <p className="text-xl font-bold text-white">
                      ${(kpis?.income || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                    </p>
                    <p className={`text-xs font-semibold ${kpis?.incomeVariation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {kpis?.incomeVariation >= 0 ? '+' : ''}{kpis?.incomeVariation || 0}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-red-400">↑</span>
                      <p className="text-xs text-slate-400">Egresos</p>
                    </div>
                    <p className="text-xl font-bold text-white">
                      ${(kpis?.expense || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                    </p>
                    <p className={`text-xs font-semibold ${kpis?.expenseVariation <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {kpis?.expenseVariation >= 0 ? '+' : ''}{kpis?.expenseVariation || 0}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-400">📄</span>
                      <p className="text-xs text-slate-400">CxC</p>
                    </div>
                    <p className="text-xl font-bold text-white">
                      ${(kpis?.accountsReceivable || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-slate-400">{kpis?.pendingInvoices || 0} facturas</p>
                  </div>
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-400">📋</span>
                      <p className="text-xs text-slate-400">CxP</p>
                    </div>
                    <p className="text-xl font-bold text-white">
                      ${(kpis?.accountsPayable || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-slate-400">Vence: {kpis?.nextDueDate || 'N/A'}</p>
                  </div>
                </div>

                {/* Últimos movimientos */}
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Últimos movimientos</h3>
                  <div className="space-y-3">
                    {(kpis?.latestMovements || []).slice(0, 5).map((movement: any) => (
                      <div key={movement.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          movement.type === 'INCOME' ? 'bg-green-900/30' : 'bg-red-900/30'
                        }`}>
                          <span className={movement.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}>
                            {movement.type === 'INCOME' ? '↓' : '↑'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{movement.concept}</p>
                          <p className="text-xs text-slate-400">{movement.category}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${
                            movement.type === 'INCOME' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {movement.type === 'INCOME' ? '+' : '-'}${Number(movement.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ventas' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <p className="text-sm text-slate-400 mb-1">Total ventas período</p>
                  <p className="text-3xl font-bold text-white mb-2">
                    ${(kpis?.income || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                  </p>
                  <p className={`text-sm font-semibold ${kpis?.incomeVariation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {kpis?.incomeVariation >= 0 ? '+' : ''}{kpis?.incomeVariation || 0}% vs anterior
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-slate-400">Meta mensual</p>
                    <p className="text-sm text-white">75%</p>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '75%' }} />
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Ventas por semana</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="week" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="ventas" stroke={COLORS.azul} fill={COLORS.azul} fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Top categorías</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Ventas mostrador', amount: 45000, percent: 45 },
                      { name: 'Pedidos online', amount: 35000, percent: 35 },
                      { name: 'Catering', amount: 20000, percent: 20 },
                    ].map((cat, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-white">{cat.name}</p>
                          <p className="text-sm text-slate-400">{cat.percent}%</p>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${cat.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gastos' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <p className="text-sm text-slate-400 mb-1">Total gastos período</p>
                  <p className="text-3xl font-bold text-white mb-2">
                    ${(kpis?.expense || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                  </p>
                  <p className={`text-sm font-semibold ${kpis?.expenseVariation <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {kpis?.expenseVariation >= 0 ? '+' : ''}{kpis?.expenseVariation || 0}% vs anterior
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Distribución por categoría</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {expenseChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-2">
                    {expenseChartData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <p className="text-sm text-slate-300">{item.name}</p>
                        </div>
                        <p className="text-sm text-white">{item.value}%</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Top 5 egresos</h3>
                  <div className="space-y-3">
                    {[
                      { concept: 'Rent oficina', amount: 15000, status: 'green' },
                      { concept: 'Nómina', amount: 12000, status: 'green' },
                      { concept: 'Marketing', amount: 8500, status: 'yellow' },
                      { concept: 'Servicios', amount: 3200, status: 'green' },
                      { concept: 'Suministros', amount: 2100, status: 'red' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                        <p className="text-sm text-white">{item.concept}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">
                            ${item.amount.toLocaleString('es-MX')}
                          </p>
                          <div className={`w-2 h-2 rounded-full ${
                            item.status === 'green' ? 'bg-green-400' : 
                            item.status === 'yellow' ? 'bg-yellow-400' : 'bg-red-400'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'flujo' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Posición bancaria</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Banco Principal', balance: 45000 },
                      { name: 'Caja Chica', balance: 5000 },
                      { name: 'Cuenta Ahorros', balance: 25000 },
                    ].map((account, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                        <p className="text-sm text-white">{account.name}</p>
                        <p className="text-sm font-semibold text-white">
                          ${account.balance.toLocaleString('es-MX')}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-slate-400">Total consolidado</p>
                      <p className="text-lg font-bold text-white">
                        ${totalBalance.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Flujo de caja</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cashFlowChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="week" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Line type="monotone" dataKey="ingresos" stroke={COLORS.verde} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="egresos" stroke={COLORS.rojo} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="saldo" stroke={COLORS.azul} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Próximos vencimientos</h3>
                  <div className="space-y-3">
                    {upcomingPayments.map((payment, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${
                        payment.urgency === 'high' ? 'bg-red-900/20 border border-red-700' :
                        payment.urgency === 'medium' ? 'bg-yellow-900/20 border border-yellow-700' :
                        'bg-slate-800/50'
                      }`}>
                        <div>
                          <p className="text-sm text-white">{payment.concept}</p>
                          <p className="text-xs text-slate-400">{payment.date}</p>
                        </div>
                        <p className="text-sm font-semibold text-white">
                          ${payment.amount.toLocaleString('es-MX')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'alertas' && (
              <div className="space-y-3">
                {alerts.map((alert, i) => (
                  <div key={i} className={`rounded-xl border p-4 ${
                    alert.type === 'critical' ? 'bg-red-900/20 border-red-700' :
                    alert.type === 'important' ? 'bg-yellow-900/20 border-yellow-700' :
                    'bg-green-900/20 border-green-700'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        alert.type === 'critical' ? 'bg-red-900/50' :
                        alert.type === 'important' ? 'bg-yellow-900/50' :
                        'bg-green-900/50'
                      }`}>
                        <span className="text-lg">
                          {alert.type === 'critical' ? '🔴' :
                           alert.type === 'important' ? '🟡' : '🟢'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white mb-1">{alert.title}</p>
                        <p className="text-xs text-slate-300 mb-2">{alert.description}</p>
                        <p className="text-xs text-slate-400">{alert.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 px-2 py-2">
        <div className="flex justify-around">
          {[
            { id: 'inicio', icon: '🏠', label: 'Inicio' },
            { id: 'ventas', icon: '📊', label: 'Ventas' },
            { id: 'gastos', icon: '💸', label: 'Gastos' },
            { id: 'flujo', icon: '💰', label: 'Flujo' },
            { id: 'alertas', icon: '🔔', label: 'Alertas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors min-h-[44px] ${
                activeTab === tab.id
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
