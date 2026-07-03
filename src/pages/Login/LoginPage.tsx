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
  const { backgroundImage: brandingBg, logoUrl: brandingLogo } = useBrandingStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cajero, setCajero] = useState("");
  const [nip, setNip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAccess, setSelectedAccess] = useState<"main" | "pos" | null>(null);
  const [expandedCard, setExpandedCard] = useState<"main" | "pos" | null>(null);

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
      }, finalModulosActivos);

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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#050709',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Panel izquierdo — branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 64px',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Logo / marca */}
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(143,175,212,0.6)', textTransform: 'uppercase', marginBottom: 8 }}>
            ESTIA
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
            Consultoría Empresarial
          </div>
        </div>

        {/* Tagline central */}
        <div>
          <div style={{ fontSize: 48, fontWeight: 200, color: '#e8ecf0', lineHeight: 1.2, marginBottom: 24, letterSpacing: '-0.02em' }}>
            Control, orden<br />y decisión<br />para tu <span style={{ color: '#8fafd4' }}>empresa</span>
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', fontWeight: 300, lineHeight: 1.8, maxWidth: 380 }}>
            Plataforma empresarial modular — multi-empresa, multi-sucursal, multi-usuario.
          </div>
        </div>

        {/* Footer */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}>
          © {new Date().getFullYear()} ESTIA Consultoría · Todos los derechos reservados
        </div>
      </div>

      {/* Panel derecho — acceso */}
      <div style={{
        width: 480,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 56px',
      }}>
        {!expandedCard ? (
          <>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 32 }}>
              Selecciona tu acceso
            </div>

            {/* Botón Sistema Principal */}
            <button
              onClick={() => setExpandedCard('main')}
              style={{
                width: '100%', padding: '24px 28px', marginBottom: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(143,175,212,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              <div style={{ fontSize: 15, fontWeight: 400, color: '#c8cdd8', marginBottom: 6 }}>
                Sistema Principal
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
                Administración, finanzas, RH, reportes y configuración
              </div>
            </button>

            {/* Botón Punto de Venta */}
            <button
              onClick={() => setExpandedCard('pos')}
              style={{
                width: '100%', padding: '24px 28px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(74,222,128,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              <div style={{ fontSize: 15, fontWeight: 400, color: '#c8cdd8', marginBottom: 6 }}>
                Punto de Venta
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
                Cortes de caja, ventas, cobros y tickets
              </div>
            </button>
          </>
        ) : (
          /* Formulario expandido — sin cambios de lógica */
          <div style={{ maxWidth: '448px', margin: '0 auto', width: '100%' }}>
            <button
              onClick={() => setExpandedCard(null)}
              style={{ marginBottom: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              ← Volver
            </button>

            <h2 style={{ fontSize: '24px', fontWeight: 300, color: '#e8ecf0', marginBottom: '24px' }}>
              {expandedCard === 'main' ? 'Sistema Principal' : 'Punto de Venta'}
            </h2>

            {error && (
              <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '6px', fontSize: '14px', textAlign: 'center', backgroundColor: 'rgba(155, 58, 58, 0.1)', color: '#9B3A3A', border: '1px solid #9B3A3A' }}>
                {error}
              </div>
            )}

            {expandedCard === 'main' ? (
              <>
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
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}