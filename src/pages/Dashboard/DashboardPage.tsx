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
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const { activeBranch, activeCompany, setActiveCompany, setActiveBranch } = useCompanyStore();

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

  function handleSelectCompany(company: any) {
    setSelectedCompany(company);
  }

  const companyBarChartData = useMemo(() => {
    if (!kpis?.companiesBreakdown) return [];
    return kpis.companiesBreakdown.map((company: any) => ({
      name: company.companyName,
      ingresos: Number(company.income),
      egresos: Number(company.expense),
      utilidad: Number(company.income) - Number(company.expense),
    }));
  }, [kpis?.companiesBreakdown]);

  const branchBarChartData = useMemo(() => {
    if (!companyKpis?.branchesBreakdown) return [];
    return companyKpis.branchesBreakdown.map((branch: any) => ({
      name: branch.branchName,
      ingresos: Number(branch.income),
      egresos: Number(branch.expense),
      utilidad: Number(branch.income) - Number(branch.expense),
    }));
  }, [companyKpis?.branchesBreakdown]);

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

  const totalIncome = Number(kpis?.income || 0);
  const totalExpense = Number(kpis?.expense || 0);
  const netFlow = totalIncome - totalExpense;
  const accountsPayable = Number(kpis?.accountsPayable || 0);
  const accountsReceivable = Number(kpis?.accountsReceivable || 0);

  const formatCurrency = (value: number) => {
    return `$${Math.round(value).toLocaleString('es-MX')}`;
  };

  const formatPercent = (value: number) => {
    return `${Math.round(value)}%`;
  };

  return (
    <MainLayout>
      <DashboardInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header del módulo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 500, color: '#F5F5F5', marginBottom: '4px' }}>
              Dashboard
            </h1>
            <p style={{ fontSize: '13px', color: '#9A9A9A' }}>
              {viewMode === 'global' ? 'Vista Global (todas las empresas)' : 
               viewMode === 'company' ? `${activeCompany?.name || 'Empresa'} — Todas las sucursales` :
               `${activeCompany?.name || 'Empresa'} — ${activeBranch?.name || 'Sucursal'}`}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {viewMode !== 'global' && (
              <button
                onClick={handleBackToGlobal}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  color: '#F5F5F5',
                  backgroundColor: '#2D2D2D',
                  border: '1px solid #2D2D2D',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D3D3D'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2D2D2D'}
              >
                Ver todas las empresas
              </button>
            )}
            
            {[
              { value: 'today', label: 'Hoy' },
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mes' },
              { value: 'year', label: 'Año' },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value as any)}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  color: period === p.value ? '#0A0A0A' : '#F5F5F5',
                  backgroundColor: period === p.value ? '#BDBDBD' : '#2D2D2D',
                  border: '1px solid #2D2D2D',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { if (period !== p.value) e.currentTarget.style.backgroundColor = '#3D3D3D'; }}
                onMouseLeave={(e) => { if (period !== p.value) e.currentTarget.style.backgroundColor = '#2D2D2D'; }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#2D2D2D', border: '1px solid #9B3A3A', borderRadius: '8px', padding: '16px', color: '#F5F5F5' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', padding: '24px', color: '#9A9A9A' }}>
            Cargando dashboard...
          </div>
        ) : (
          <>
            {/* Fila de KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', padding: '20px 24px' }}>
                <div style={{ fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Ventas Totales
                </div>
                <div style={{ fontSize: '28px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
                  {formatCurrency(totalIncome)}
                </div>
                <div style={{ fontSize: '12px', color: '#3B7A57' }}>
                  +{formatPercent(kpis?.incomeVariation || 0)} vs período anterior
                </div>
                <div style={{ fontSize: '11px', color: '#9A9A9A', marginTop: '4px' }}>
                  Total ingresos del período
                </div>
              </div>

              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', padding: '20px 24px' }}>
                <div style={{ fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Costo de Ventas
                </div>
                <div style={{ fontSize: '28px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
                  {formatCurrency(totalExpense)}
                </div>
                <div style={{ fontSize: '12px', color: '#9B3A3A' }}>
                  {formatPercent(kpis?.expenseVariation || 0)} vs período anterior
                </div>
                <div style={{ fontSize: '11px', color: '#9A9A9A', marginTop: '4px' }}>
                  Total egresos del período
                </div>
              </div>

              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', padding: '20px 24px' }}>
                <div style={{ fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Flujo Neto
                </div>
                <div style={{ fontSize: '28px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
                  {formatCurrency(netFlow)}
                </div>
                <div style={{ fontSize: '12px', color: netFlow >= 0 ? '#3B7A57' : '#9B3A3A' }}>
                  {netFlow >= 0 ? '+' : ''}{formatPercent((netFlow / totalIncome) * 100)} margen
                </div>
                <div style={{ fontSize: '11px', color: '#9A9A9A', marginTop: '4px' }}>
                  Diferencia ingresos - egresos
                </div>
              </div>

              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', padding: '20px 24px' }}>
                <div style={{ fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Cuentas por Pagar
                </div>
                <div style={{ fontSize: '28px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
                  {formatCurrency(accountsPayable)}
                </div>
                <div style={{ fontSize: '12px', color: '#9A9A9A' }}>
                  {kpis?.pendingInvoices || 0} facturas pendientes
                </div>
                <div style={{ fontSize: '11px', color: '#9A9A9A', marginTop: '4px' }}>
                  Total facturas pendientes de pago
                </div>
              </div>

              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', padding: '20px 24px' }}>
                <div style={{ fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Cuentas por Cobrar
                </div>
                <div style={{ fontSize: '28px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
                  {formatCurrency(accountsReceivable)}
                </div>
                <div style={{ fontSize: '12px', color: '#9A9A9A' }}>
                  {kpis?.pendingInvoices || 0} facturas pendientes
                </div>
                <div style={{ fontSize: '11px', color: '#9A9A9A', marginTop: '4px' }}>
                  Total facturas pendientes de cobro
                </div>
              </div>
            </div>

            {/* Sección Central */}
            <div style={{ display: 'grid', gridTemplateColumns: '65% 35%', gap: '24px' }}>
              {/* Izquierda - Gráfica y Tabla */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#F5F5F5', marginBottom: '4px' }}>
                    Desempeño por Empresa
                  </h2>
                  <p style={{ fontSize: '13px', color: '#9A9A9A', marginBottom: '16px' }}>
                    {period === 'today' ? 'Hoy' : period === 'week' ? 'Esta semana' : period === 'month' ? 'Este mes' : 'Este año'}
                  </p>
                </div>

                {/* BarChart */}
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', padding: '24px' }}>
                  <div style={{ height: '280px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {viewMode === 'global' && companyBarChartData.length > 0 ? (
                        <BarChart data={companyBarChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                          <XAxis dataKey="name" stroke="#9A9A9A" fontSize="12" />
                          <YAxis stroke="#9A9A9A" fontSize="12" />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', borderRadius: '6px', color: '#F5F5F5' }}
                            itemStyle={{ color: '#F5F5F5' }}
                          />
                          <Bar dataKey="ingresos" fill="#BDBDBD" name="Ingresos" />
                          <Bar dataKey="egresos" fill="#7E7E7E" name="Egresos" />
                          <Bar dataKey="utilidad" fill="#4A4A4A" name="Utilidad" />
                        </BarChart>
                      ) : viewMode === 'company' && branchBarChartData.length > 0 ? (
                        <BarChart data={branchBarChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                          <XAxis dataKey="name" stroke="#9A9A9A" fontSize="12" />
                          <YAxis stroke="#9A9A9A" fontSize="12" />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', borderRadius: '6px', color: '#F5F5F5' }}
                            itemStyle={{ color: '#F5F5F5' }}
                          />
                          <Bar dataKey="ingresos" fill="#BDBDBD" name="Ingresos" />
                          <Bar dataKey="egresos" fill="#7E7E7E" name="Egresos" />
                          <Bar dataKey="utilidad" fill="#4A4A4A" name="Utilidad" />
                        </BarChart>
                      ) : (
                        <LineChart data={trendLineChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                          <XAxis dataKey="date" stroke="#9A9A9A" fontSize="12" />
                          <YAxis stroke="#9A9A9A" fontSize="12" />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', borderRadius: '6px', color: '#F5F5F5' }}
                            itemStyle={{ color: '#F5F5F5' }}
                          />
                          <Line type="monotone" dataKey="ingresos" stroke="#BDBDBD" strokeWidth={2} dot={false} name="Ingresos" />
                          <Line type="monotone" dataKey="egresos" stroke="#7E7E7E" strokeWidth={2} dot={false} name="Egresos" />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tabla */}
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#1B1B1B' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Empresa
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Ventas
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Costo
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Gastos
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Utilidad
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Margen
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(kpis?.companiesBreakdown || []).map((company: any) => {
                        const ventas = Number(company.income);
                        const costo = Number(company.expense);
                        const gastos = 0;
                        const utilidad = ventas - costo - gastos;
                        const margen = ventas > 0 ? (utilidad / ventas) * 100 : 0;
                        
                        return (
                          <tr
                            key={company.companyId}
                            style={{ borderBottom: '1px solid #2D2D2D', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1B1B1B'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={() => handleSelectCompany(company)}
                          >
                            <td style={{ padding: '12px 16px', color: '#F5F5F5', fontSize: '13px' }}>
                              {company.companyName}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#F5F5F5', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(ventas)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#F5F5F5', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(costo)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#F5F5F5', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(gastos)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: utilidad >= 0 ? '#3B7A57' : '#9B3A3A', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(utilidad)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#F5F5F5', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                              {formatPercent(margen)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button
                                style={{
                                  padding: '4px 12px',
                                  fontSize: '11px',
                                  color: '#BDBDBD',
                                  backgroundColor: '#1B1B1B',
                                  border: '1px solid #2D2D2D',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#BDBDBD'; e.currentTarget.style.color = '#F5F5F5'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2D2D2D'; e.currentTarget.style.color = '#BDBDBD'; }}
                              >
                                Ver
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #2D2D2D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#9A9A9A' }}>
                      1-{kpis?.companiesBreakdown?.length || 0} de {kpis?.companiesBreakdown?.length || 0} empresas
                    </span>
                  </div>
                </div>
              </div>

              {/* Derecha - Panel de detalle */}
              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', padding: '24px' }}>
                {selectedCompany ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '8px',
                        backgroundColor: '#1B1B1B',
                        border: '1px solid #2D2D2D',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        color: '#BDBDBD',
                      }}>
                        {selectedCompany.companyName.charAt(0)}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 500, color: '#F5F5F5', marginBottom: '4px' }}>
                          {selectedCompany.companyName}
                        </h3>
                        <p style={{ fontSize: '12px', color: '#9A9A9A' }}>
                          Restaurantes y Servicios
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#9A9A9A', marginBottom: '4px' }}>Ventas</div>
                        <div style={{ fontSize: '20px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(selectedCompany.income)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#9A9A9A', marginBottom: '4px' }}>Costo</div>
                        <div style={{ fontSize: '20px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(selectedCompany.expense)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#9A9A9A', marginBottom: '4px' }}>Utilidad</div>
                        <div style={{ fontSize: '20px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(selectedCompany.income - selectedCompany.expense)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#9A9A9A', marginBottom: '4px' }}>Margen</div>
                        <div style={{ fontSize: '20px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {formatPercent(((selectedCompany.income - selectedCompany.expense) / selectedCompany.income) * 100)}
                        </div>
                      </div>
                    </div>

                    <div style={{ height: '120px', marginBottom: '24px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendLineChartData.slice(0, 7)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                          <XAxis dataKey="date" stroke="#9A9A9A" fontSize="10" />
                          <YAxis stroke="#9A9A9A" fontSize="10" />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', borderRadius: '6px', color: '#F5F5F5' }}
                            itemStyle={{ color: '#F5F5F5' }}
                          />
                          <Line type="monotone" dataKey="ingresos" stroke="#BDBDBD" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <button
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '13px',
                        color: '#BDBDBD',
                        backgroundColor: '#1B1B1B',
                        border: '1px solid #2D2D2D',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#BDBDBD'; e.currentTarget.style.color = '#F5F5F5'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2D2D2D'; e.currentTarget.style.color = '#BDBDBD'; }}
                    >
                      Ver detalle completo →
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <p style={{ fontSize: '14px', color: '#9A9A9A' }}>
                      Selecciona una empresa para ver el detalle
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}