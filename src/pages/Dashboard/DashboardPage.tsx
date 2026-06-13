import MainLayout from "../../core/layout/MainLayout";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../core/api/api";
import { useNavigate } from "react-router-dom";
import DashboardInfoModal from "./DashboardInfoModal";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { useCompanyStore } from "../../core/store/useCompanyStore";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { activeBranch, activeCompany } = useCompanyStore();

  const [kpis, setKpis] = useState<any>(null);
  const [companyKpis, setCompanyKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "quarter" | "year">("month");
  const [pendingShifts, setPendingShifts] = useState<any[]>([]);

  const loadPendingShifts = useCallback(async () => {
    try {
      const response = await api.get("/pos/shifts", { params: { status: 'PENDIENTE_APROBACION' } });
      setPendingShifts(Array.isArray(response.data) ? response.data : []);
    } catch {
      setPendingShifts([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (activeBranch) {
        // Nivel sucursal: cargar KPIs con branchId
        const res = await api.get('/dashboard/kpis', {
          params: { period },
          headers: { 'X-Branch-Id': activeBranch.id }
        });
        setKpis(res.data);
        setCompanyKpis(null);
      } else if (activeCompany) {
        // Nivel empresa: cargar KPIs de esa empresa
        const res = await api.get(
          `/dashboard/company/${activeCompany.id}/kpis`,
          { params: { period } }
        );
        setCompanyKpis(res.data);
        setKpis(null);
      } else {
        // Vista global: cargar KPIs de todo el tenant
        const res = await api.get('/dashboard/kpis', {
          params: { period }
        });
        setKpis(res.data);
        setCompanyKpis(null);
      }
    } catch (e) {
      setError("No fue posible cargar dashboard");
    } finally {
      setLoading(false);
    }
  }, [period, activeBranch, activeCompany]);

  useEffect(() => {
    loadData();
    loadPendingShifts();
  }, [loadData, loadPendingShifts]);

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
      Ingresos: Number(kpis?.income || 0),
      Egresos: Number(kpis?.expense || 0),
      Saldo: Number(kpis?.totalBalance || 0),
    }];
  }, [kpis?.companiesBreakdown, kpis?.income, kpis?.expense, kpis?.totalBalance]);

  const trendLineChartData = useMemo(() => {
    const data = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      data.push({
        date: date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
        value: 0,
      });
    }
    return data;
  }, []);

  const safePercent = (num: number, den: number) => {
    return den > 0 ? ((num / den) * 100).toFixed(1) : '0';
  };

  // Total de ventas del grupo para cálculo de Participación %
  const totalVentasGrupo = kpis?.companiesBreakdown
    ?.reduce((sum: number, c: any) => sum + (c.income || 0), 0) || 0;

  // Lógica limpia de display
  const displayTotals = useMemo(() => {
    // Con empresa o sucursal: sumar branchesBreakdown
    if (companyKpis?.branchesBreakdown?.length) {
      return companyKpis.branchesBreakdown.reduce(
        (acc: any, b: any) => ({
          income: acc.income + (Number(b.income) || 0),
          expense: acc.expense + (Number(b.expense) || 0),
          balance: acc.balance + (Number(b.balance) || 0),
        }), { income: 0, expense: 0, balance: 0 }
      );
    }
    // Vista global: sumar companiesBreakdown
    if (kpis?.companiesBreakdown?.length) {
      return kpis.companiesBreakdown.reduce(
        (acc: any, c: any) => ({
          income: acc.income + (Number(c.income) || 0),
          expense: acc.expense + (Number(c.expense) || 0),
          balance: acc.balance + (Number(c.balance) || 0),
        }), { income: 0, expense: 0, balance: 0 }
      );
    }
    // Sucursal o empresa sin breakdown: usar campos directos
    if (kpis?.income !== undefined || kpis?.expense !== undefined) {
      return {
        income: Number(kpis.income || 0),
        expense: Number(kpis.expense || 0),
        balance: Number(kpis.totalBalance || 0),
      };
    }
    return { income: 0, expense: 0, balance: 0 };
  }, [companyKpis?.branchesBreakdown, kpis?.companiesBreakdown, kpis?.income, kpis?.expense, kpis?.totalBalance]);

  const ventasDisplay = displayTotals.income;
  const egresosDisplay = displayTotals.expense;
  const saldoDisplay = displayTotals.balance;
  const costo = Number(egresosDisplay) * 0.6;
  const gasto = Number(egresosDisplay) * 0.4;
  const uaiDisplay = ventasDisplay - egresosDisplay;
  const udiDisplay = uaiDisplay * 0.75;

  // Panel derecho usando displayTotals
  const panelVentas = displayTotals.income;
  const panelEgresos = displayTotals.expense;
  const panelUAI = panelVentas - panelEgresos;
  const panelUDI = panelUAI * 0.75;
  const panelMargen = panelVentas > 0
    ? Number(((panelUAI / panelVentas) * 100).toFixed(1))
    : 0;

  const formatCurrency = (value: number) => {
    return `$${Math.round(value).toLocaleString('es-MX')}`;
  };

  const formatPercent = (value: number) => {
    const pct = Math.round(value);
    const pctDisplay = pct >= 999 ? '+999%' : 
                       pct <= -999 ? '-999%' : 
                       `${pct >= 0 ? '+' : ''}${pct}%`;
    return pctDisplay;
  };

  const formatPercentDecimal = (value: number) => {
    return `${Math.round(value)}%`;
  };

  return (
    <MainLayout>
      <DashboardInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', backgroundColor: '#0A0A0A', overflowX: 'hidden' }}>
        {/* Header del módulo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', borderBottom: '1px solid #2D2D2D', backgroundColor: '#0A0A0A' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 400, color: '#F5F5F5', marginBottom: '2px', letterSpacing: '0.02em' }}>
              Dashboard Ejecutivo
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '12px', color: '#7E7E7E', letterSpacing: '0.01em' }}>
                {activeBranch ? activeBranch.name : activeCompany ? activeCompany.name : 'Vista Global'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { value: 'today', label: 'Hoy' },
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mes' },
              { value: 'quarter', label: 'Trimestre' },
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
          <div style={{ padding: '8px 24px', borderBottom: '1px solid #2D2D2D', backgroundColor: '#0A0A0A' }}>
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
                {/* ZONA 1 - Resumen Consolidado */}
                <div style={{ padding: '10px 24px', borderBottom: '1px solid #2D2D2D', display: 'flex', alignItems: 'center', backgroundColor: '#0A0A0A', overflowX: 'auto', minWidth: 0 }}>
                  {/* Ventas */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>
                      Ventas
                    </div>
                    <div style={{ fontSize: '22px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', marginBottom: '2px', letterSpacing: '-0.01em' }}>
                      {formatCurrency(ventasDisplay)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#3B7A57', letterSpacing: '0.01em' }}>
                      {formatPercent(kpis?.incomeVariation || 0)}
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '32px', backgroundColor: '#2D2D2D', margin: '0 16px' }} />

                  {/* Costo */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>
                      Costo
                    </div>
                    <div style={{ fontSize: '22px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', marginBottom: '2px', letterSpacing: '-0.01em' }}>
                      {formatCurrency(costo)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9B3A3A', letterSpacing: '0.01em' }}>
                      {formatPercent(kpis?.expenseVariation || 0)}
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '32px', backgroundColor: '#2D2D2D', margin: '0 16px' }} />

                  {/* Gasto */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>
                      Gasto
                    </div>
                    <div style={{ fontSize: '22px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', marginBottom: '2px', letterSpacing: '-0.01em' }}>
                      {formatCurrency(gasto)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>
                      {formatPercent(kpis?.expenseVariation || 0)}
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '32px', backgroundColor: '#2D2D2D', margin: '0 16px' }} />

                  {/* UAI */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>
                      UAI
                    </div>
                    <div style={{ fontSize: '22px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', marginBottom: '2px', letterSpacing: '-0.01em' }}>
                      {formatCurrency(uaiDisplay)}
                    </div>
                    <div style={{ fontSize: '11px', color: uaiDisplay >= 0 ? '#3B7A57' : '#9B3A3A', letterSpacing: '0.01em' }}>
                      {formatPercent(Number(safePercent(uaiDisplay, ventasDisplay)))}
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '32px', backgroundColor: '#2D2D2D', margin: '0 16px' }} />

                  {/* UDI */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>
                      UDI
                    </div>
                    <div style={{ fontSize: '22px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', marginBottom: '2px', letterSpacing: '-0.01em' }}>
                      {formatCurrency(udiDisplay)}
                    </div>
                    <div style={{ fontSize: '11px', color: udiDisplay >= 0 ? '#3B7A57' : '#9B3A3A', letterSpacing: '0.01em' }}>
                      {formatPercent(Number(safePercent(udiDisplay, ventasDisplay)))}
                    </div>
                  </div>
                </div>

                {/* ZONA 2+3 - Comparativo y Detalle */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', backgroundColor: '#0A0A0A' }}>
                  {/* ZONA 2 - Comparativo Empresas (65%) */}
                  <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', padding: '12px 16px', overflow: 'auto', minWidth: 0 }}>
                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ fontSize: '14px', fontWeight: 400, color: '#F5F5F5', marginBottom: '2px', letterSpacing: '0.01em' }}>
                          {activeBranch ? 'Sucursales' : activeCompany ? 'Sucursales' : 'Comparativo por Empresa'}
                        </h2>
                        <p style={{ fontSize: '12px', color: '#7E7E7A', letterSpacing: '0.01em' }}>
                          {period === 'today' ? 'Hoy' : period === 'week' ? 'Esta semana' : period === 'month' ? 'Este mes' : period === 'quarter' ? 'Este trimestre' : 'Este año'}
                        </p>
                      </div>
                    </div>

                {/* BarChart */}
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '4px', padding: '12px 20px', marginBottom: '8px', flex: '0 0 auto', minWidth: 0 }}>
                  {companyBarChartData.length > 0 ? (
                    <div style={{ height: '170px' }}>
                      <ResponsiveContainer width="100%" height={170}>
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
                    <div style={{ height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7E7E7E', fontSize: '12px' }}>
                      Sin datos para mostrar
                    </div>
                  )}
                </div>

                {/* Tabla */}
                <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '4px', flex: 1, overflow: 'auto' }}>
                  <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse' }}>
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
                        const compPart = ventasDisplay > 0 ? (compVentas / ventasDisplay) * 100 : 0;

                        return (
                          <tr
                            key={company.companyId}
                            style={{ borderBottom: '1px solid #2D2D2D' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1B1B1B'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
                </div>

                  {/* ZONA 3 - Detalle Empresa (35%) */}
                  <div style={{ flex: '0 0 35%', backgroundColor: '#161616', borderLeft: '1px solid #2D2D2D', padding: '12px 16px', overflowY: 'auto', minWidth: 0 }}>
                    {activeCompany ? (
                      <>
                        <h2 style={{ fontSize: '16px', fontWeight: 400, color: '#F5F5F5', marginBottom: '2px', letterSpacing: '0.01em' }}>
                          {activeCompany.name}
                        </h2>
                        <p style={{ fontSize: '11px', color: '#7E7E7E', marginBottom: '8px', letterSpacing: '0.01em' }}>
                          Restaurantes y Servicios
                        </p>

                        <div style={{ borderBottom: '1px solid #2D2D2D', marginBottom: '10px' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Ventas</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(panelVentas)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Costo</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(panelEgresos * 0.6)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Gasto</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(panelEgresos * 0.4)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>UAI</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(panelUAI)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>UDI</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(panelUDI)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Margen Neto</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatPercentDecimal(panelMargen)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Participación %</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatPercentDecimal(Number(safePercent(panelVentas, totalVentasGrupo)))}
                            </span>
                          </div>
                        </div>

                        <div style={{ height: '80px', marginBottom: '10px', minWidth: 0 }}>
                          <ResponsiveContainer width="100%" height={80}>
                            <LineChart data={trendLineChartData}>
                              <CartesianGrid strokeDasharray="4 4" stroke="#2D2D2D" vertical={false} />
                              <XAxis dataKey="date" stroke="#7E7E7E" fontSize="10" tick={{ fill: '#7E7E7E' }} />
                              <YAxis stroke="#7E7E7E" fontSize="10" tick={{ fill: '#7E7E7E' }} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', borderRadius: '2px', color: '#F5F5F5', fontSize: '11px', padding: '6px 10px' }}
                                itemStyle={{ color: '#F5F5F5', fontSize: '10px' }}
                                formatter={(value) => [`$${Number(value).toLocaleString('es-MX')}`, 'Ventas']}
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
                        <p style={{ fontSize: '11px', color: '#7E7E7E', marginBottom: '8px', letterSpacing: '0.01em' }}>
                          Vista consolidada de todas las empresas
                        </p>

                        <div style={{ borderBottom: '1px solid #2D2D2D', marginBottom: '10px' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>Ventas Totales</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(ventasDisplay)}
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
                              {formatCurrency(uaiDisplay)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#7E7E7E', letterSpacing: '0.01em' }}>UDI Consolidada</span>
                            <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(udiDisplay)}
                            </span>
                          </div>
                        </div>

                        <div style={{ height: '80px', marginBottom: '10px', minWidth: 0 }}>
                          <ResponsiveContainer width="100%" height={80}>
                            <LineChart data={trendLineChartData}>
                              <CartesianGrid strokeDasharray="4 4" stroke="#2D2D2D" vertical={false} />
                              <XAxis dataKey="date" stroke="#7E7E7E" fontSize="10" tick={{ fill: '#7E7E7E' }} />
                              <YAxis stroke="#7E7E7E" fontSize="10" tick={{ fill: '#7E7E7E' }} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', borderRadius: '2px', color: '#F5F5F5', fontSize: '11px', padding: '6px 10px' }}
                                itemStyle={{ color: '#F5F5F5', fontSize: '10px' }}
                                formatter={(value) => [`$${Number(value).toLocaleString('es-MX')}`, 'Ventas']}
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
      </div>
    </MainLayout>
  );
}