import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";
import { useLoginConfigStore } from "../../core/store/useLoginConfigStore";
import { useBrandingStore } from "../../core/store/useBrandingStore";

export default function LoginPage() {
  const { login } = useAuthStore();
  const { config, loadConfig } = useLoginConfigStore();
  const navigate = useNavigate();
  useBrandingStore(); // keep store subscribed

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cajero, setCajero] = useState("");
  const [nip, setNip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"main" | "pos" | null>(null);

  useEffect(() => {
    useBrandingStore.getState().load();
    const tenantId = localStorage.getItem('tenant_id');
    if (tenantId) {
      loadConfig(tenantId);
    } else {
      loadConfig();
    }
  }, [loadConfig]);

  useEffect(() => {
    if (config.customCSS) {
      const style = document.createElement('style');
      style.id = 'white-label-css';
      style.innerHTML = config.customCSS;
      document.head.appendChild(style);
      return () => {
        const el = document.getElementById('white-label-css');
        if (el) el.remove();
      };
    }
  }, [config.customCSS]);

  async function handleMainLogin() {
    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const token = response.data.access_token;
      const modulosActivos = response.data.modulosActivos || [];
      const user = response.data.user || {};

      let finalModulosActivos = modulosActivos;
      if (user.roleCode === 'SOPORTE') {
        finalModulosActivos = [
          'dashboard', 'empresas', 'sucursales', 'bancos', 'movements',
          'transferencias', 'reportes', 'tesoreria', 'conciliacion', 'pos',
          'configuracion-pos', 'integraciones', 'proveedores', 'compras',
          'costos', 'white-label', 'administracion'
        ];
      }

      login(token, user.tenantId || '', {
        id: user.id || "1",
        email,
        name: user.name || "Administrador",
        roleCode: user.roleCode,
        tenantId: user.tenantId,
      }, finalModulosActivos, response.data.refresh_token);

      navigate("/");
    } catch (error: any) {
      console.error(error);
      setError(error.response?.data?.message || "Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  async function handlePosLogin() {
    try {
      setLoading(true);
      setError("");

      const tenantId = localStorage.getItem('tenant_id');
      const response = await api.post("/pos/cashiers/nip", { nip }, {
        headers: { 'tenant-id': tenantId || '' },
      });

      const token = response.data.access_token;
      const modulosActivos = response.data.modulosActivos || [];
      const user = response.data.user || {};

      login(token, user.tenantId || '', {
        id: user.id || "1",
        email: user.email || cajero,
        name: user.name || "Cajero",
        roleCode: user.roleCode,
        tenantId: user.tenantId,
      }, modulosActivos);

      const planCode: string = response.data.planCode || '';
      const isLiteCorte = planCode === 'LITE_CORTE' || planCode === 'LITE_POS';
      if (isLiteCorte && user.tenantId) {
        navigate(`/corte?tenant=${user.tenantId}`);
      } else {
        navigate("/pos");
      }
    } catch (error: any) {
      console.error(error);
      setError(error.response?.data?.message || "NIP incorrecto");
    } finally {
      setLoading(false);
    }
  }

  const handleNipInput = (value: string) => {
    if (nip.length < 4) {
      setNip(nip + value);
    }
  };

  const handleNipDelete = () => {
    setNip(nip.slice(0, -1));
  };

  const handleNipClear = () => {
    setNip("");
  };

  useEffect(() => {
    if (nip.length === 4 && !loading) {
      handlePosLogin();
    }
  }, [nip]);

  if (config.maintenanceMode) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: '#0A0A0A' }}>
        <div style={{ width: '100%', maxWidth: '448px', padding: '32px', borderRadius: '8px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: '#F5F5F5' }}>
            Sistema en Mantenimiento
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
            {config.maintenanceMessage || 'El sistema se encuentra en mantenimiento programado. Por favor, intente más tarde.'}
          </p>
          {config.maintenanceStartTime && config.maintenanceEndTime && (
            <p style={{ fontSize: '12px', marginTop: '16px', color: 'rgba(255,255,255,0.4)' }}>
              {new Date(config.maintenanceStartTime).toLocaleString()} - {new Date(config.maintenanceEndTime).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  // keep cajero referenced to avoid lint
  void cajero;

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      fontFamily: "'Manrope', sans-serif",
      background: '#030712',
    }}>

      {/* ══════════ PANEL IZQUIERDO 55% ══════════ */}
      <div style={{
        flex: '0 0 55%',
        background: `
          radial-gradient(circle at 50% 85%, rgba(37,99,235,.45), transparent 18%),
          radial-gradient(circle at 0% 55%, rgba(37,99,235,.30), transparent 25%),
          radial-gradient(circle at 100% 55%, rgba(37,99,235,.25), transparent 25%),
          linear-gradient(180deg, #07101F 0%, #030712 100%)
        `,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 64px',
        position: 'relative', overflow: 'hidden',
        borderRight: '1px solid rgba(59,130,246,0.25)',
      }}>

        {/* Grid sutil */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px', pointerEvents: 'none',
        }} />

        {/* Glow inferior */}
        <div style={{
          position: 'absolute', bottom: '18%', left: '50%',
          transform: 'translateX(-50%)',
          width: 420, height: 2, background: '#38BDF8',
          filter: 'blur(18px)', pointerEvents: 'none',
        }} />

        {/* Contenido */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 520, width: '100%' }}>

          {/* Isotipo centrado */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
            <img
              src="/logo-estia-isotipo.png"
              alt="ESTIA"
              style={{
                height: 240,
                objectFit: 'contain',
                mixBlendMode: 'screen',
                filter: 'drop-shadow(0 0 50px rgba(37,99,235,0.7))',
              }}
            />
          </div>

          {/* Badge — justo debajo del isotipo */}
          <div style={{ fontSize: 10, letterSpacing: '0.28em', color: '#64748B', textTransform: 'uppercase', marginBottom: 24 }}>
            Inteligencia Empresarial
          </div>

          <h1 style={{ fontSize: 52, fontWeight: 400, lineHeight: 1.12, color: '#F8FAFC', marginBottom: 20, letterSpacing: '-0.02em' }}>
            Control, orden<br />
            y decisión<br />
            para tu <span style={{ color: '#1D7CFF' }}>empresa</span>
          </h1>

          <p style={{ fontSize: 16, color: '#64748B', fontWeight: 400, lineHeight: 1.7, maxWidth: 440, margin: '0 auto 56px' }}>
            Plataforma empresarial modular — multi-empresa, multi-sucursal, multi-usuario.
          </p>

          {/* Features — 4 en fila */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, textAlign: 'center' }}>
            {[
              {
                title: 'Multi-empresa',
                desc: 'Gestiona todas tus empresas desde un solo sistema.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D7CFF" strokeWidth="1.5" strokeLinecap="round"><path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 10v11M16 10v11M12 10v11"/></svg>
              },
              {
                title: 'Multi-sucursal',
                desc: 'Control total de tus sucursales en tiempo real.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D7CFF" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4M10.5 15l-3.5 2M13.5 15l3.5 2"/></svg>
              },
              {
                title: 'Multi-usuario',
                desc: 'Usuarios y permisos por rol para mayor seguridad.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D7CFF" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="7" r="3" opacity="0.5"/><path d="M1 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/><path d="M17 11c2.2 0 4 1.8 4 4.5" opacity="0.5"/></svg>
              },
              {
                title: 'Tiempo real',
                desc: 'Toma decisiones con información actualizada.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D7CFF" strokeWidth="1.5" strokeLinecap="round"><path d="M3 20l4.5-6 4 4 4.5-7.5L20 16"/></svg>
              },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'rgba(29,124,255,0.1)', border: '1px solid rgba(29,124,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{f.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#F8FAFC' }}>{f.title}</div>
                <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ PANEL DERECHO 45% ══════════ */}
      <div style={{
        flex: '0 0 45%',
        background: '#050A14',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 56px', position: 'relative',
      }}>

        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* ── Selección inicial ── */}
          {!mode && (
            <>
              {/* Logo ERP justo arriba del título */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <img
                  src="/logo-estia-erp.png"
                  alt="ESTIA ERP"
                  style={{ height: 90, objectFit: 'contain', mixBlendMode: 'screen' }}
                />
              </div>

              <h2 style={{ fontSize: 22, fontWeight: 500, color: '#F8FAFC', textAlign: 'center', marginBottom: 8 }}>
                Bienvenido de regreso
              </h2>
              <p style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 36 }}>
                Selecciona una opción para continuar
              </p>

              {[
                {
                  mode: 'main' as const,
                  title: 'Sistema Principal',
                  desc: 'Administración, finanzas, RH, reportes y configuración',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D7CFF" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5" opacity="0.5"/><rect x="3" y="14" width="7" height="7" rx="1.5" opacity="0.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" opacity="0.3"/></svg>
                },
                {
                  mode: 'pos' as const,
                  title: 'Punto de Venta',
                  desc: 'Cortes de caja, ventas, cobros y tickets',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D7CFF" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M7 10h10M7 14h6"/></svg>
                }
              ].map((item, i) => (
                <div
                  key={item.mode}
                  onClick={() => { setMode(item.mode); setError(""); }}
                  style={{
                    borderRadius: 20, padding: '28px 24px',
                    background: 'rgba(15,23,42,0.35)',
                    border: '1px solid rgba(148,163,184,0.16)',
                    cursor: 'pointer',
                    marginBottom: i === 0 ? 14 : 0,
                    display: 'flex', alignItems: 'center', gap: 18,
                    transition: 'all 0.25s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(37,99,235,0.55)';
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(37,99,235,0.12)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(148,163,184,0.16)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'rgba(29,124,255,0.12)', border: '1px solid rgba(29,124,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#F8FAFC', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D7CFF" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ))}
            </>
          )}

          {/* ── Formulario Sistema Principal ── */}
          {mode === 'main' && (
            <div>
              <button
                onClick={() => { setMode(null); setError(""); }}
                style={{ marginBottom: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                ← Volver
              </button>

              <h2 style={{ fontSize: '24px', fontWeight: 300, color: '#e8ecf0', marginBottom: '24px' }}>
                Sistema Principal
              </h2>

              {error && (
                <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '6px', fontSize: '14px', textAlign: 'center', backgroundColor: 'rgba(155, 58, 58, 0.1)', color: '#9B3A3A', border: '1px solid #9B3A3A' }}>
                  {error}
                </div>
              )}

              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ marginBottom: '16px', width: '100%', padding: '12px', borderRadius: '6px', fontSize: '14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e8ecf0', boxSizing: 'border-box' }}
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleMainLogin()}
                style={{ marginBottom: '24px', width: '100%', padding: '12px', borderRadius: '6px', fontSize: '14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e8ecf0', boxSizing: 'border-box' }}
              />
              <button
                onClick={handleMainLogin}
                disabled={loading}
                style={{
                  width: '100%', padding: '13px', fontSize: '13px', fontWeight: 400,
                  letterSpacing: '0.08em', color: loading ? 'rgba(255,255,255,0.2)' : '#c8cdd8',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.borderColor = 'rgba(143,175,212,0.4)'; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                {loading ? "Entrando..." : "Ingresar"}
              </button>
            </div>
          )}

          {/* ── Formulario POS / NIP ── */}
          {mode === 'pos' && (
            <div>
              <button
                onClick={() => { setMode(null); setError(""); setNip(""); }}
                style={{ marginBottom: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                ← Volver
              </button>

              <h2 style={{ fontSize: '24px', fontWeight: 300, color: '#e8ecf0', marginBottom: '24px' }}>
                Punto de Venta
              </h2>

              {error && (
                <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '6px', fontSize: '14px', textAlign: 'center', backgroundColor: 'rgba(155, 58, 58, 0.1)', color: '#9B3A3A', border: '1px solid #9B3A3A' }}>
                  {error}
                </div>
              )}

              {/* Display de NIP */}
              <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px', backgroundColor: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)', color: '#8fafd4',
                      }}
                    >
                      {index < nip.length ? '●' : '○'}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>
                  Ingresa tu NIP de 4 dígitos
                </p>
              </div>

              {/* Teclado numérico */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNipInput(num)}
                    style={{
                      width: '64px', height: '64px', borderRadius: '8px',
                      fontSize: '24px', fontWeight: 400,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#e8ecf0', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handleNipDelete}
                  style={{
                    width: '64px', height: '64px', borderRadius: '8px',
                    fontSize: '20px', fontWeight: 400,
                    backgroundColor: 'rgba(252,165,165,0.05)',
                    border: '1px solid rgba(252,165,165,0.15)',
                    color: 'rgba(252,165,165,0.6)', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(252,165,165,0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(252,165,165,0.15)'; }}
                >
                  ⌫
                </button>
                <button
                  onClick={() => handleNipInput('0')}
                  style={{
                    width: '64px', height: '64px', borderRadius: '8px',
                    fontSize: '24px', fontWeight: 400,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#e8ecf0', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  0
                </button>
                <button
                  onClick={handleNipClear}
                  style={{
                    width: '64px', height: '64px', borderRadius: '8px',
                    fontSize: '16px', fontWeight: 400,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  C
                </button>
              </div>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={nip}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setNip(value);
                }}
                style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
                autoFocus
              />
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 24, fontSize: 11, color: '#1e293b', letterSpacing: '0.05em' }}>
          © 2026 ESTIA Consultoría · Todos los derechos reservados
        </div>
      </div>
    </div>
  );
}
