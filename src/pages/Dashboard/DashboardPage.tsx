import MainLayout from "../../core/layout/MainLayout";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../core/api/api";
import DashboardInfoModal from "./DashboardInfoModal";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
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
      ventas: Number(company.income),
      costo: Number(company.expense) * 0.6,
      uai: Number(company.income) - Number(company.expense),
    }));
  }, [kpis?.companiesBreakdown]);

  const trendLineChartData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      data.push({
        date: date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
        value: Math.random() * 5000 + 2000,
      });
    }
    return data;
  }, []);

  const ventas = Number(kpis?.income || 0);
  const costo = Number(kpis?.expense || 0) * 0.6;
  const gasto = Number(kpis?.expense || 0) * 0.4;
  const uai = ventas - Number(kpis?.expense || 0);
  const udi = uai * 0.75;

  const formatCurrency = (value: number) => {
    return `$${Math.round(value).toLocaleString('es-MX')}`;
  };

  const formatPercent = (value: number) => {
    return `${Math.round(value)}%`;
  };

  const formatPercentDecimal = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <MainLayout>
      <DashboardInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
        {/* Header del módulo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderBottom: '1px solid #2D2D2D' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#F5F5F5', marginBottom: '4px' }}>
              Dashboard Ejecutivo
            </h1>
            <p style={{ fontSize: '13px', color: '#9A9A9A' }}>
              Vista consolidada del grupo
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                  color: period === p.value ? '#F5F5F5' : '#9A9A9A',
                  backgroundColor: period === p.value ? '#2D2D2D' : '#161616',
                  border: '1px solid #2D2D2D',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { if (period !== p.value) e.currentTarget.style.backgroundColor = '#1B1B1B'; }}
                onMouseLeave={(e) => { if (period !== p.value) e.currentTarget.style.backgroundColor = '#161616'; }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding: '24px' }}>
            <div style={{ backgroundColor: '#2D2D2D', border: '1px solid #9B3A3A', borderRadius: '8px', padding: '16px', color: '#F5F5F5' }}>
              {error}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '24px' }}>
            <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', padding: '24px', color: '#9A9A9A' }}>
              Cargando dashboard...
            </div>
          </div>
        ) : (
          <>
            {/* ZONA 1 - Resumen Consolidado */}
            <div style={{ padding: '24px', borderBottom: '1px solid #2D2D2D', display: 'flex', alignItems: 'center' }}>
              {/* Ventas */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                  Ventas
                </div>
                <div style={{ fontSize: '32px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
                  {formatCurrency(ventas)}
                </div>
                <div style={{ fontSize: '12px', color: '#3B7A57' }}>
                  +{formatPercent(kpis?.incomeVariation || 0)}
                </div>
              </div>

              <div style={{ width: '1px', height: '48px', backgroundColor: '#2D2D2D', margin: '0 24px' }} />

              {/* Costo */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                  Costo
                </div>
                <div style={{ fontSize: '32px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
                  {formatCurrency(costo)}
                </div>
                <div style={{ fontSize: '12px', color: '#9B3A3A' }}>
                  {formatPercent(kpis?.expenseVariation || 0)}
                </div>
              </div>

              <div style={{ width: '1px', height: '48px', backgroundColor: '#2D2D2D', margin: '0 24px' }} />

              {/* Gasto */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                  Gasto
                </div>
                <div style={{ fontSize: '32px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
                  {formatCurrency(gasto)}
                </div>
                <div style={{ fontSize: '12px', color: '#9A9A9A' }}>
                  {formatPercent(kpis?.expenseVariation || 0)}
                </div>
              </div>

              <div style={{ width: '1px', height: '48px', backgroundColor: '#2D2D2D', margin: '0 24px' }} />

              {/* UAI */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                  UAI
                </div>
                <div style={{ fontSize: '32px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
                  {formatCurrency(uai)}
                </div>
                <div style={{ fontSize: '12px', color: uai >= 0 ? '#3B7A57' : '#9B3A3A' }}>
                  {uai >= 0 ? '+' : ''}{formatPercent((uai / ventas) * 100)}
                </div>
              </div>

              <div style={{ width: '1px', height: '48px', backgroundColor: '#2D2D2D', margin: '0 24px' }} />

              {/* UDI */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                  UDI
                </div>
                <div style={{ fontSize: '32px', color: '#F5F5F5', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
                  {formatCurrency(udi)}
                </div>
                <div style={{ fontSize: '12px', color: udi >= 0 ? '#3B7A57' : '#9B3A3A' }}>
                  {udi >= 0 ? '+' : ''}{formatPercent((udi / ventas) * 100)}
                </div>
              </div>
            </div>

            {/* ZONA 2+3 - Comparativo y Detalle */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* ZONA 2 - Comparativo Empresas (65%) */}
              <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#F5F5F5', marginBottom: '4px' }}>
                    Comparativo por Empresa
                  </h2>
                  <p style={{ fontSize: '13px', color: '#9A9A9A' }}>
                    {period === 'today' ? 'Hoy' : period === 'week' ? 'Esta semana' : period === 'month' ? 'Este mes' : 'Este año'}
                  </p>
                </div>

                {/* BarChart */}
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', padding: '24px', marginBottom: '16px', flex: '0 0 auto' }}>
                  <div style={{ height: '240px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={companyBarChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                        <XAxis dataKey="name" stroke="#9A9A9A" fontSize="12" />
                        <YAxis stroke="#9A9A9A" fontSize="12" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', borderRadius: '6px', color: '#F5F5F5' }}
                          itemStyle={{ color: '#F5F5F5' }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '16px' }}
                          iconType="rect"
                        />
                        <Bar dataKey="ventas" fill="#BDBDBD" name="Ventas" />
                        <Bar dataKey="costo" fill="#7E7E7E" name="Costo" />
                        <Bar dataKey="uai" fill="#4A4A4A" name="UAI" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tabla */}
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', overflow: 'hidden', flex: 1, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
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
                          UAI
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Margen
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Part.%
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(kpis?.companiesBreakdown || []).map((company: any) => {
                        const compVentas = Number(company.income);
                        const compCosto = Number(company.expense) * 0.6;
                        const compUai = compVentas - Number(company.expense);
                        const compMargen = compVentas > 0 ? (compUai / compVentas) * 100 : 0;
                        const compPart = ventas > 0 ? (compVentas / ventas) * 100 : 0;
                        
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
                              {formatCurrency(compVentas)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#F5F5F5', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(compCosto)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: compUai >= 0 ? '#3B7A57' : '#9B3A3A', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(compUai)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#F5F5F5', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                              {formatPercentDecimal(compMargen)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#F5F5F5', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                              {formatPercentDecimal(compPart)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button
                                style={{
                                  padding: '4px 12px',
                                  fontSize: '11px',
                                  color: '#BDBDBD',
                                  backgroundColor: 'transparent',
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
                </div>
              </div>

              {/* ZONA 3 - Detalle Empresa (35%) */}
              <div style={{ flex: '0 0 35%', backgroundColor: '#161616', borderLeft: '1px solid #2D2D2D', padding: '24px', overflowY: 'auto' }}>
                {selectedCompany ? (
                  <>
                    <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#F5F5F5', marginBottom: '4px' }}>
                      {selectedCompany.companyName}
                    </h2>
                    <p style={{ fontSize: '12px', color: '#9A9A9A', marginBottom: '24px' }}>
                      Restaurantes y Servicios
                    </p>

                    <div style={{ borderBottom: '1px solid #2D2D2D', marginBottom: '24px' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#9A9A9A' }}>Ventas</span>
                        <span style={{ fontSize: '14px', color: '#F5F5F5', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(selectedCompany.income)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#9A9A9A' }}>Costo</span>
                        <span style={{ fontSize: '14px', color: '#F5F5F5', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(selectedCompany.expense * 0.6)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#9A9A9A' }}>UAI</span>
                        <span style={{ fontSize: '14px', color: '#F5F5F5', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(selectedCompany.income - selectedCompany.expense)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#9A9A9A' }}>Margen Neto</span>
                        <span style={{ fontSize: '14px', color: '#F5F5F5', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {formatPercentDecimal(((selectedCompany.income - selectedCompany.expense) / selectedCompany.income) * 100)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#9A9A9A' }}>Participación %</span>
                        <span style={{ fontSize: '14px', color: '#F5F5F5', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {formatPercentDecimal((selectedCompany.income / ventas) * 100)}
                        </span>
                      </div>
                    </div>

                    <div style={{ height: '120px', marginBottom: '24px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendLineChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                          <XAxis dataKey="date" stroke="#9A9A9A" fontSize="10" />
                          <YAxis stroke="#9A9A9A" fontSize="10" />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', borderRadius: '6px', color: '#F5F5F5' }}
                            itemStyle={{ color: '#F5F5F5' }}
                          />
                          <Line type="monotone" dataKey="value" stroke="#BDBDBD" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <button
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '13px',
                        color: '#BDBDBD',
                        backgroundColor: 'transparent',
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
                  <>
                    <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#F5F5F5', marginBottom: '4px' }}>
                      Resumen del Grupo
                    </h2>
                    <p style={{ fontSize: '12px', color: '#9A9A9A', marginBottom: '24px' }}>
                      Vista consolidada de todas las empresas
                    </p>

                    <div style={{ borderBottom: '1px solid #2D2D2D', marginBottom: '24px' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#9A9A9A' }}>Ventas Totales</span>
                        <span style={{ fontSize: '14px', color: '#F5F5F5', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(ventas)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#9A9A9A' }}>Costo Total</span>
                        <span style={{ fontSize: '14px', color: '#F5F5F5', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(costo)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#9A9A9A' }}>Gasto Total</span>
                        <span style={{ fontSize: '14px', color: '#F5F5F5', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(gasto)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#9A9A9A' }}>UAI Consolidada</span>
                        <span style={{ fontSize: '14px', color: '#F5F5F5', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(uai)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#9A9A9A' }}>UDI Consolidada</span>
                        <span style={{ fontSize: '14px', color: '#F5F5F5', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(udi)}
                        </span>
                      </div>
                    </div>

                    <div style={{ height: '120px', marginBottom: '24px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendLineChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                          <XAxis dataKey="date" stroke="#9A9A9A" fontSize="10" />
                          <YAxis stroke="#9A9A9A" fontSize="10" />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', borderRadius: '6px', color: '#F5F5F5' }}
                            itemStyle={{ color: '#F5F5F5' }}
                          />
                          <Line type="monotone" dataKey="value" stroke="#BDBDBD" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <p style={{ fontSize: '13px', color: '#9A9A9A', textAlign: 'center' }}>
                      Selecciona una empresa para ver el detalle
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}