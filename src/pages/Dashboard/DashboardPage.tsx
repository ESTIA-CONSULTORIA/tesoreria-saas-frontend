import MainLayout from "../../core/layout/MainLayout";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../core/api/api";
import DashboardInfoModal from "./DashboardInfoModal";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import ExecutiveKPI from "../../components/ExecutiveKPI";
import { useCompanyStore } from "../../core/store/useCompanyStore";

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [companyKpis, setCompanyKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("month");
  const { activeBranch, activeCompany, setActiveCompany, setActiveBranch } = useCompanyStore();

  // Detectar vista actual
  const viewMode = !activeCompany ? 'global' : !activeBranch ? 'company' : 'branch';

  useEffect(() => {
    loadKpis();
  }, [period, activeBranch?.id, activeCompany?.id]);

  async function loadKpis() {
    try {
      setLoading(true);
      setError("");
      
      if (viewMode === 'global') {
        const response = await api.get("/dashboard/kpis", { params: { period } });
        setKpis(response.data);
        setCompanyKpis(null);
      } else if (viewMode === 'company' && activeCompany?.id) {
        const response = await api.get(`/dashboard/company/${activeCompany.id}/kpis`, { params: { period } });
        setCompanyKpis(response.data);
        setKpis(null);
      } else {
        const response = await api.get("/dashboard/kpis", { params: { period } });
        setKpis(response.data);
        setCompanyKpis(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar dashboard");
    } finally {
      setLoading(false);
    }
  }

  function handleBackToGlobal() {
    setActiveCompany(null);
    setActiveBranch(null);
  }

  function handleSelectCompany(companyId: string) {
    // Seleccionar empresa - el usuario luego seleccionará sucursal en el selector del header
    // Por ahora, solo navegamos a la vista de esa empresa
    // TODO: Implementar selección automática de primera sucursal
  }

  // Datos para gráfica de barras por empresa (vista Global)
  const companyBarChartData = useMemo(() => {
    if (!kpis?.companiesBreakdown) return [];
    return kpis.companiesBreakdown.map((company: any) => ({
      name: company.companyName,
      saldo: Number(company.balance),
      ingresos: Number(company.income),
      egresos: Number(company.expense),
    }));
  }, [kpis?.companiesBreakdown]);

  // Datos para gráfica de barras por sucursal (vista Empresa)
  const branchBarChartData = useMemo(() => {
    if (!companyKpis?.branchesBreakdown) return [];
    return companyKpis.branchesBreakdown.map((branch: any) => ({
      name: branch.branchName,
      saldo: Number(branch.balance),
      ingresos: Number(branch.income),
      egresos: Number(branch.expense),
    }));
  }, [companyKpis?.branchesBreakdown]);

  // Datos para gráfica de línea de tendencia (vista Sucursal)
  const trendLineChartData = useMemo(() => {
    const data = [];
    const now = new Date();
    const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'year' ? 30 : 30;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      data.push({
        date: date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
        ingresos: Math.random() * 5000 + 2000,
        egresos: Math.random() * 4000 + 1500,
      });
    }
    return data;
  }, [period]);

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
              {viewMode === 'global' ? 'Vista Global (todas las empresas)' : 
               viewMode === 'company' ? `Empresa: ${activeCompany?.name || 'Seleccionar empresa'}` :
               `${activeCompany?.name || 'Empresa'} — ${activeBranch?.name || 'Sucursal'}`}
            </p>
          </div>
          <div className="flex gap-3">
            {viewMode !== 'global' && (
              <button
                onClick={handleBackToGlobal}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#2D2D2D',
                  color: '#F5F5F5',
                  borderRadius: '4px',
                  border: '1px solid #2D2D2D',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D3D3D'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2D2D2D'}
              >
                Ver todas las empresas
              </button>
            )}
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

            {/* Cards de empresas en vista consolidada */}
            {viewMode === 'global' && kpis?.companiesBreakdown && kpis.companiesBreakdown.length > 0 && (
              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>Desglose por Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {kpis.companiesBreakdown.map((company: any) => (
                    <div
                      key={company.companyId}
                      className="p-4 transition-colors cursor-pointer"
                      style={{
                        backgroundColor: '#0F0F0F',
                        borderRadius: '4px',
                        border: '1px solid #2D2D2D',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1F1F1F'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0F0F0F'}
                      onClick={() => handleSelectCompany(company.companyId)}
                    >
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#F5F5F5', marginBottom: '12px' }}>
                        {company.companyName}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span style={{ fontSize: '12px', color: '#7E7E7E' }}>Saldo</span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#C0C0C0' }}>
                            ${Number(company.balance).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span style={{ fontSize: '12px', color: '#7E7E7E' }}>Ingresos</span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#2F855A' }}>
                            ${Number(company.income).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span style={{ fontSize: '12px', color: '#7E7E7E' }}>Egresos</span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#C53030' }}>
                            ${Number(company.expense).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      <button
                        className="w-full mt-3 px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: '#2D2D2D',
                          color: '#F5F5F5',
                          borderRadius: '4px',
                          border: '1px solid #2D2D2D',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D3D3D'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2D2D2D'}
                      >
                        Ver detalle
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Charts and Movements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfica según vista */}
              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>
                  {viewMode === 'global' ? 'Comparativa por Empresa' :
                   viewMode === 'company' ? 'Comparativa por Sucursal' :
                   'Tendencia de Ingresos vs Egresos'}
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    {viewMode === 'global' && companyBarChartData.length > 0 ? (
                      <BarChart data={companyBarChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                        <XAxis dataKey="name" stroke="#A3A3A3" />
                        <YAxis stroke="#A3A3A3" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1F1F1F', border: '1px solid #2D2D2D', borderRadius: '4px', color: '#F5F5F5' }}
                          itemStyle={{ color: '#F5F5F5' }}
                        />
                        <Bar dataKey="saldo" fill="#C0C0C0" name="Saldo" />
                        <Bar dataKey="ingresos" fill="#2F855A" name="Ingresos" />
                        <Bar dataKey="egresos" fill="#C53030" name="Egresos" />
                      </BarChart>
                    ) : viewMode === 'company' && branchBarChartData.length > 0 ? (
                      <BarChart data={branchBarChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                        <XAxis dataKey="name" stroke="#A3A3A3" />
                        <YAxis stroke="#A3A3A3" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1F1F1F', border: '1px solid #2D2D2D', borderRadius: '4px', color: '#F5F5F5' }}
                          itemStyle={{ color: '#F5F5F5' }}
                        />
                        <Bar dataKey="saldo" fill="#C0C0C0" name="Saldo" />
                        <Bar dataKey="ingresos" fill="#2F855A" name="Ingresos" />
                        <Bar dataKey="egresos" fill="#C53030" name="Egresos" />
                      </BarChart>
                    ) : (
                      <LineChart data={trendLineChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                        <XAxis dataKey="date" stroke="#A3A3A3" />
                        <YAxis stroke="#A3A3A3" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1F1F1F', border: '1px solid #2D2D2D', borderRadius: '4px', color: '#F5F5F5' }}
                          itemStyle={{ color: '#F5F5F5' }}
                        />
                        <Line type="monotone" dataKey="ingresos" stroke="#C0C0C0" strokeWidth={2} dot={false} name="Ingresos" />
                        <Line type="monotone" dataKey="egresos" stroke="#2F855A" strokeWidth={2} dot={false} name="Egresos" />
                      </LineChart>
                    )}
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