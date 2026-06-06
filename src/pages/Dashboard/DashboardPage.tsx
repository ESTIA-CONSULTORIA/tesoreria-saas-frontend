import MainLayout from "../../core/layout/MainLayout";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../core/api/api";
import DashboardInfoModal from "./DashboardInfoModal";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import ExecutiveKPI from "../../components/ExecutiveKPI";
import { useCompanyStore } from "../../core/store/useCompanyStore";

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("month");
  const [viewMode, setViewMode] = useState<"consolidated" | "individual">("consolidated");
  const { activeBranch } = useCompanyStore();

  useEffect(() => {
    loadKpis();
  }, [period, viewMode, activeBranch?.id]);

  async function loadKpis() {
    try {
      setLoading(true);
      setError("");
      
      // En vista individual, usamos el header X-Branch-Id del interceptor
      // En vista consolidada, necesitamos remover temporalmente el header
      if (viewMode === "consolidated") {
        const branchId = localStorage.getItem("active_branch_id");
        localStorage.removeItem("active_branch_id");
        const response = await api.get("/dashboard/kpis", { params: { period } });
        if (branchId) localStorage.setItem("active_branch_id", branchId);
        setKpis(response.data);
      } else {
        const response = await api.get("/dashboard/kpis", { params: { period } });
        setKpis(response.data);
      }
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
            <h2 className="text-3xl font-bold" style={{ color: '#F5F5F5' }}>Dashboard</h2>
            <p style={{ color: '#A3A3A3', fontSize: '14px' }}>
              {viewMode === 'consolidated' ? 'Vista consolidada (todas las empresas)' : `Vista por sucursal: ${activeBranch?.name || 'Seleccionar sucursal'}`}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('consolidated')}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: viewMode === 'consolidated' ? '#C0C0C0' : '#2D2D2D',
                  color: viewMode === 'consolidated' ? '#0A0A0A' : '#F5F5F5',
                  borderRadius: '4px',
                  border: '1px solid #2D2D2D',
                }}
                onMouseEnter={(e) => { if (viewMode !== 'consolidated') e.currentTarget.style.backgroundColor = '#3D3D3D'; }}
                onMouseLeave={(e) => { if (viewMode !== 'consolidated') e.currentTarget.style.backgroundColor = '#2D2D2D'; }}
              >
                Vista Consolidada
              </button>
              <button
                onClick={() => setViewMode('individual')}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: viewMode === 'individual' ? '#C0C0C0' : '#2D2D2D',
                  color: viewMode === 'individual' ? '#0A0A0A' : '#F5F5F5',
                  borderRadius: '4px',
                  border: '1px solid #2D2D2D',
                }}
                onMouseEnter={(e) => { if (viewMode !== 'individual') e.currentTarget.style.backgroundColor = '#3D3D3D'; }}
                onMouseLeave={(e) => { if (viewMode !== 'individual') e.currentTarget.style.backgroundColor = '#2D2D2D'; }}
              >
                Vista por Sucursal
              </button>
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
                  className="px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: period === p.value ? '#C0C0C0' : '#2D2D2D',
                    color: period === p.value ? '#0A0A0A' : '#F5F5F5',
                    borderRadius: '4px',
                    border: '1px solid #2D2D2D',
                  }}
                  onMouseEnter={(e) => { if (period !== p.value) e.currentTarget.style.backgroundColor = '#3D3D3D'; }}
                  onMouseLeave={(e) => { if (period !== p.value) e.currentTarget.style.backgroundColor = '#2D2D2D'; }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setInfoOpen(true)} 
              className="px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: '#2D2D2D',
                color: '#F5F5F5',
                borderRadius: '4px',
                border: '1px solid #2D2D2D',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D3D3D'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2D2D2D'}
            >
              Ver info
            </button>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#2D2D2D', border: '1px solid #C53030', borderRadius: '6px', padding: '16px', color: '#F5F5F5' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px', color: '#A3A3A3' }}>
            Cargando dashboard...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Executive KPIs Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ExecutiveKPI
                label="Saldo Disponible"
                value={totalBalance}
                secondary={balanceVariation}
                context="Liquidez actual consolidada"
                trend={isPositive ? 'up' : 'down'}
                trendValue={`${isPositive ? '+' : ''}${Math.abs(balanceVariation).toFixed(1)}% vs período anterior`}
              />
              <ExecutiveKPI
                label="Ingresos"
                value={kpis?.income || 0}
                secondary={kpis?.incomeVariation || 0}
                context="Total ingresos del período"
                trend={kpis?.incomeVariation >= 0 ? 'up' : 'down'}
                trendValue={`${kpis?.incomeVariation >= 0 ? '+' : ''}${kpis?.incomeVariation || 0}%`}
              />
              <ExecutiveKPI
                label="Egresos"
                value={kpis?.expense || 0}
                secondary={kpis?.expenseVariation || 0}
                context="Total egresos del período"
                trend={kpis?.expenseVariation <= 0 ? 'up' : 'down'}
                trendValue={`${kpis?.expenseVariation >= 0 ? '+' : ''}${kpis?.expenseVariation || 0}%`}
              />
              <ExecutiveKPI
                label="Flujo Neto"
                value={(kpis?.income || 0) - (kpis?.expense || 0)}
                context="Diferencia ingresos - egresos"
                trend={((kpis?.income || 0) - (kpis?.expense || 0)) >= 0 ? 'up' : 'down'}
              />
              <ExecutiveKPI
                label="Cuentas por Pagar"
                value={kpis?.accountsPayable || 0}
                secondary={kpis?.pendingInvoices || 0}
                context="Total facturas pendientes de pago"
              />
              <ExecutiveKPI
                label="Cuentas por Cobrar"
                value={kpis?.accountsReceivable || 0}
                secondary={kpis?.pendingInvoices || 0}
                context="Total facturas pendientes de cobro"
              />
              <ExecutiveKPI
                label="Facturas Vencidas"
                value={0}
                context="Facturas con fecha de vencimiento pasada"
                trend="down"
              />
              <ExecutiveKPI
                label="Conciliaciones Pendientes"
                value={0}
                context="Movimientos por conciliar"
                trend="neutral"
              />
            </div>

            {/* Charts and Movements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfica de línea */}
              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>Ingresos vs Egresos (6 meses)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                      <XAxis dataKey="month" stroke="#A3A3A3" />
                      <YAxis stroke="#A3A3A3" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F1F1F', border: '1px solid #2D2D2D', borderRadius: '4px', color: '#F5F5F5' }}
                        itemStyle={{ color: '#F5F5F5' }}
                      />
                      <Line type="monotone" dataKey="ingresos" stroke="#C0C0C0" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="egresos" stroke="#2F855A" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Lista últimos movimientos */}
              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>Últimos movimientos</h3>
                <div className="space-y-3">
                  {(kpis?.latestMovements || []).slice(0, 5).map((movement: any) => (
                    <div 
                      key={movement.id} 
                      className="flex items-center gap-3 p-3 transition-colors"
                      style={{
                        backgroundColor: '#0F0F0F',
                        borderRadius: '4px',
                        border: '1px solid #2D2D2D',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1F1F1F'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0F0F0F'}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: movement.type === 'INCOME' ? '#1F1F1F' : '#1F1F1F',
                        border: `1px solid ${movement.type === 'INCOME' ? '#2F855A' : '#C53030'}`,
                      }}>
                        <span style={{ color: movement.type === 'INCOME' ? '#2F855A' : '#C53030', fontSize: '16px' }}>
                          {movement.type === 'INCOME' ? '↓' : '↑'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: '14px', fontWeight: 500, color: '#F5F5F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {movement.concept}
                        </p>
                        <p style={{ fontSize: '12px', color: '#7E7E7E' }}>{movement.category}</p>
                      </div>
                      <div className="text-right">
                        <p style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: movement.type === 'INCOME' ? '#2F855A' : '#C53030',
                        }}>
                          {movement.type === 'INCOME' ? '+' : '-'}${Number(movement.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p style={{ fontSize: '12px', color: '#7E7E7E' }}>
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