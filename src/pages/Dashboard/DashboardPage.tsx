import MainLayout from "../../core/layout/MainLayout";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../core/api/api";
import { useNavigate } from "react-router-dom";
import DashboardInfoModal from "./DashboardInfoModal";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { useCompanyStore } from "../../core/store/useCompanyStore";
import { useDashboardFilterStore, type DashboardPeriod } from "../../core/store/useDashboardFilterStore";
import { useSkinActiva } from "../../core/theme/useSkinActiva";
import DashboardIsotipo from "./DashboardIsotipo";
import { useAlturaRestante } from "../../core/hooks/useAlturaRestante";
import { participacion, textoPorcentaje, SIN_DATOS, SIN_COMPARAR, variacionComparable, margenSobreVentas, nombreRespaldoGrafica } from "./dashboardLogic";


export default function DashboardPage() {
  const navigate = useNavigate();
  const { activeBranch, activeCompany } = useCompanyStore();
  const { period, setPeriod } = useDashboardFilterStore();

  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [pendingShifts, setPendingShifts] = useState<any[]>([]);
  const skin = useSkinActiva();
  const [refPagina, alturaPagina] = useAlturaRestante<HTMLDivElement>();

  // Guard contra respuestas fuera de orden: cada llamada a loadData() se identifica con
  // un id incremental. Si para cuando su GET /dashboard/kpis resuelve ya se disparó una
  // llamada más nueva (cambió period/activeBranch/activeCompany mientras la vieja seguía
  // en vuelo), esa respuesta vieja se ignora en vez de pisar con setKpis() el resultado
  // ya correcto de la más reciente. Sin esto: seleccionar una sucursal y pasar rápido a
  // Vista Global podía dejar dos requests en vuelo (uno scopeado a la sucursal, uno
  // global) — si el de la sucursal volvía después (el global hace más queries, una por
  // empresa del tenant, y puede tardar más), su resultado viejo terminaba pisando al
  // global recién llegado.
  const requestIdRef = useRef(0);

  const loadPendingShifts = useCallback(async () => {
    try {
      const response = await api.get("/pos/shifts", { params: { status: 'PENDIENTE_APROBACION' } });
      setPendingShifts(Array.isArray(response.data) ? response.data : []);
    } catch {
      setPendingShifts([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError("");
      // El interceptor de api.ts inyecta X-Company-Id y X-Branch-Id desde
      // localStorage automáticamente — getKpis() filtra por empresa/sucursal activa
      const res = await api.get('/dashboard/kpis', { params: { period } });
      if (requestId !== requestIdRef.current) return; // ya hay una llamada más nueva en vuelo
      setKpis(res.data);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError("No fue posible cargar dashboard");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [period, activeBranch, activeCompany]);

  useEffect(() => {
    loadData();
    loadPendingShifts();
  }, [loadData, loadPendingShifts]);

  const companyBarChartData = useMemo(() => {
    // Vista empresa: barras por sucursal
    if (activeCompany && kpis?.branchesBreakdown?.length > 0) {
      return kpis.branchesBreakdown.map((branch: any) => ({
        name: branch.branchName,
        Ingresos: Number(branch.income),
        Egresos: Number(branch.expense),
        Saldo: Number(branch.balance),
      }));
    }
    // Vista global: barras por empresa
    if (kpis?.companiesBreakdown?.length > 0) {
      return kpis.companiesBreakdown.map((company: any) => ({
        name: company.companyName,
        Ingresos: Number(company.income),
        Egresos: Number(company.expense),
        Saldo: Number(company.income) - Number(company.expense),
      }));
    }
    // Fallback consolidado
    return [{
      name: nombreRespaldoGrafica(activeBranch?.name, activeCompany?.name),
      Ingresos: Number(kpis?.income || 0),
      Egresos: Number(kpis?.expense || 0),
      Saldo: Number(kpis?.totalBalance || 0),
    }];
  }, [activeCompany, activeBranch, kpis?.branchesBreakdown, kpis?.companiesBreakdown, kpis?.income, kpis?.expense, kpis?.totalBalance]);

  // La participación solo es real en Vista Global (sin empresa ni sucursal elegida): ver dashboardLogic.participacion.
  const vistaGlobal = !activeCompany && !activeBranch;

  // Lógica limpia de display
  const displayTotals = useMemo(() => {
    // Vista empresa: sumar branchesBreakdown
    if (activeCompany && kpis?.branchesBreakdown?.length) {
      return kpis.branchesBreakdown.reduce(
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
    // Vista sucursal: usar campos directos de kpis
    if (kpis?.income !== undefined || kpis?.expense !== undefined) {
      return {
        income: Number(kpis.income || 0),
        expense: Number(kpis.expense || 0),
        balance: Number(kpis.totalBalance || 0),
      };
    }
    return { income: 0, expense: 0, balance: 0 };
  }, [activeCompany, kpis?.branchesBreakdown, kpis?.companiesBreakdown, kpis?.income, kpis?.expense, kpis?.totalBalance]);

  const ventasDisplay = displayTotals.income;
  const egresosDisplay = displayTotals.expense;
  const saldoDisplay = displayTotals.balance;
  // El sistema solo registra ingresos y egresos: no separa costo de gasto ni calcula impuestos.
  // Costo, Gasto y UDI se muestran como «Sin datos» hasta que exista una fuente real (antes eran 60 % / 40 % / 75 % supuestos).
  const uaiDisplay = ventasDisplay - egresosDisplay;

  // Panel derecho usando displayTotals
  const panelVentas = displayTotals.income;
  const panelEgresos = displayTotals.expense;
  const panelUAI = panelVentas - panelEgresos;
  const panelMargen = margenSobreVentas(panelUAI, panelVentas);
  const margenUai = margenSobreVentas(uaiDisplay, ventasDisplay);
  const varVentas = variacionComparable(kpis?.incomeVariation, ventasDisplay, kpis?.previousIncome);
  const varEgresos = variacionComparable(kpis?.expenseVariation, egresosDisplay, kpis?.previousExpense);
  const sinComparar = <span title="El periodo anterior no tuvo movimientos: no hay con qué comparar." style={{ color: 'rgb(var(--text-2))', fontStyle: 'italic' }}>{SIN_COMPARAR}</span>;

  const sinDatosTitulo = 'El sistema aún no tiene esta cifra: solo registra ingresos y egresos, sin separar costo de gasto ni impuestos.';
  const sinDatos = (
    <span title={sinDatosTitulo} style={{ color: 'rgb(var(--text-2))', fontSize: '13px', fontStyle: 'italic' }}>{SIN_DATOS}</span>
  );

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

  // Skin ESTIA Isotipo: misma información, otra composición (sin tarjetas). Las demás skins siguen con el tablero de siempre.
  if (skin === 'isotipo') {
    const atencion = [
      ...(pendingShifts.length > 0 ? [{ id: 'cortes', texto: `${pendingShifts.length} cortes pendientes de revisión`, ir: '/pos' }] : []),
      ...(kpis?.cxpVencidas > 0 ? [{ id: 'cxp', texto: `${kpis.cxpVencidas} facturas vencidas`, ir: '/treasury' }] : []),
      ...(kpis?.saldoDisponible && kpis.saldoDisponible < 10000 ? [{ id: 'saldo', texto: 'Saldo bajo en cuentas', ir: '/banks' }] : []),
    ];
    return (
      <MainLayout>
        <DashboardIsotipo
          cargando={loading}
          error={error}
          ambito={activeBranch ? activeBranch.name : activeCompany ? activeCompany.name : 'Vista Global'}
          periodo={period}
          periodos={[{ value: 'today', label: 'Hoy' }, { value: 'week', label: 'Semana' }, { value: 'month', label: 'Mes' }, { value: 'quarter', label: 'Trimestre' }, { value: 'year', label: 'Año' }]}
          onPeriodo={(v) => setPeriod(v as DashboardPeriod)}
          ventas={ventasDisplay}
          egresos={egresosDisplay}
          saldo={Number(kpis?.saldoDisponible ?? saldoDisplay)}
          variacionVentas={variacionComparable(kpis?.incomeVariation, ventasDisplay, kpis?.previousIncome)}
          filas={companyBarChartData.map((d: { name?: string; Ingresos: number; Egresos: number }) => ({ nombre: String(d.name ?? ''), ingresos: d.Ingresos, egresos: d.Egresos }))}
          atencion={atencion}
          onIr={(ruta) => navigate(ruta)}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <DashboardInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      <div ref={refPagina} style={{ display: 'flex', flexDirection: 'column', height: alturaPagina ?? 'calc(100vh - 92px)', backgroundColor: 'rgb(var(--bg))', overflowX: 'hidden' }}>
        {/* Header del módulo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', borderBottom: '1px solid rgb(var(--border))', backgroundColor: 'rgb(var(--bg))' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 400, color: 'rgb(var(--text-1))', marginBottom: '2px', letterSpacing: '0.02em' }}>
              Dashboard Ejecutivo
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '12px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>
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
                  color: period === p.value ? 'rgb(var(--text-1))' : 'rgb(var(--text-3))',
                  backgroundColor: period === p.value ? 'rgb(var(--field))' : 'transparent',
                  border: period === p.value ? '1px solid rgb(var(--border))' : '1px solid rgb(var(--border))',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => { if (period !== p.value) e.currentTarget.style.backgroundColor = 'rgb(var(--surface-1))'; e.currentTarget.style.borderColor = 'rgb(var(--surface-4))'; }}
                onMouseLeave={(e) => { if (period !== p.value) e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'rgb(var(--border))'; }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Executive Alert Band */}
        {(!loading && kpis) && (
          <div style={{ padding: '8px 24px', borderBottom: '1px solid rgb(var(--border))', backgroundColor: 'rgb(var(--bg))' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {pendingShifts.length > 0 && (
                <div
                  onClick={() => navigate('/pos')}
                  style={{
                    padding: '8px 14px',
                    border: '1px solid rgb(var(--warn-solid) / 0.267)',
                    background: 'rgb(var(--warn-solid) / 0.067)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'rgb(var(--warn))',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--warn-solid) / 0.533)'; e.currentTarget.style.background = 'rgb(var(--warn-solid) / 0.133)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--warn-solid) / 0.267)'; e.currentTarget.style.background = 'rgb(var(--warn-solid) / 0.067)'; }}
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
                    border: '1px solid rgb(var(--warn-solid) / 0.267)',
                    background: 'rgb(var(--warn-solid) / 0.067)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'rgb(var(--warn))',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--warn-solid) / 0.533)'; e.currentTarget.style.background = 'rgb(var(--warn-solid) / 0.133)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--warn-solid) / 0.267)'; e.currentTarget.style.background = 'rgb(var(--warn-solid) / 0.067)'; }}
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
                    border: '1px solid rgb(var(--warn-solid) / 0.267)',
                    background: 'rgb(var(--warn-solid) / 0.067)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'rgb(var(--warn))',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--warn-solid) / 0.533)'; e.currentTarget.style.background = 'rgb(var(--warn-solid) / 0.133)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--warn-solid) / 0.267)'; e.currentTarget.style.background = 'rgb(var(--warn-solid) / 0.067)'; }}
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
            <div style={{ backgroundColor: 'rgb(var(--surface-3))', border: '1px solid rgb(var(--danger-solid))', borderRadius: '8px', padding: '16px', color: 'rgb(var(--text-1))' }}>
              {error}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '24px' }}>
            <div style={{ backgroundColor: 'rgb(var(--surface-1))', border: '1px solid rgb(var(--border))', borderRadius: '8px', padding: '24px', color: 'rgb(var(--text-3))' }}>
              Cargando dashboard...
            </div>
          </div>
        ) : (
          <>
                {/* ZONA 1 - Resumen Consolidado */}
                <div style={{ padding: '10px 24px', borderBottom: '1px solid rgb(var(--border))', display: 'flex', alignItems: 'center', backgroundColor: 'rgb(var(--bg))', overflowX: 'auto', minWidth: 0 }}>
                  {/* Ventas */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>
                      Ventas
                    </div>
                    <div style={{ fontSize: '22px', color: 'rgb(var(--text-1))', fontWeight: 400, fontVariantNumeric: 'tabular-nums', marginBottom: '2px', letterSpacing: '-0.01em' }}>
                      {formatCurrency(ventasDisplay)}
                    </div>
                    <div style={{ fontSize: '11px', color: varVentas === null ? 'rgb(var(--text-3))' : 'rgb(var(--ok))', letterSpacing: '0.01em' }}>
                      {varVentas === null ? sinComparar : formatPercent(varVentas)}
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '32px', backgroundColor: 'rgb(var(--surface-3))', margin: '0 16px' }} />

                  {/* Egresos (total real de movimientos EXPENSE) */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>
                      Egresos
                    </div>
                    <div style={{ fontSize: '22px', color: 'rgb(var(--text-1))', fontWeight: 400, fontVariantNumeric: 'tabular-nums', marginBottom: '2px', letterSpacing: '-0.01em' }}>
                      {formatCurrency(egresosDisplay)}
                    </div>
                    <div style={{ fontSize: '11px', color: varEgresos === null ? 'rgb(var(--text-3))' : 'rgb(var(--danger))', letterSpacing: '0.01em' }}>
                      {varEgresos === null ? sinComparar : formatPercent(varEgresos)}
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '32px', backgroundColor: 'rgb(var(--surface-3))', margin: '0 16px' }} />

                  {/* Costo: sin fuente real */}
                  <div style={{ flex: 1 }} data-testid="kpi-costo">
                    <div style={{ fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>
                      Costo
                    </div>
                    <div style={{ minHeight: '26px', display: 'flex', alignItems: 'center', marginBottom: '2px' }}>{sinDatos}</div>
                  </div>

                  <div style={{ width: '1px', height: '32px', backgroundColor: 'rgb(var(--surface-3))', margin: '0 16px' }} />

                  {/* Gasto: sin fuente real */}
                  <div style={{ flex: 1 }} data-testid="kpi-gasto">
                    <div style={{ fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>
                      Gasto
                    </div>
                    <div style={{ minHeight: '26px', display: 'flex', alignItems: 'center', marginBottom: '2px' }}>{sinDatos}</div>
                  </div>

                  <div style={{ width: '1px', height: '32px', backgroundColor: 'rgb(var(--surface-3))', margin: '0 16px' }} />

                  {/* UAI */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>
                      UAI
                    </div>
                    <div style={{ fontSize: '22px', color: 'rgb(var(--text-1))', fontWeight: 400, fontVariantNumeric: 'tabular-nums', marginBottom: '2px', letterSpacing: '-0.01em' }}>
                      {formatCurrency(uaiDisplay)}
                    </div>
                    <div style={{ fontSize: '11px', color: margenUai === null ? 'rgb(var(--text-3))' : uaiDisplay >= 0 ? 'rgb(var(--ok))' : 'rgb(var(--danger))', letterSpacing: '0.01em' }}>
                      {margenUai === null ? SIN_DATOS : formatPercent(margenUai)}
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '32px', backgroundColor: 'rgb(var(--surface-3))', margin: '0 16px' }} />

                  {/* UDI */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>
                      UDI
                    </div>
                    <div style={{ minHeight: '26px', display: 'flex', alignItems: 'center', marginBottom: '2px' }} data-testid="kpi-udi">{sinDatos}</div>
                  </div>
                </div>

                {/* ZONA 2+3 - Comparativo y Detalle */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', backgroundColor: 'rgb(var(--bg))' }}>
                  {/* ZONA 2 - Comparativo Empresas (65%) */}
                  <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', padding: '12px 16px', overflow: 'auto', minWidth: 0 }}>
                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ fontSize: '14px', fontWeight: 400, color: 'rgb(var(--text-1))', marginBottom: '2px', letterSpacing: '0.01em' }}>
                          {activeBranch ? 'Sucursales' : activeCompany ? 'Sucursales' : 'Comparativo por Empresa'}
                        </h2>
                        <p style={{ fontSize: '12px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>
                          {period === 'today' ? 'Hoy' : period === 'week' ? 'Esta semana' : period === 'month' ? 'Este mes' : period === 'quarter' ? 'Este trimestre' : 'Este año'}
                        </p>
                      </div>
                    </div>

                {/* BarChart */}
                <div style={{ backgroundColor: 'rgb(var(--surface-1))', border: '1px solid rgb(var(--border))', borderRadius: '4px', padding: '12px 20px', marginBottom: '8px', flex: '0 0 auto', minWidth: 0 }}>
                  {companyBarChartData.length > 0 ? (
                    <div style={{ height: '170px' }}>
                      <ResponsiveContainer width="100%" height={170}>
                        <BarChart data={companyBarChartData}>
                        <CartesianGrid strokeDasharray="4 4" stroke="rgb(var(--border))" vertical={false} />
                        <XAxis dataKey="name" stroke="rgb(var(--text-3))" fontSize="11" tick={{ fill: 'rgb(var(--text-3))' }} />
                        <YAxis stroke="rgb(var(--text-3))" fontSize="11" tick={{ fill: 'rgb(var(--text-3))' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'rgb(var(--field))', border: '1px solid rgb(var(--border))', borderRadius: '2px', color: 'rgb(var(--text-1))', fontSize: '12px', padding: '8px 12px' }}
                          itemStyle={{ color: 'rgb(var(--text-1))', fontSize: '11px' }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }}
                          iconType="rect"
                          formatter={(value: string) => <span style={{ color: 'rgb(var(--text-2))', fontSize: '11px' }}>{value}</span>}
                        />
                        <Bar dataKey="Ingresos" fill="rgb(var(--text-2))" name="Ingresos" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Egresos" fill="rgb(var(--viz-5))" name="Egresos" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Saldo" fill="rgb(var(--viz-6))" name="Saldo" radius={[0, 0, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <div style={{ height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(var(--text-3))', fontSize: '12px' }}>
                      Sin datos para mostrar
                    </div>
                  )}
                </div>

                {/* Tabla */}
                <div style={{ backgroundColor: 'rgb(var(--surface-1))', border: '1px solid rgb(var(--border))', borderRadius: '4px', flex: 1, overflow: 'auto' }}>
                  <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr style={{ backgroundColor: 'rgb(var(--field))' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Empresa
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Ventas
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Costo
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Gasto
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          UAI
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          UDI
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Margen
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Part.%
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '10px', color: 'rgb(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(kpis?.companiesBreakdown || []).map((company: any) => {
                        const compVentas = Number(company.income);
                        const compUai = compVentas - Number(company.expense);
                        const compMargen = margenSobreVentas(compUai, compVentas);
                        const compPart = participacion(compVentas, kpis?.companiesBreakdown, vistaGlobal);

                        return (
                          <tr
                            key={company.companyId}
                            style={{ borderBottom: '1px solid rgb(var(--border))' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--field))'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td style={{ padding: '10px 12px', color: 'rgb(var(--text-1))', fontSize: '12px', letterSpacing: '0.01em' }}>
                              {company.companyName}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgb(var(--text-1))', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(compVentas)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgb(var(--text-1))', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {sinDatos}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgb(var(--text-1))', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {sinDatos}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: compUai >= 0 ? 'rgb(var(--ok))' : 'rgb(var(--danger))', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(compUai)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgb(var(--text-1))', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {sinDatos}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgb(var(--text-1))', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {compMargen === null ? <span style={{ color: 'rgb(var(--text-2))', fontStyle: 'italic' }}>{SIN_DATOS}</span> : formatPercentDecimal(compMargen)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgb(var(--text-1))', fontSize: '12px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {compPart === null ? <span title="La participación se calcula solo en Vista Global, con todas las empresas del grupo." style={{ color: 'rgb(var(--text-2))', fontSize: '12px', fontStyle: 'italic' }}>{SIN_DATOS}</span> : textoPorcentaje(compPart)}
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
                  <div style={{ flex: '0 0 35%', backgroundColor: 'rgb(var(--surface-1))', borderLeft: '1px solid rgb(var(--border))', padding: '12px 16px', overflowY: 'auto', minWidth: 0 }}>
                    {activeCompany ? (
                      <>
                        <h2 style={{ fontSize: '16px', fontWeight: 400, color: 'rgb(var(--text-1))', marginBottom: '2px', letterSpacing: '0.01em' }}>
                          {activeCompany.name}
                        </h2>
                        <p style={{ fontSize: '11px', color: 'rgb(var(--text-3))', marginBottom: '8px', letterSpacing: '0.01em' }}>
                          Detalle de la empresa
                        </p>

                        <div style={{ borderBottom: '1px solid rgb(var(--border))', marginBottom: '10px' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>Ventas</span>
                            <span style={{ fontSize: '13px', color: 'rgb(var(--text-1))', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(panelVentas)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>Egresos</span>
                            <span style={{ fontSize: '13px', color: 'rgb(var(--text-1))', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(panelEgresos)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>Costo</span>
                            {sinDatos}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>Gasto</span>
                            {sinDatos}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>UAI</span>
                            <span style={{ fontSize: '13px', color: 'rgb(var(--text-1))', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(panelUAI)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>UDI</span>
                            {sinDatos}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>Margen (UAI / ventas)</span>
                            <span style={{ fontSize: '13px', color: 'rgb(var(--text-1))', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {panelMargen === null ? SIN_DATOS : formatPercentDecimal(panelMargen)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>Participación %</span>
                            <span style={{ fontSize: '13px', color: 'rgb(var(--text-1))', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {textoPorcentaje(participacion(panelVentas, kpis?.companiesBreakdown, vistaGlobal))}
                            </span>
                          </div>
                        </div>

                        <div style={{ height: '80px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgb(var(--border))', borderRadius: '4px' }} data-testid="tendencia-sin-datos">
                          <span style={{ fontSize: '12px', color: 'rgb(var(--text-2))' }}>Tendencia diaria: sin datos</span>
                        </div>

                        <button
                          style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '12px',
                            color: 'rgb(var(--text-2))',
                            backgroundColor: 'transparent',
                            border: '1px solid rgb(var(--border))',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            letterSpacing: '0.01em',
                          }}
                          onClick={() => navigate('/reports')}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--surface-4))'; e.currentTarget.style.color = 'rgb(var(--text-1))'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--border))'; e.currentTarget.style.color = 'rgb(var(--text-2))'; }}
                        >
                          Ver detalle completo →
                        </button>
                      </>
                    ) : (
                      <>
                        <h2 style={{ fontSize: '16px', fontWeight: 400, color: 'rgb(var(--text-1))', marginBottom: '2px', letterSpacing: '0.01em' }}>
                          Resumen del Grupo
                        </h2>
                        <p style={{ fontSize: '11px', color: 'rgb(var(--text-3))', marginBottom: '8px', letterSpacing: '0.01em' }}>
                          Vista consolidada de todas las empresas
                        </p>

                        <div style={{ borderBottom: '1px solid rgb(var(--border))', marginBottom: '10px' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>Ventas Totales</span>
                            <span style={{ fontSize: '13px', color: 'rgb(var(--text-1))', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(ventasDisplay)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>Egresos Totales</span>
                            <span style={{ fontSize: '13px', color: 'rgb(var(--text-1))', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(egresosDisplay)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>Costo Total</span>
                            {sinDatos}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>Gasto Total</span>
                            {sinDatos}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>UAI Consolidada</span>
                            <span style={{ fontSize: '13px', color: 'rgb(var(--text-1))', fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
                              {formatCurrency(uaiDisplay)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgb(var(--text-3))', letterSpacing: '0.01em' }}>UDI Consolidada</span>
                            {sinDatos}
                          </div>
                        </div>

                        <div style={{ height: '80px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgb(var(--border))', borderRadius: '4px' }} data-testid="tendencia-sin-datos">
                          <span style={{ fontSize: '12px', color: 'rgb(var(--text-2))' }}>Tendencia diaria: sin datos</span>
                        </div>

                        <p style={{ fontSize: '12px', color: 'rgb(var(--text-3))', textAlign: 'center', letterSpacing: '0.01em' }}>
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