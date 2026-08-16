import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useCompanyStore } from "../store/useCompanyStore";
import { useModulo } from "../hooks/useModulo";
import { api } from "../api/api";

interface Company { id: string; legalName: string; tradeName: string; }
interface Branch  { id: string; name: string; }

const IC: Record<string, React.ReactNode> = {
  dashboard: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  rh:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  tesoreria: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  pos:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>,
  compras:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  reportes:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  integraciones: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.22 4.22l2.12 2.12m11.32 11.32 2.12 2.12M2 12h3m14 0h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>,
  auditoria: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  soporte:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  pacientes: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  centro_soluciones: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  corte_retroactivo: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  costos: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
};

type ModKey = "dashboard" | "rh" | "tesoreria" | "pos" | "compras" | "reportes" | "integraciones" | "auditoria" | "soporte" | "pacientes" | "centro_soluciones" | "corte_retroactivo" | "costos";

const NAV: { label: string; key: ModKey; path: string; modulo: string }[] = [
  { label: "Dashboard",     key: "dashboard",     path: "/dashboard",    modulo: "dashboard" },
  { label: "RH",            key: "rh",            path: "/hr",           modulo: "rh" },
  { label: "Tesorería",     key: "tesoreria",     path: "/treasury",     modulo: "tesoreria" },
  { label: "POS",           key: "pos",           path: "/pos",          modulo: "pos" },
  { label: "Captura Retroactiva", key: "corte_retroactivo", path: "/pos/backfill", modulo: "corte_retroactivo" },
  { label: "Compras",       key: "compras",       path: "/purchases",    modulo: "compras" },
  { label: "Costos",        key: "costos",        path: "/costs",        modulo: "costos" },
  { label: "Reportes",      key: "reportes",      path: "/reports",      modulo: "reportes" },
  { label: "Integraciones", key: "integraciones", path: "/integrations", modulo: "integraciones" },
  { label: "Pacientes",     key: "pacientes",          path: "/patients",          modulo: "pacientes" },
  { label: "Soluciones",    key: "centro_soluciones",  path: "/solutions",         modulo: "centro_soluciones" },
  { label: "Auditoría",     key: "auditoria",          path: "/settings",          modulo: "configuracion" },
  { label: "Soporte",       key: "soporte",            path: "/soporte/clientes",  modulo: "soporte" },
];

const SUBNAV: Record<ModKey, { label: string; path: string }[]> = {
  dashboard: [],
  rh: [
    { label: "Empleados",   path: "/hr?tab=empleados" },
    { label: "Asistencias", path: "/hr?tab=asistencia" },
    { label: "Vacaciones",  path: "/hr?tab=solicitudes" },
    { label: "Nómina",      path: "/hr?tab=nomina" },
    { label: "Contratos",   path: "/hr?tab=expedientes" },
    { label: "Turnos",      path: "/hr?tab=turnos" },
  ],
  tesoreria: [
    { label: "Bancos",         path: "/banks" },
    { label: "Movimientos",    path: "/movements" },
    { label: "Transferencias", path: "/transfers" },
    { label: "Vista General",  path: "/treasury" },
    { label: "Conciliación",   path: "/reconciliation" },
  ],
  pos:       [{ label: "POS", path: "/pos" }],
  compras: [
    { label: "Proveedores",    path: "/suppliers" },
    { label: "Compras",        path: "/purchases" },
    { label: "OCR Documentos", path: "/ocr" },
  ],
  reportes:      [{ label: "Reportes",      path: "/reports" }],
  integraciones: [{ label: "Integraciones", path: "/integrations" }],
  auditoria: [
    { label: "Usuarios",       path: "/users" },
    { label: "Configuración",  path: "/settings" },
    { label: "Config. Login",  path: "/settings/login-config" },
    { label: "Apariencia",     path: "/settings/appearance" },
    { label: "Campos del Corte", path: "/settings/corte-fields" },
  ],
  pacientes: [],
  centro_soluciones: [],
  corte_retroactivo: [],
  costos: [],
  soporte: [
    { label: "Panel",          path: "/soporte/dashboard" },
    { label: "Clientes",       path: "/soporte/clientes" },
    { label: "Planes",         path: "/soporte/planes" },
    { label: "Monitoreo",      path: "/soporte/monitoreo" },
    { label: "Config. Global", path: "/soporte/config" },
  ],
};

const MODULE_PATHS: Record<ModKey, string[]> = {
  dashboard:     ["/dashboard", "/companies", "/branches"],
  rh:            ["/hr", "/employee"],
  tesoreria:     ["/banks", "/movements", "/transfers", "/treasury", "/reconciliation"],
  corte_retroactivo: ["/pos/backfill"],
  pos:           ["/pos"],
  compras:       ["/suppliers", "/purchases", "/ocr"],
  costos:        ["/costs"],
  reportes:      ["/reports"],
  integraciones: ["/integrations"],
  pacientes:        ["/patients"],
  centro_soluciones: ["/solutions"],
  auditoria:        ["/settings", "/settings/appearance", "/settings/corte-fields", "/users"],
  soporte:          ["/soporte"],
};

function getActiveKey(pathname: string): ModKey | null {
  if (pathname === '/') return null;
  for (const [key, paths] of Object.entries(MODULE_PATHS) as [ModKey, string[]][]) {
    if (paths.some(p => pathname === p || pathname.startsWith(p + '/'))) return key;
  }
  return null;
}

function isSubActive(item: { path: string }, loc: { pathname: string; search: string }): boolean {
  const qi = item.path.indexOf('?');
  if (qi === -1) {
    return loc.pathname === item.path || loc.pathname.startsWith(item.path + '/');
  }
  const iPath = item.path.slice(0, qi);
  const iSearch = item.path.slice(qi + 1);
  if (loc.pathname !== iPath) return false;
  const iTab = new URLSearchParams(iSearch).get('tab');
  const cTab = new URLSearchParams(loc.search).get('tab') || 'empleados';
  return iTab === cTab;
}

export default function TopBar() {
  const loc = useLocation();
  const { user, triggerLogout } = useAuthStore();
  const { companyId: userCompanyId } = useAuthStore();
  const { activeCompany, activeBranch, setActiveCompany, setActiveBranch } = useCompanyStore();

  const isAdmin = user?.roleCode === 'ADMIN' || user?.roleCode === 'SOPORTE';

  // Module access — hooks always in same order
  const modulosActivos = useAuthStore((state) => state.modulosActivos);
  const aD  = useModulo('dashboard');
  const aR  = useModulo('rh');
  const aT  = useModulo('tesoreria');
  const aP  = useModulo('pos');
  const aC  = useModulo('compras');
  const aRe = useModulo('reportes');
  const aI  = useModulo('integraciones');
  const aA  = useModulo('configuracion');
  const aPac = useModulo('pacientes');
  const aCR = useModulo('corte_retroactivo') && isAdmin;
  const aCos = useModulo('costos');
  const modAccess: Record<ModKey, boolean> = {
    dashboard: aD, rh: aR, tesoreria: aT, pos: aP,
    compras: aC, reportes: aRe, integraciones: aI, auditoria: aA,
    pacientes: aPac,
    centro_soluciones: true,
    corte_retroactivo: aCR,
    costos: aCos,
    soporte: user?.roleCode === 'SOPORTE',
  };

  // Context switcher state
  const [ctxOpen, setCtxOpen]               = useState(false);
  const [ctxPhase, setCtxPhase]             = useState<'company' | 'branch'>('company');
  const [companies, setCompanies]           = useState<Company[]>([]);
  const [branches, setBranches]             = useState<Branch[]>([]);
  const [pendingCo, setPendingCo]           = useState<{ id: string; name: string } | null>(null);
  // Cubre clearCtx (Vista Global) y pickBranch (elegir sucursal) — feedback visual
  // mientras se espera el round-trip de /auth/switch-company que ahora corre ANTES de
  // tocar el contexto local en ambos.
  const [ctxSwitching, setCtxSwitching]     = useState(false);
  const ctxRef = useRef<HTMLDivElement>(null);

  const isRestricted = !!userCompanyId && !isAdmin;

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxOpen(false);
        setCtxPhase('company');
      }
    }
    if (ctxOpen) document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, [ctxOpen]);

  async function openCtx() {
    const next = !ctxOpen;
    setCtxOpen(next);
    if (!next) return;
    // Load companies if not yet loaded
    if (companies.length === 0) {
      try {
        const r = await api.get('/companies');
        setCompanies(Array.isArray(r.data) ? r.data : []);
      } catch {}
    }
    // Start at branch phase if company already selected
    if (activeCompany) {
      setPendingCo(activeCompany);
      setCtxPhase('branch');
      try {
        const r = await api.get(`/branches?companyId=${activeCompany.id}`);
        setBranches(Array.isArray(r.data) ? r.data : []);
      } catch {}
    } else {
      setCtxPhase('company');
    }
  }

  async function pickCompany(co: Company) {
    const name = co.tradeName || co.legalName;
    setPendingCo({ id: co.id, name });
    setCtxPhase('branch');
    setBranches([]);
    try {
      const r = await api.get(`/branches?companyId=${co.id}`);
      setBranches(Array.isArray(r.data) ? r.data : []);
    } catch {}
  }

  async function pickBranch(br: Branch) {
    if (!pendingCo) return;
    const co = pendingCo; // snapshot — el dropdown queda abierto durante el await de
    // abajo, y "Volver" podría poner pendingCo en null mientras tanto.
    setCtxSwitching(true);

    // Await ANTES de tocar activeCompany/activeBranch — mismo motivo que clearCtx: si
    // el store se actualiza primero, DashboardPage dispara su GET /dashboard/kpis en el
    // mismo tick, con la cookie del JWT todavía apuntando al contexto anterior.
    try {
      // El backend ya puso las cookies httpOnly nuevas; el body solo trae el user
      // actualizado.
      const r = await api.post('/auth/switch-company', { companyId: co.id });
      const nu = r.data?.user;
      if (nu) {
        const mods = JSON.parse(localStorage.getItem('modulos_activos') || '[]');
        useAuthStore.getState().login({
          id: nu.id, email: nu.email, name: nu.name,
          roleCode: nu.roleCode, tenantId: nu.tenantId, companyId: co.id,
        }, mods);
      }
    } catch {}

    setActiveCompany(co);
    setActiveBranch({ id: br.id, name: br.name });
    setCtxOpen(false);
    setCtxPhase('company');
    setCtxSwitching(false);
  }

  async function viewFullCompany() {
    if (!pendingCo) return;
    const co = pendingCo; // snapshot — mismo motivo que pickBranch
    setCtxSwitching(true);

    // Await ANTES de tocar activeCompany/activeBranch — mismo motivo que pickBranch/
    // clearCtx: si el store se actualiza primero, DashboardPage dispara su
    // GET /dashboard/kpis en el mismo tick, con la cookie del JWT todavía apuntando al
    // contexto anterior.
    try {
      const r = await api.post('/auth/switch-company', { companyId: co.id });
      const nu = r.data?.user;
      if (nu) {
        const mods = JSON.parse(localStorage.getItem('modulos_activos') || '[]');
        useAuthStore.getState().login({
          id: nu.id, email: nu.email, name: nu.name,
          roleCode: nu.roleCode, tenantId: nu.tenantId, companyId: co.id,
        }, mods);
      }
    } catch {}

    setActiveCompany(co);
    setActiveBranch(null);
    setCtxOpen(false);
    setCtxPhase('company');
    setCtxSwitching(false);
  }

  async function clearCtx() {
    setCtxSwitching(true);

    // Await ANTES de tocar activeCompany/activeBranch — a propósito, en ese orden.
    // Si se limpia el store primero (como estaba antes), el useEffect de
    // DashboardPage reacciona al cambio de contexto y dispara su GET /dashboard/kpis
    // en el mismo tick, con la cookie del JWT todavía vieja — este POST recién empieza
    // su round-trip en ese momento, así que el GET siempre gana la carrera y sale sin
    // X-Company-Id pero con req.user.companyId todavía apuntando a la empresa
    // anterior (dashboard.controller.ts cae a ese fallback). Esperando el POST primero,
    // la cookie ya está actualizada cuando recién ahí se dispara el refetch.
    try {
      const r = await api.post('/auth/switch-company', { companyId: null });
      const nu = r.data?.user;
      if (nu) {
        const mods = JSON.parse(localStorage.getItem('modulos_activos') || '[]');
        useAuthStore.getState().login({
          id: nu.id, email: nu.email, name: nu.name,
          roleCode: nu.roleCode, tenantId: nu.tenantId, companyId: null,
        }, mods);
      }
    } catch {}

    setActiveCompany(null);
    setActiveBranch(null);
    ['active_company_id','active_company_name','active_branch_id','active_branch_name']
      .forEach(k => localStorage.removeItem(k));
    setCtxOpen(false);
    setCtxPhase('company');
    setCtxSwitching(false);
  }

  const ctxLabel = activeCompany
    ? activeBranch
      ? `${activeCompany.name} — ${activeBranch.name}`
      : activeCompany.name
    : "Vista Global";

  const activeKey  = getActiveKey(loc.pathname);
  const visibleNav = NAV.filter(m => modAccess[m.key]);
  const operationalModules: ModKey[] = ['rh', 'tesoreria', 'pos', 'compras', 'reportes', 'integraciones', 'corte_retroactivo', 'costos'];

  const dashboardSubItems = (modulosActivos?.includes('empresas') || modulosActivos?.includes('sucursales') || modulosActivos?.includes('usuarios'))
    ? [
        { label: 'Dashboard',  path: '/dashboard' },
        ...(modulosActivos?.includes('empresas')   ? [{ label: 'Empresas',   path: '/companies' }] : []),
        ...(modulosActivos?.includes('sucursales') ? [{ label: 'Sucursales', path: '/branches'  }] : []),
        ...(modulosActivos?.includes('usuarios')   ? [{ label: 'Usuarios',   path: '/users'     }] : []),
      ]
    : [];

  const subItems = activeKey === 'dashboard' && dashboardSubItems.length > 0
    ? dashboardSubItems
    : activeKey ? (SUBNAV[activeKey] || []) : [];

  const userInitials = (() => {
    const n = user?.name || user?.email || '';
    const p = n.split(/[\s@]/);
    return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
  })();

  // Shared hover handler helpers
  const hoverOn  = (el: HTMLElement, col: string) => { el.style.color = col; };
  const hoverOff = (el: HTMLElement, col: string) => { el.style.color = col; };

  return (
    <>
      {/* ── Main topbar ── */}
      <div style={{
        height: 52, background: '#141820',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', flexShrink: 0,
        position: 'relative', zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 1, marginRight: 28, flexShrink: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#c8cdd8', letterSpacing: '0.1em' }}>ESTIA</span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#7b9ccc', letterSpacing: '0.1em' }}>ERP</span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', flex: 1, height: '100%', overflowX: 'auto', gap: 6, padding: '0 4px' }}>
          {visibleNav.map(m => {
            const active = activeKey === m.key;
            const isDisabled = !activeCompany && operationalModules.includes(m.key);

            if (isDisabled) {
              return (
                <span key={m.key} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.03)',
                  background: 'rgba(255,255,255,0.02)',
                  color: 'rgba(255,255,255,0.18)',
                  fontSize: 13,
                  cursor: 'not-allowed',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
                  userSelect: 'none',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  <span style={{ opacity: 0.3, display: 'flex' }}>{IC[m.key]}</span>
                  {m.label}
                </span>
              );
            }

            return (
              <Link key={m.key} to={m.path} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px',
                borderRadius: 6,
                border: active ? '1px solid rgba(123,156,204,0.4)' : '1px solid rgba(255,255,255,0.08)',
                background: active ? 'rgba(123,156,204,0.15)' : 'rgba(255,255,255,0.04)',
                color: active ? '#8fafd4' : '#c8cdd8',
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: active
                  ? '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(123,156,204,0.15)'
                  : '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
              onMouseEnter={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(255,255,255,0.08)';
                  el.style.color = '#e8ecf0';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(255,255,255,0.04)';
                  el.style.color = '#c8cdd8';
                }
              }}
              >
                <span style={{ opacity: active ? 0.9 : 0.55, display: 'flex' }}>{IC[m.key]}</span>
                {m.label}
              </Link>
            );
          })}
        </nav>

        {/* Right section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 12 }}>

          {/* Context switcher */}
          <div ref={ctxRef} style={{ position: 'relative' }}>
            {isRestricted ? (
              <div style={{
                padding: '5px 10px', fontSize: 12, color: 'rgba(255,255,255,0.45)',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {ctxLabel}
              </div>
            ) : (
              <button onClick={openCtx} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
                color: '#c8cdd8', fontSize: 12, cursor: 'pointer',
                maxWidth: 220, overflow: 'hidden',
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ctxLabel}</span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d={ctxOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}/></svg>
              </button>
            )}

            {ctxOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 8, width: 230, zIndex: 1000,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                overflow: 'hidden',
              }}>
                {ctxPhase === 'company' ? (
                  <>
                    <div style={{ padding: '8px 12px 4px', fontSize: 9.5, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Empresa</div>
                    {isAdmin && (
                      <CtxItem
                        label={ctxSwitching ? 'Cambiando…' : 'Vista Global'}
                        icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
                        active={!activeCompany}
                        disabled={ctxSwitching}
                        onClick={clearCtx}
                      />
                    )}
                    {companies.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Cargando...</div>}
                    {companies.map(co => (
                      <CtxItem key={co.id} label={co.tradeName || co.legalName} active={activeCompany?.id === co.id}
                        disabled={ctxSwitching}
                        onClick={() => pickCompany(co)}
                        after={<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>}
                      />
                    ))}
                  </>
                ) : (
                  <>
                    <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <button
                        onClick={() => { setCtxPhase('company'); setPendingCo(null); }}
                        disabled={ctxSwitching}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                          color: 'rgba(255,255,255,0.35)', cursor: ctxSwitching ? 'default' : 'pointer', fontSize: 11, padding: 0,
                          opacity: ctxSwitching ? 0.5 : 1,
                        }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                        Volver
                      </button>
                      <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{pendingCo?.name}</span>
                    </div>
                    <CtxItem
                      label={ctxSwitching ? 'Cambiando…' : 'Ver toda la empresa'}
                      icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
                      active={activeCompany?.id === pendingCo?.id && !activeBranch}
                      disabled={ctxSwitching}
                      onClick={viewFullCompany}
                    />
                    <div style={{ padding: '6px 12px 4px', fontSize: 9.5, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sucursal</div>
                    {branches.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Cargando...</div>}
                    {branches.map(br => (
                      <CtxItem
                        key={br.id}
                        label={br.name}
                        active={activeBranch?.id === br.id}
                        disabled={ctxSwitching}
                        onClick={() => pickBranch(br)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#1e2d45', border: '1px solid rgba(123,156,204,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10.5, fontWeight: 600, color: '#8fafd4', flexShrink: 0,
            }}>
              {userInitials}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 11.5, color: '#c8cdd8', fontWeight: 500 }}>{user?.name?.split(' ')[0] || user?.email?.split('@')[0]}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{user?.roleCode}</div>
            </div>
            <button onClick={triggerLogout} style={{
              fontSize: 11, color: 'rgba(255,255,255,0.28)', background: 'transparent',
              border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c8cdd8'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.28)'; }}
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* ── Subnav ── */}
      {subItems.length > 0 && (
        <div style={{
          height: 40, background: '#111419',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'stretch',
          padding: '0 20px', flexShrink: 0,
          overflowX: 'auto', position: 'relative', zIndex: 99,
        }}>
          {subItems.map(item => {
            const active = isSubActive(item, loc);
            return (
              <Link key={item.path} to={item.path} style={{
                display: 'flex', alignItems: 'center',
                padding: '0 14px', height: '100%', textDecoration: 'none',
                fontSize: 12, fontWeight: active ? 500 : 400,
                color: active ? '#c8cdd8' : 'rgba(255,255,255,0.35)',
                borderBottom: active ? '2px solid rgba(255,255,255,0.25)' : '2px solid transparent',
                whiteSpace: 'nowrap', transition: 'color 0.15s', flexShrink: 0,
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

// Helper item component for dropdown
function CtxItem({
  label, icon, after, active, disabled, onClick,
}: {
  label: string; icon?: React.ReactNode; after?: React.ReactNode;
  active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <div onClick={disabled ? undefined : onClick} style={{
      padding: '8px 12px', fontSize: 12.5, cursor: disabled ? 'default' : 'pointer',
      color: active ? '#c8cdd8' : 'rgba(255,255,255,0.55)',
      background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
      opacity: disabled ? 0.55 : 1,
      display: 'flex', alignItems: 'center', gap: 8,
      transition: 'background 0.1s',
    }}
    onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? 'rgba(255,255,255,0.04)' : 'transparent'; }}
    >
      {icon && <span style={{ opacity: 0.6, display: 'flex' }}>{icon}</span>}
      <span style={{ flex: 1 }}>{label}</span>
      {after && <span style={{ opacity: 0.35, display: 'flex' }}>{after}</span>}
    </div>
  );
}
