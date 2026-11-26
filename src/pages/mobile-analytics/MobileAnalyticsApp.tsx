import React, { useState, useEffect } from "react";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";
import { useCompanyStore } from "../../core/store/useCompanyStore";
import { inicialEmpresa, nombreEmpresa } from "./nombreEmpresa";

// Paleta propia de esta pantalla (siempre oscura, independiente de la skin)
const C_0A0A0A = '#0A0A0A';
const C_F5F5F5 = '#F5F5F5';
const C_9A9A9A = '#9A9A9A';
const C_BDBDBD = '#BDBDBD';
const C_161616 = '#161616';
const C_3D3D3D = '#3D3D3D';
const C_1B1B1B = '#1B1B1B';
const C_2D2D2D = '#2D2D2D';
const C_9B3A3A = '#9B3A3A';
const C_3B7A57 = '#3B7A57';
const C_6B6B6B = '#6B6B6B';

type View = 'login' | 'home' | 'dashboard' | 'tesoreria' | 'ventas' | 'gastos' | 'cxc' | 'cxp' | 'personal' | 'alertas';

export default function ESTIAExecutiveAccess() {
  const [view, setView] = useState<View>('login');
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [showPinError, setShowPinError] = useState(false);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  // La lista de empresas: cargando / con error (reintentar) / vacía / lista
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [errorEmpresas, setErrorEmpresas] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { activeCompany } = useCompanyStore();

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    setCargandoEmpresas(true);
    setErrorEmpresas(false);
    try {
      const response = await api.get("/companies");
      setCompanies(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error loading companies:", error);
      setErrorEmpresas(true);
    } finally {
      setCargandoEmpresas(false);
    }
  }

  function handleCompanySelect(company: any) {
    setSelectedCompany(company);
    setView('login');
  }

  function handlePinSubmit() {
    // Simulación de validación PIN - en producción validar contra backend
    if (pin.length === 4) {
      setShowPinError(false);
      setView('home');
      loadKpis();
    } else {
      setShowPinError(true);
    }
  }

  // Teclado físico en la pantalla del PIN: dígitos, Retroceso y Enter
  useEffect(() => {
    if (!(view === 'login' && selectedCompany)) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) setPin((p) => { if (p.length >= 4) return p; setShowPinError(false); return p + e.key; });
      else if (e.key === 'Backspace') { setPin((p) => p.slice(0, -1)); setShowPinError(false); }
      else if (e.key === 'Enter') handlePinSubmit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function handlePinChange(value: string) {
    setPin(value);
    setShowPinError(false);
  }

  async function loadKpis() {
    try {
      setLoading(true);
      const response = await api.get("/dashboard/kpis", { params: { period: 'month' } });
      setKpis(response.data);
    } catch (error) {
      console.error("Error loading KPIs:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setView('login');
    setPin('');
    setSelectedCompany(null);
    setKpis(null);
  }

  // Vista: Selección de Empresa
  if (view === 'login' && !selectedCompany) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C_0A0A0A, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '400px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 400, color: C_F5F5F5, marginBottom: '8px', letterSpacing: '0.02em' }}>
              ESTIA
            </h1>
            <p style={{ fontSize: '14px', color: C_9A9A9A, letterSpacing: '0.01em' }}>
              Executive Access
            </p>
          </div>

          <p style={{ fontSize: '14px', color: C_9A9A9A, marginBottom: '24px', textAlign: 'center', letterSpacing: '0.01em' }}>
            Selecciona una empresa
          </p>

          {cargandoEmpresas && <p role="status" style={{ textAlign: 'center', color: C_BDBDBD, fontSize: '14px' }}>Cargando empresas…</p>}
          {!cargandoEmpresas && errorEmpresas && (
            <div role="alert" style={{ textAlign: 'center', color: C_F5F5F5, fontSize: '14px' }}>
              <p style={{ marginBottom: '12px' }}>No se pudieron cargar las empresas. Revisa tu conexión e inténtalo de nuevo.</p>
              <button onClick={loadCompanies} style={{ padding: '12px 20px', backgroundColor: C_161616, border: `1px solid ${C_6B6B6B}`, borderRadius: '4px', color: C_F5F5F5, fontSize: '14px', cursor: 'pointer' }}>Reintentar</button>
            </div>
          )}
          {!cargandoEmpresas && !errorEmpresas && companies.length === 0 && (
            <p role="status" style={{ textAlign: 'center', color: C_F5F5F5, fontSize: '14px' }}>Sin empresas. Pide a tu administrador que cree una en el sistema.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleCompanySelect(company)}
                style={{
                  width: '100%',
                  padding: '20px',
                  backgroundColor: C_161616,
                  border: `1px solid ${C_2D2D2D}`,
                  borderRadius: '4px',
                  color: C_F5F5F5,
                  fontSize: '14px',
                  letterSpacing: '0.01em',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C_3D3D3D; e.currentTarget.style.backgroundColor = C_1B1B1B; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C_2D2D2D; e.currentTarget.style.backgroundColor = C_161616; }}
              >
                {nombreEmpresa(company)}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Vista: PIN
  if (view === 'login' && selectedCompany) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C_0A0A0A, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '400px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: C_161616, border: `1px solid ${C_2D2D2D}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <span style={{ fontSize: '32px', color: C_BDBDBD }}>
                {inicialEmpresa(selectedCompany)}
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 400, color: C_F5F5F5, marginBottom: '8px', letterSpacing: '0.01em' }}>
              {nombreEmpresa(selectedCompany)}
            </h2>
            <p style={{ fontSize: '12px', color: C_9A9A9A, letterSpacing: '0.01em' }}>
              Ingresa tu PIN de acceso
            </p>
          </div>

          <div role="group" aria-label={`PIN de 4 dígitos: ${pin.length} de 4 capturados`} style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px' }}>
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                style={{
                  width: '48px',
                  height: '56px',
                  backgroundColor: C_161616,
                  border: showPinError ? `1px solid ${C_9B3A3A}` : `1px solid ${C_2D2D2D}`,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: C_F5F5F5,
                  letterSpacing: '0.02em',
                }}
              >
                {pin[index] ? '•' : ''}
              </div>
            ))}
          </div>

          {showPinError && (
            <p style={{ textAlign: 'center', color: C_9B3A3A, fontSize: '12px', marginBottom: '24px', letterSpacing: '0.01em' }}>
              PIN incorrecto
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((num) => (
              <button
                key={num}
                onClick={() => {
                  if (num === '⌫') {
                    handlePinChange(pin.slice(0, -1));
                  } else if (num === '') {
                    // Espacio vacío
                  } else if (pin.length < 4) {
                    handlePinChange(pin + num);
                  }
                }}
                disabled={num === ''}
                aria-label={num === '⌫' ? 'Borrar último dígito' : num === '' ? undefined : `Dígito ${num}`}
                aria-hidden={num === '' ? true : undefined}
                style={{
                  width: '100%',
                  height: '64px',
                  backgroundColor: C_161616,
                  border: `1px solid ${C_2D2D2D}`,
                  borderRadius: '4px',
                  color: C_F5F5F5,
                  fontSize: '24px',
                  cursor: num === '' ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { if (num !== '') e.currentTarget.style.borderColor = C_3D3D3D; e.currentTarget.style.backgroundColor = C_1B1B1B; }}
                onMouseLeave={(e) => { if (num !== '') e.currentTarget.style.borderColor = C_2D2D2D; e.currentTarget.style.backgroundColor = C_161616; }}
              >
                {num}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSelectedCompany(null)}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              color: C_9A9A9A,
              fontSize: '12px',
              letterSpacing: '0.01em',
              cursor: 'pointer',
            }}
          >
            Cambiar empresa
          </button>
        </div>
      </div>
    );
  }

  // Vista: Home Ejecutivo (Mosaicos)
  if (view === 'home') {
    const modules = [
      { id: 'dashboard', icon: '📊', label: 'Dashboard', description: 'Indicadores clave' },
      { id: 'tesoreria', icon: '💰', label: 'Tesorería', description: 'Flujo de caja' },
      { id: 'ventas', icon: '📈', label: 'Ventas', description: 'Ingresos y metas' },
      { id: 'gastos', icon: '💸', label: 'Gastos', description: 'Egresos y control' },
      { id: 'cxc', icon: '📄', label: 'CxC', description: 'Cuentas por cobrar' },
      { id: 'cxp', icon: '📋', label: 'CxP', description: 'Cuentas por pagar' },
      { id: 'personal', icon: '👥', label: 'Personal', description: 'Nómina y equipo' },
      { id: 'alertas', icon: '🔔', label: 'Alertas', description: 'Notificaciones' },
    ];

    return (
      <div style={{ minHeight: '100vh', backgroundColor: C_0A0A0A, padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: C_161616, border: `1px solid ${C_2D2D2D}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '20px', color: C_BDBDBD }}>
                {inicialEmpresa(selectedCompany)}
              </span>
            </div>
            <div>
              <h1 style={{ fontSize: '16px', fontWeight: 400, color: C_F5F5F5, marginBottom: '2px', letterSpacing: '0.01em' }}>
                {selectedCompany ? nombreEmpresa(selectedCompany) : 'Empresa'}
              </h1>
              <p style={{ fontSize: '12px', color: C_9A9A9A, letterSpacing: '0.01em' }}>
                {user?.name || 'Usuario'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: `1px solid ${C_2D2D2D}`,
              borderRadius: '2px',
              color: C_9A9A9A,
              fontSize: '12px',
              letterSpacing: '0.01em',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C_3D3D3D; e.currentTarget.style.color = C_BDBDBD; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C_2D2D2D; e.currentTarget.style.color = C_9A9A9A; }}
          >
            Salir
          </button>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 400, color: C_F5F5F5, marginBottom: '24px', letterSpacing: '0.01em' }}>
          Consulta Ejecutiva
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => setView(module.id as View)}
              style={{
                padding: '24px',
                backgroundColor: C_161616,
                border: `1px solid ${C_2D2D2D}`,
                borderRadius: '4px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C_3D3D3D; e.currentTarget.style.backgroundColor = C_1B1B1B; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C_2D2D2D; e.currentTarget.style.backgroundColor = C_161616; }}
            >
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>
                {module.icon}
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 400, color: C_F5F5F5, marginBottom: '4px', letterSpacing: '0.01em' }}>
                {module.label}
              </h3>
              <p style={{ fontSize: '12px', color: C_9A9A9A, letterSpacing: '0.01em' }}>
                {module.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Vista: Dashboard (solo consulta)
  if (view === 'dashboard') {
    const ventas = Number(kpis?.income || 0);
    const costo = Number(kpis?.expense || 0) * 0.6;
    const gasto = Number(kpis?.expense || 0) * 0.4;
    const uai = ventas - Number(kpis?.expense || 0);
    const udi = uai * 0.75;

    return (
      <div style={{ minHeight: '100vh', backgroundColor: C_0A0A0A, padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button
            onClick={() => setView('home')}
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              color: C_9A9A9A,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ← Volver
          </button>
          <h1 style={{ fontSize: '16px', fontWeight: 400, color: C_F5F5F5, letterSpacing: '0.01em' }}>
            Dashboard
          </h1>
          <div style={{ width: '60px' }} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: C_9A9A9A }}>
            Cargando...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* KPIs */}
            <div style={{ backgroundColor: C_161616, border: `1px solid ${C_2D2D2D}`, borderRadius: '4px', padding: '20px' }}>
              <p style={{ fontSize: '12px', color: C_9A9A9A, marginBottom: '16px', letterSpacing: '0.01em' }}>
                Resumen del mes
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '12px', color: C_9A9A9A, marginBottom: '4px', letterSpacing: '0.01em' }}>Ventas</p>
                  <p style={{ fontSize: '24px', color: C_F5F5F5, fontWeight: 400, letterSpacing: '0.01em' }}>
                    ${ventas.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: C_9A9A9A, marginBottom: '4px', letterSpacing: '0.01em' }}>UAI</p>
                  <p style={{ fontSize: '24px', color: uai >= 0 ? C_3B7A57 : C_9B3A3A, fontWeight: 400, letterSpacing: '0.01em' }}>
                    ${uai.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: C_9A9A9A, marginBottom: '4px', letterSpacing: '0.01em' }}>Costo</p>
                  <p style={{ fontSize: '24px', color: C_F5F5F5, fontWeight: 400, letterSpacing: '0.01em' }}>
                    ${costo.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: C_9A9A9A, marginBottom: '4px', letterSpacing: '0.01em' }}>UDI</p>
                  <p style={{ fontSize: '24px', color: udi >= 0 ? C_3B7A57 : C_9B3A3A, fontWeight: 400, letterSpacing: '0.01em' }}>
                    ${udi.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Movimientos recientes */}
            <div style={{ backgroundColor: C_161616, border: `1px solid ${C_2D2D2D}`, borderRadius: '4px', padding: '20px' }}>
              <p style={{ fontSize: '12px', color: C_9A9A9A, marginBottom: '16px', letterSpacing: '0.01em' }}>
                Movimientos recientes
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(kpis?.latestMovements || []).slice(0, 5).map((movement: any) => (
                  <div key={movement.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: C_1B1B1B, borderRadius: '2px' }}>
                    <div>
                      <p style={{ fontSize: '13px', color: C_F5F5F5, marginBottom: '2px', letterSpacing: '0.01em' }}>{movement.concept}</p>
                      <p style={{ fontSize: '12px', color: C_9A9A9A, letterSpacing: '0.01em' }}>{movement.category}</p>
                    </div>
                    <p style={{ fontSize: '14px', color: movement.type === 'INCOME' ? C_3B7A57 : C_9B3A3A, fontWeight: 400, letterSpacing: '0.01em' }}>
                      {movement.type === 'INCOME' ? '+' : '-'}${Number(movement.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vistas placeholder para otros módulos
  const placeholderViews: View[] = ['tesoreria', 'ventas', 'gastos', 'cxc', 'cxp', 'personal', 'alertas'];
  if (placeholderViews.includes(view)) {
    const viewNames: Record<View, string> = {
      login: 'Acceso',
      home: 'Inicio',
      dashboard: 'Dashboard',
      tesoreria: 'Tesorería',
      ventas: 'Ventas',
      gastos: 'Gastos',
      cxc: 'Cuentas por Cobrar',
      cxp: 'Cuentas por Pagar',
      personal: 'Personal',
      alertas: 'Alertas',
    };

    return (
      <div style={{ minHeight: '100vh', backgroundColor: C_0A0A0A, padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button
            onClick={() => setView('home')}
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              color: C_9A9A9A,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ← Volver
          </button>
          <h1 style={{ fontSize: '16px', fontWeight: 400, color: C_F5F5F5, letterSpacing: '0.01em' }}>
            {viewNames[view]}
          </h1>
          <div style={{ width: '60px' }} />
        </div>

        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '14px', color: C_9A9A9A, marginBottom: '8px', letterSpacing: '0.01em' }}>
            Módulo en desarrollo
          </p>
          <p style={{ fontSize: '12px', color: C_9A9A9A, letterSpacing: '0.01em' }}>
            Esta sección estará disponible próximamente
          </p>
        </div>
      </div>
    );
  }

  return null;
}
