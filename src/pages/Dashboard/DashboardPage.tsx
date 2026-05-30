import MainLayout from "../../core/layout/MainLayout";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../core/api/api";
import DashboardInfoModal from "./DashboardInfoModal";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("month");

  useEffect(() => {
    loadKpis();
  }, [period]);

  async function loadKpis() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/dashboard/kpis", { params: { period } });
      setKpis(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar dashboard");
    } finally {
      setLoading(false);
    }
  }

  // Datos simulados para la mini gráfica de barras (últimos 7 días)
  const miniChartData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      data.push({
        day: date.toLocaleDateString('es', { weekday: 'short' }),
        value: Math.random() * 1000 + 500,
      });
    }
    return data;
  }, []);

  // Datos simulados para la gráfica de línea (últimos 6 meses)
  const lineChartData = useMemo(() => {
    const data = [];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    for (let i = 0; i < 6; i++) {
      data.push({
        month: months[i],
        ingresos: Math.random() * 50000 + 30000,
        egresos: Math.random() * 40000 + 20000,
      });
    }
    return data;
  }, []);

  const totalBalance = Number(kpis?.totalBalance || 0);
  const balanceVariation = Number(kpis?.balanceVariation || 0);
  const isPositive = balanceVariation >= 0;

  return (
    <MainLayout>
      <DashboardInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <p className="text-slate-400">Vista financiera general</p>
          </div>
          <button onClick={() => setInfoOpen(true)} className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700">
            Ver info
          </button>
        </div>

        {error && <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">{error}</div>}

        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando dashboard...</div>
        ) : (
          <div className="space-y-6">
            {/* ZONA 1 - Hero Card */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex-1">
                  <p className="text-sm text-slate-400 mb-2">Saldo total global</p>
                  <p className="text-4xl md:text-5xl font-bold font-mono text-white mb-3">
                    ${totalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '↑' : '↓'} {Math.abs(balanceVariation).toFixed(1)}%
                    </span>
                    <span className="text-sm text-slate-400">vs período anterior</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Período</p>
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
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          period === p.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mini gráfica de barras */}
              <div className="mt-6 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={miniChartData}>
                    <Bar dataKey="value" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ZONA 2 - Grid 4 KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ingresos */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center">
                    <span className="text-green-400 text-lg">↓</span>
                  </div>
                  <p className="text-sm text-slate-400">Ingresos</p>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  ${(kpis?.income || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className={`text-sm font-semibold ${kpis?.incomeVariation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {kpis?.incomeVariation >= 0 ? '+' : ''}{kpis?.incomeVariation || 0}%
                </p>
              </div>

              {/* Egresos */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center">
                    <span className="text-red-400 text-lg">↑</span>
                  </div>
                  <p className="text-sm text-slate-400">Egresos</p>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  ${(kpis?.expense || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className={`text-sm font-semibold ${kpis?.expenseVariation <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {kpis?.expenseVariation >= 0 ? '+' : ''}{kpis?.expenseVariation || 0}%
                </p>
              </div>

              {/* CxC Pendiente */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
                    <span className="text-blue-400 text-lg">📄</span>
                  </div>
                  <p className="text-sm text-slate-400">CxC Pendiente</p>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  ${(kpis?.accountsReceivable || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-slate-400">{kpis?.pendingInvoices || 0} facturas</p>
              </div>

              {/* CxP Pendiente */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-900/30 flex items-center justify-center">
                    <span className="text-yellow-400 text-lg">📋</span>
                  </div>
                  <p className="text-sm text-slate-400">CxP Pendiente</p>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  ${(kpis?.accountsPayable || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-slate-400">Vence: {kpis?.nextDueDate || 'N/A'}</p>
              </div>
            </div>

            {/* ZONA 3 - Dos columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfica de línea */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Ingresos vs Egresos (6 meses)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Line type="monotone" dataKey="ingresos" stroke="#0EA5E9" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="egresos" stroke="#10B981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Lista últimos movimientos */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Últimos movimientos</h3>
                <div className="space-y-3">
                  {(kpis?.latestMovements || []).slice(0, 5).map((movement: any) => (
                    <div key={movement.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
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
                        <p className="text-xs text-slate-400">
                          {new Date(movement.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}