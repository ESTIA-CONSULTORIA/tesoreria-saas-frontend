import MainLayout from "../../core/layout/MainLayout";
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../core/api/api";
import { useNavigate } from "react-router-dom";
import DashboardInfoModal from "./DashboardInfoModal";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { useCompanyStore } from "../../core/store/useCompanyStore";

type NavigationLevel = 'group' | 'company-selection' | 'company-detail' | 'branch-selection' | 'branch-detail';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<any>(null);
  const [companyKpis, setCompanyKpis] = useState<any>(null);
  const [branchKpis, setBranchKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("month");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [navigationLevel, setNavigationLevel] = useState<NavigationLevel>('group');
  const [companies, setCompanies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [pendingShifts, setPendingShifts] = useState<any[]>([]);
  const { activeBranch, activeCompany, setActiveCompany, setActiveBranch } = useCompanyStore();

  useEffect(() => {
    loadKpis();
    loadPendingShifts();
  }, [period, navigationLevel, selectedCompany?.companyId, selectedBranch?.branchId]);

  async function loadPendingShifts() {
    try {
      const response = await api.get("/pos/shifts", { params: { status: 'PENDIENTE_APROBACION' } });
      setPendingShifts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setPendingShifts([]);
    }
  }

  async function loadKpis() {
    try {
      setLoading(true);
      setError("");
      
      if (navigationLevel === 'group' || navigationLevel === 'company-selection') {
        const response = await api.get("/dashboard/kpis", { params: { period } });
        setKpis(response.data);
        setCompanyKpis(null);
        setBranchKpis(null);
        // Cargar lista de empresas
        if (response.data?.companiesBreakdown) {
          setCompanies(response.data.companiesBreakdown);
        }
      } else if (navigationLevel === 'company-detail' && selectedCompany) {
        const response = await api.get(`/dashboard/company/${selectedCompany.companyId}/kpis`, { params: { period } });
        setCompanyKpis(response.data);
        setKpis(null);
        setBranchKpis(null);
        // Cargar lista de sucursales
        if (response.data?.branchesBreakdown) {
          setBranches(response.data.branchesBreakdown);
        }
      } else if (navigationLevel === 'branch-detail' && selectedBranch) {
        // Fallback: endpoint de sucursal no existe aún, usar endpoint de empresa
        if (selectedCompany) {
          const response = await api.get(`/dashboard/company/${selectedCompany.companyId}/kpis`, { params: { period } });
          setCompanyKpis(response.data);
          setKpis(null);
          setBranchKpis(null);
        } else {
          // Si no hay empresa seleccionada, usar endpoint global
          const response = await api.get("/dashboard/kpis", { params: { period } });
          setKpis(response.data);
          setCompanyKpis(null);
          setBranchKpis(null);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar dashboard");
    } finally {
      setLoading(false);
    }
  }

  function handleBackToGlobal() {
    setNavigationLevel('group');
    setSelectedCompany(null);
    setSelectedBranch(null);
  }

  function handleGoToCompanySelection() {
    setNavigationLevel('company-selection');
  }

  function handleSelectCompany(company: any) {
    setSelectedCompany(company);
    setNavigationLevel('company-detail');
  }

  function handleGoToBranchSelection() {
    setNavigationLevel('branch-selection');
  }

  function handleSelectBranch(branch: any) {
    setSelectedBranch(branch);
    setNavigationLevel('branch-detail');
  }

  function handleNavigateToBreadcrumb(level: NavigationLevel) {
    if (level === 'group') {
      setNavigationLevel('group');
      setSelectedCompany(null);
      setSelectedBranch(null);
    } else if (level === 'company-detail' && selectedCompany) {
      setNavigationLevel('company-detail');
      setSelectedBranch(null);
    }
  }

  // Auto-salto lógica
  useEffect(() => {
    if (companies.length === 1 && navigationLevel === 'group') {
      // Si solo hay 1 empresa, saltar a detalle de empresa automáticamente
      handleSelectCompany(companies[0]);
    }
  }, [companies, navigationLevel]);

  useEffect(() => {
    if (branches.length === 1 && navigationLevel === 'company-detail') {
      // Si solo hay 1 sucursal, saltar a detalle de sucursal automáticamente
      handleSelectBranch(branches[0]);
    }
  }, [branches, navigationLevel]);

  const getBreadcrumbItems = () => {
    const items = [{ label: 'Grupo', level: 'group' as NavigationLevel }];
    if (selectedCompany) {
      items.push({ label: selectedCompany.companyName, level: 'company-detail' as NavigationLevel });
    }
    if (selectedBranch) {
      items.push({ label: selectedBranch.branchName, level: 'branch-detail' as NavigationLevel });
    }
    return items;
  };

  const companyBarChartData = useMemo(() => {
    if (kpis?.companiesBreakdown?.length > 0) {
      return kpis.companiesBreakdown.map((company: any) => ({
        name: company.companyName,
        Ingresos: Number(company.income),
        Egresos: Number(company.expense),
        Saldo: Number(company.income) - Number(company.expense),
      }));
    }
    // Fallback: datos consolidados si no hay empresas
    return [{
      name: 'Grupo Consolidado',
      Ingresos: Number(kpis?.ingresos || 0),
      Egresos: Number(kpis?.egresos || 0),
      Saldo: Number(kpis?.saldoDisponible || 0),
    }];
  }, [kpis?.companiesBreakdown, kpis?.ingresos, kpis?.egresos, kpis?.saldoDisponible]);

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

  const companyVentas = Number(companyKpis?.income || 0);
  const companyCosto = Number(companyKpis?.expense || 0) * 0.6;
  const companyGasto = Number(companyKpis?.expense || 0) * 0.4;
  const companyUai = companyVentas - Number(companyKpis?.expense || 0);
  const companyUdi = companyUai * 0.75;

  const branchVentas = Number(branchKpis?.income || 0);
  const branchCosto = Number(branchKpis?.expense || 0) * 0.6;
  const branchGasto = Number(branchKpis?.expense || 0) * 0.4;
  const branchUai = branchVentas - Number(branchKpis?.expense || 0);
  const branchUdi = branchUai * 0.75;

  const formatCurrency = (value: number) => {
    return `$${Math.round(value).toLocaleString('es-MX')}`;
  };

  const formatPercent = (value: number) => {
    const pct = Math.round(value);
    const pctDisplay = pct > 999 ? '+999%' : 
                       pct < -999 ? '-999%' : 
                       `${pct > 0 ? '+' : ''}${pct}%`;
    return pctDisplay;
  };

  const formatPercentDecimal = (value: number) => {
    return `${Math.round(value)}%`;
  };

  return (
    <MainLayout>
      <DashboardInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', backgroundColor: '#0A0A0A' }}>
        {/* Header del módulo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #2D2D2D', backgroundColor: '#0A0A0A' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 400, color: '#F5F5F5', marginBottom: '2px', letterSpacing: '0.02em' }}>
              Dashboard Ejecutivo
            </h1>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              {getBreadcrumbItems().map((item, index) => (
                <React.Fragment key={item.level}>
                  {index > 0 && <span style={{ color: '#7E7E7E', fontSize: '12px' }}>/</span>}
                  <button
                    onClick={() => handleNavigateToBreadcrumb(item.level)}
                    style={{
                      fontSize: '12px',
                      color: index === getBreadcrumbItems().length - 1 ? '#F5F5F5' : '#7E7E7E',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: index === getBreadcrumbItems().length - 1 ? 'default' : 'pointer',
                      padding: 0,
                      letterSpacing: '0.01em',
                    }}
                    onMouseEnter={(e) => { if (index < getBreadcrumbItems().length - 1) e.currentTarget.style.color = '#BDBDBD'; }}
                    onMouseLeave={(e) => { if (index < getBreadcrumbItems().length - 1) e.currentTarget.style.color = '#7E7E7E'; }}
                  >
                    {item.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
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
                  padding: '6px 14px',
                  fontSize: '12px',
                  color: period === p.value ? '#F5F5F5' : '#7E7E7E',
                  backgroundColor: period === p.value ? '#1B1B1B' : 'transparent',
                  border: period === p.value ? '1px solid #2D2D2D' : '1px solid #2D2D2D',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => { if (period !== p.value) e.currentTarget.style.backgroundColor = '#161616'; e.currentTarget.style.borderColor = '#3D3D3D'; }}
                onMouseLeave={(e) => { if (period !== p.value) e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#2D2D2D'; }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Executive Alert Band */}
        {(!loading && kpis) && (
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #2D2D2D', backgroundColor: '#0A0A0A' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {pendingShifts.length > 0 && (
                <div
                  onClick={() => navigate('/pos')}
                  style={{
                    padding: '8px 14px',
                    border: '1px solid #8A6A3A44',
                    background: '#8A6A3A11',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#8A6A3A',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8A6A3A88'; e.currentTarget.style.background = '#8A6A3A22'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#8A6A3A44'; e.currentTarget.style.background = '#8A6A3A11'; }}
                >
                  <span>⚠</span>
                  <span>{pendingShifts.length} cortes pendientes de revisión</span>
                </div>
              )}
              {(kpis.cxpVencidas && kpis.cxpVencidas > 0) && (
                <div
                  onClick={() => navigate('/treasury')}
                  style={{
                    padding: '8px 14px',
                    border: '1px solid #8A6A3A44',
                    background: '#8A6A3A11',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#8A6A3A',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8A6A3A88'; e.currentTarget.style.background = '#8A6A3A22'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#8A6A3A44'; e.currentTarget.style.background = '#8A6A3A11'; }}
                >
                  <span>⚠</span>
                  <span>{kpis.cxpVencidas} facturas vencidas</span>
                </div>
              )}
              {(kpis.saldoDisponible && kpis.saldoDisponible < 10000) && (
                <div
                  onClick={() => navigate('/banks')}
                  style={{
                    padding: '8px 14px',
                    border: '1px solid #8A6A3A44',
                    background: '#8A6A3A11',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#8A6A3A',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8A6A3A88'; e.currentTarget.style.background = '#8A6A3A22'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#8A6A3A44'; e.currentTarget.style.background = '#8A6A3A11'; }}
                >
                  <span>⚠</span>
                  <span>Saldo bajo en cuentas</span>
                </div>
              )}
            </div>
          </div>
        )}

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
            {/* VISTA: Selección de Empresa (Nivel 2) */}
            {navigationLevel === 'company-selection' && (
              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 400, color: '#F5F5F5', marginBottom: '8px', letterSpacing: '0.01em' }}>
                  Selecciona una empresa
                </h2>
                <p style={{ fontSize: '12px', color: '#7E7E7E', marginBottom: '24px', letterSpacing: '0.01em' }}>
                  {companies.length} empresas disponibles
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {companies.map((company) => {
                    const compVentas = Number(company.income);
                    const compUai = compVentas - Number(company.expense);
                    const compMargen = compVentas > 0 ? (compUai / compVentas) * 100 : 0;
                    return (
                      <div
                        key={company.companyId}
                        onClick={() => handleSelectCompany(company)}
                        style={{
                          backgroundColor: '#161616',
                          border: '1px solid #2D2D2D',
                          borderRadius: '4px',
                          padding: '20px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3D3D3D'; e.currentTarget.style.backgroundColor = '#1B1B1B'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2D2D2D'; e.currentTarget.style.backgroundColor = '#161616'; }}
                      >
                        <h3 style={{ fontSize: '14px', fontWeight: 400, color: '#F5F5F5', marginBottom: '12px', letterSpacing: '0.01em' }}>
                          {company.companyName}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Ventas</span>
                            <span style={{ fontSize: '12px', color: '#F5F5F5', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(compVentas)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E' }}>UAI</span>
                            <span style={{ fontSize: '12px', color: compUai >= 0 ? '#3B7A57' : '#9B3A3A', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(compUai)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Margen</span>
                            <span style={{ fontSize: '12px', color: '#F5F5F5', fontVariantNumeric: 'tabular-nums' }}>
                              {formatPercentDecimal(compMargen)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VISTA: Selección de Sucursal (Nivel 4) */}
            {navigationLevel === 'branch-selection' && (
              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 400, color: '#F5F5F5', marginBottom: '8px', letterSpacing: '0.01em' }}>
                  Selecciona una sucursal
                </h2>
                <p style={{ fontSize: '12px', color: '#7E7E7E', marginBottom: '24px', letterSpacing: '0.01em' }}>
                  {branches.length} sucursales disponibles
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {branches.map((branch) => {
                    const branchVentas = Number(branch.income);
                    const branchUai = branchVentas - Number(branch.expense);
                    const branchMargen = branchVentas > 0 ? (branchUai / branchVentas) * 100 : 0;
                    return (
                      <div
                        key={branch.branchId}
                        onClick={() => handleSelectBranch(branch)}
                        style={{
                          backgroundColor: '#161616',
                          border: '1px solid #2D2D2D',
                          borderRadius: '4px',
                          padding: '20px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3D3D3D'; e.currentTarget.style.backgroundColor = '#1B1B1B'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2D2D2D'; e.currentTarget.style.backgroundColor = '#161616'; }}
                      >
                        <h3 style={{ fontSize: '14px', fontWeight: 400, color: '#F5F5F5', marginBottom: '12px', letterSpacing: '0.01em' }}>
                          {branch.branchName}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Ventas</span>
                            <span style={{ fontSize: '12px', color: '#F5F5F5', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(branchVentas)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E' }}>UAI</span>
                            <span style={{ fontSize: '12px', color: branchUai >= 0 ? '#3B7A57' : '#9B3A3A', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(branchUai)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Margen</span>
                            <span style={{ fontSize: '12px', color: '#F5F5F5', fontVariantNumeric: 'tabular-nums' }}>
                              {formatPercentDecimal(branchMargen)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VISTA: Grupo / Empresa / Sucursal (Dashboard actual) */}
            {(navigationLevel === 'group' || navigationLevel === 'company-detail' || navigationLevel === 'branch-detail') && (
              <>
                {/* ZONA 1 - Resumen Consolidado */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #2D2D2D', display: 'flex', alignItems: 'center', backgroundColor: '#0A0A0A' }}>
                  {/* Ventas */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
                      Ventas
                    </div>
                    <div style={{ fontSize: '28px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                      {formatCurrency(ventas)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#3B7A57', letterSpacing: '0.01em' }}>
                      {kpis?.incomeVariation >= 0 ? '+' : ''}{formatPercent(kpis?.incomeVariation || 0)}
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '40px', backgroundColor: '#2D2D2D', margin: '0 20px' }} />

                  {/* Costo */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
                      Costo
                    </div>
                    <div style={{ fontSize: '28px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                      {formatCurrency(costo)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9B3A3A', letterSpacing: '0.01em' }}>
                      {kpis?.expenseVariation >= 0 ? '+' : ''}{formatPercent(kpis?.expenseVariation || 0)}
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '40px', backgroundColor: '#2D2D2D', margin: '0 20px' }} />

                  {/* Gasto */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
                      Gasto
                    </div>
                    <div style={{ fontSize: '28px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                      {formatCurrency(gasto)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>
                      {kpis?.expenseVariation >= 0 ? '+' : ''}{formatPercent(kpis?.expenseVariation || 0)}
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '40px', backgroundColor: '#2D2D2D', margin: '0 20px' }} />

                  {/* UAI */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
                      UAI
                    </div>
                    <div style={{ fontSize: '28px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                      {formatCurrency(uai)}
                    </div>
                    <div style={{ fontSize: '11px', color: uai >= 0 ? '#3B7A57' : '#9B3A3A', letterSpacing: '0.01em' }}>
                      {uai >= 0 ? '+' : ''}{formatPercent((uai / ventas) * 100)}
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '40px', backgroundColor: '#2D2D2D', margin: '0 20px' }} />

                  {/* UDI */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
                      UDI
                    </div>
                    <div style={{ fontSize: '28px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                      {formatCurrency(udi)}
                    </div>
                    <div style={{ fontSize: '11px', color: udi >= 0 ? '#3B7A57' : '#9B3A3A', letterSpacing: '0.01em' }}>
                      {udi >= 0 ? '+' : ''}{formatPercent((udi / ventas) * 100)}
                    </div>
                  </div>
                </div>

                {/* ZONA 2+3 - Comparativo y Detalle */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', backgroundColor: '#0A0A0A' }}>
                  {/* ZONA 2 - Comparativo Empresas (65%) */}
                  <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', padding: '20px 24px', overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ fontSize: '14px', fontWeight: 400, color: '#F5F5F5', marginBottom: '2px', letterSpacing: '0.01em' }}>
                          Comparativo por Empresa
                        </h2>
                        <p style={{ fontSize: '12px', color: '#7E7E7A', letterSpacing: '0.01em' }}>
                          {period === 'today' ? 'Hoy' : period === 'week' ? 'Esta semana' : period === 'month' ? 'Este mes' : 'Este año'}
                        </p>
                      </div>
                      {navigationLevel === 'group' && companies.length > 1 && (
                        <button
                          onClick={handleGoToCompanySelection}
                          style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            color: '#BDBDBD',
                            backgroundColor: 'transparent',
                            border: '1px solid #2D2D2D',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            letterSpacing: '0.01em',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3D3D3D'; e.currentTarget.style.color = '#F5F5F5'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2D2D2D'; e.currentTarget.style.color = '#BDBDBD'; }}
                        >
                          Ver empresas →
                        </button>
                      )}
                    </div>

                {/* BarChart */}
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '4px', padding: '20px', marginBottom: '12px', flex: '0 0 auto', minWidth: 0 }}>
                  {companyBarChartData.length > 0 ? (
                    <div style={{ height: '220px' }}>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={companyBarChartData}>
                        <CartesianGrid strokeDasharray="4 4" stroke="#2D2D2D" vertical={false} />
                        <XAxis dataKey="name" stroke="#7E7E7E" fontSize="11" tick={{ fill: '#7E7E7E' }} />
                        <YAxis stroke="#7E7E7E" fontSize="11" tick={{ fill: '#7E7E7E' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', borderRadius: '2px', color: '#F5F5F5', fontSize: '12px', padding: '8px 12px' }}
                          itemStyle={{ color: '#F5F5F5', fontSize: '11px' }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }}
                          iconType="rect"
                          formatter={(value: string) => <span style={{ color: '#BDBDBD', fontSize: '11px' }}>{value}</span>}
                        />
                        <Bar dataKey="Ingresos" fill="#BDBDBD" name="Ingresos" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Egresos" fill="#7E7E7E" name="Egresos" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Saldo" fill="#4A4A4A" name="Saldo" radius={[0, 0, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7E7E7E', fontSize: '12px' }}>
                      Sin datos para mostrar
                    </div>
                  )}
                </div>

                {/* Tabla */}
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '4px', overflow: 'hidden', flex: 1, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr style={{ backgroundColor: '#1B1B1B' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Empresa
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Ventas
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Costo
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Gasto
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          UAI
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          UDI
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Margen
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Part.%
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(kpis?.companiesBreakdown || []).map((company: any) => {
                        const compVentas = Number(company.income);
                        const compCosto = Number(company.expense) * 0.6;
                        const compGasto = Number(company.expense) * 0.4;
                        const compUai = compVentas - Number(company.expense);
                        const compUdi = compUai * 0.75;
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
                            <td style={{ padding: '10px 12px', color: '#F5F5F5', fontSize: '12px', letterSpacing: '0.01em' }}>
                              {company.companyName}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#F5F5F5', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(compVentas)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#F5F5F5', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(compCosto)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#F5F5F5', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(compGasto)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: compUai >= 0 ? '#3B7A57' : '#9B3A3A', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(compUai)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: compUdi >= 0 ? '#3B7A57' : '#9B3A3A', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(compUdi)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#F5F5F5', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatPercentDecimal(compMargen)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#F5F5F5', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatPercentDecimal(compPart)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button
                                style={{
                                  padding: '3px 10px',
                                  fontSize: '10px',
                                  color: '#BDBDBD',
                                  backgroundColor: 'transparent',
                                  border: '1px solid #2D2D2D',
                                  borderRadius: '2px',
                                  cursor: 'pointer',
                                  letterSpacing: '0.01em',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3D3D3D'; e.currentTarget.style.color = '#F5F5F5'; }}
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
                  <div style={{ flex: '0 0 35%', backgroundColor: '#161616', borderLeft: '1px solid #2D2D2D', padding: '20px 24px', overflowY: 'auto', minWidth: 0 }}>
                    {selectedCompany ? (
                      <>
                        <h2 style={{ fontSize: '16px', fontWeight: 400, color: '#F5F5F5', marginBottom: '2px', letterSpacing: '0.01em' }}>
                          {selectedCompany.companyName}
                        </h2>
                        <p style={{ fontSize: '11px', color: '#7E7E7E', marginBottom: '20px', letterSpacing: '0.01em' }}>
                          Restaurantes y Servicios
                        </p>

                        <div style={{ borderBottom: '1px solid #2D2D2D', marginBottom: '20px' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Ventas</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(selectedCompany.income)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Costo</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(selectedCompany.expense * 0.6)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Gasto</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(selectedCompany.expense * 0.4)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>UAI</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(selectedCompany.income - selectedCompany.expense)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>UDI</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency((selectedCompany.income - selectedCompany.expense) * 0.75)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Margen Neto</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatPercentDecimal(((selectedCompany.income - selectedCompany.expense) / selectedCompany.income) * 100)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Participación %</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatPercentDecimal((selectedCompany.income / ventas) * 100)}
                            </span>
                          </div>
                        </div>

                        <div style={{ height: '100px', marginBottom: '20px', minWidth: 0 }}>
                          <ResponsiveContainer width="100%" height={100}>
                            <LineChart data={trendLineChartData}>
                              <CartesianGrid strokeDasharray="4 4" stroke="#2D2D2D" vertical={false} />
                              <XAxis dataKey="date" stroke="#7E7E7E" fontSize="10" tick={{ fill: '#7E7E7E' }} />
                              <YAxis stroke="#7E7E7E" fontSize="10" tick={{ fill: '#7E7E7E' }} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', borderRadius: '2px', color: '#F5F5F5', fontSize: '11px', padding: '6px 10px' }}
                                itemStyle={{ color: '#F5F5F5', fontSize: '10px' }}
                              />
                              <Line type="monotone" dataKey="value" stroke="#BDBDBD" strokeWidth={1.5} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        <button
                          style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '12px',
                            color: '#BDBDBD',
                            backgroundColor: 'transparent',
                            border: '1px solid #2D2D2D',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            letterSpacing: '0.01em',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3D3D3D'; e.currentTarget.style.color = '#F5F5F5'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2D2D2D'; e.currentTarget.style.color = '#BDBDBD'; }}
                        >
                          Ver detalle completo →
                        </button>
                      </>
                    ) : (
                      <>
                        <h2 style={{ fontSize: '16px', fontWeight: 400, color: '#F5F5F5', marginBottom: '2px', letterSpacing: '0.01em' }}>
                          Resumen del Grupo
                        </h2>
                        <p style={{ fontSize: '11px', color: '#7E7E7E', marginBottom: '20px', letterSpacing: '0.01em' }}>
                          Vista consolidada de todas las empresas
                        </p>

                        <div style={{ borderBottom: '1px solid #2D2D2D', marginBottom: '20px' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Ventas Totales</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(ventas)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Costo Total</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(costo)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Gasto Total</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(gasto)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>UAI Consolidada</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(uai)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>UDI Consolidada</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(udi)}
                            </span>
                          </div>
                        </div>

                        <div style={{ height: '100px', marginBottom: '20px', minWidth: 0 }}>
                          <ResponsiveContainer width="100%" height={100}>
                            <LineChart data={trendLineChartData}>
                              <CartesianGrid strokeDasharray="4 4" stroke="#2D2D2D" vertical={false} />
                              <XAxis dataKey="date" stroke="#7E7E7E" fontSize="10" tick={{ fill: '#7E7E7E' }} />
                              <YAxis stroke="#7E7E7E" fontSize="10" tick={{ fill: '#7E7E7E' }} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', borderRadius: '2px', color: '#F5F5F5', fontSize: '11px', padding: '6px 10px' }}
                                itemStyle={{ color: '#F5F5F5', fontSize: '10px' }}
                              />
                              <Line type="monotone" dataKey="value" stroke="#BDBDBD" strokeWidth={1.5} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        <p style={{ fontSize: '12px', color: '#7E7E7E', textAlign: 'center', letterSpacing: '0.01em' }}>
                          Selecciona una empresa para ver el detalle
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}