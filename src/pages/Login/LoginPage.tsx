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

      navigate("/dashboard");
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

      navigate("/pos");
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
      backgroundColor: '#0A0A0A',
      ...(brandingBg ? {
        backgroundImage: `url(${brandingBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : {}),
    }}>
      {/* Columna Izquierda - 45% */}
      <div style={{
        width: '45%',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: config.backgroundImage ? `url(${config.backgroundImage})` : undefined,
        background: config.backgroundImage ? undefined : '#0A0A0A',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
      }}>
        {/* SVG Background Pattern (solo si no hay imagen personalizada) */}
        {!config.backgroundImage && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            opacity: 0.03,
          }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="0" y1="20" x2="100" y2="20" stroke="#BDBDBD" strokeWidth="0.5" />
              <line x1="0" y1="40" x2="100" y2="40" stroke="#BDBDBD" strokeWidth="0.5" />
              <line x1="0" y1="60" x2="100" y2="60" stroke="#BDBDBD" strokeWidth="0.5" />
              <line x1="0" y1="80" x2="100" y2="80" stroke="#BDBDBD" strokeWidth="0.5" />
              <line x1="20" y1="0" x2="20" y2="100" stroke="#BDBDBD" strokeWidth="0.5" />
              <line x1="40" y1="0" x2="40" y2="100" stroke="#BDBDBD" strokeWidth="0.5" />
              <line x1="60" y1="0" x2="60" y2="100" stroke="#BDBDBD" strokeWidth="0.5" />
              <line x1="80" y1="0" x2="80" y2="100" stroke="#BDBDBD" strokeWidth="0.5" />
              <rect x="25" y="25" width="10" height="10" stroke="#BDBDBD" strokeWidth="0.5" fill="none" />
              <rect x="65" y="65" width="10" height="10" stroke="#BDBDBD" strokeWidth="0.5" fill="none" />
            </svg>
          </div>
        )}

        {/* Overlay (solo si hay imagen personalizada) */}
        {config.backgroundImage && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)',
            zIndex: 0,
          }} />
        )}

        {/* Logo del cliente */}
        {(brandingLogo || config.logoUrl) && (
          <div style={{ position: 'relative', zIndex: 1 }}>
            <img src={brandingLogo || config.logoUrl} alt="Logo" style={{ maxHeight: '60px' }} />
          </div>
        )}

        {/* ESTIA logo */}
        <div style={{ position: 'absolute', top: '48px', right: '48px', zIndex: 1 }}>
          <span style={{ fontSize: '12px', color: '#BDBDBD', letterSpacing: '0.1em' }}>ESTIA</span>
        </div>

        {/* Contenido central */}
        <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', marginBottom: 'auto' }}>
          {brandingLogo ? (
            <div style={{ marginBottom: '24px' }}>
              <img src={brandingLogo} alt="Logo" style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain' }} />
            </div>
          ) : (
            <>
              <p style={{ fontSize: '10px', color: '#BDBDBD', letterSpacing: '0.15em', marginBottom: '16px' }}>
                BIENVENIDO A
              </p>
              <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 200, color: '#F5F5F5', letterSpacing: '0.12em', marginBottom: '8px' }}>
                {config.companyName || 'Sistema de Gestión'}
              </h1>
            </>
          )}
          <div style={{ width: '40px', height: '1px', backgroundColor: '#BDBDBD', margin: '16px 0' }} />
          <p style={{ fontSize: '13px', color: '#9A9A9A' }}>
            {config.tagline || 'Solución integral para tu negocio'}
          </p>
        </div>

        {/* Íconos */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
            <p style={{ fontSize: '11px', color: '#BDBDBD' }}>Información en tiempo real</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</div>
            <p style={{ fontSize: '11px', color: '#BDBDBD' }}>Seguridad avanzada</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📈</div>
            <p style={{ fontSize: '11px', color: '#BDBDBD' }}>Indicadores clave</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>👥</div>
            <p style={{ fontSize: '11px', color: '#BDBDBD' }}>Multiusuario y permisos</p>
          </div>
        </div>
      </div>

      {/* Columna Derecha - 55% */}
      <div style={{ width: '55%', backgroundColor: '#0A0A0A', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px' }}>
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 300, color: '#F5F5F5', marginBottom: '8px' }}>
            ¿Cómo deseas ingresar?
          </h1>
          <p style={{ fontSize: '14px', color: '#9A9A9A' }}>
            Selecciona el acceso que necesitas
          </p>
        </div>

        {/* Tarjetas */}
        {!expandedCard ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Tarjeta Sistema Principal */}
            <div
              style={{
                backgroundColor: 'rgba(22,22,22,0.95)',
                border: '1px solid #2D2D2D',
                borderRadius: '12px',
                padding: '32px 24px',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#BDBDBD'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2D2D2D'}
              onClick={() => setExpandedCard('main')}
            >
              {/* Doodle SVG */}
              <div style={{ marginBottom: '24px', opacity: 0.15 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9A9A9A" strokeWidth="1">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#F5F5F5', marginBottom: '12px' }}>
                SISTEMA PRINCIPAL
              </h2>
              <div style={{ width: '40px', height: '1px', backgroundColor: '#2D2D2D', marginBottom: '12px' }} />
              <p style={{ fontSize: '13px', color: '#9A9A9A', marginBottom: '16px' }}>
                Administra todas las áreas de tu negocio desde una sola plataforma.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Ventas</span>
                <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Inventarios</span>
                <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Compras</span>
                <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Finanzas</span>
                <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Tesorería</span>
              </div>
              <button
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#BDBDBD',
                  backgroundColor: '#1B1B1B',
                  border: '1px solid #3D3D3D',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#BDBDBD';
                  e.currentTarget.style.color = '#F5F5F5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3D3D3D';
                  e.currentTarget.style.color = '#BDBDBD';
                }}
              >
                INGRESAR
              </button>
            </div>

            {/* Tarjeta POS */}
            <div
              style={{
                backgroundColor: 'rgba(22,22,22,0.95)',
                border: '1px solid #2D2D2D',
                borderRadius: '12px',
                padding: '32px 24px',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#BDBDBD'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2D2D2D'}
              onClick={() => setExpandedCard('pos')}
            >
              {/* Doodle SVG */}
              <div style={{ marginBottom: '24px', opacity: 0.15 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9A9A9A" strokeWidth="1">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#F5F5F5', marginBottom: '12px' }}>
                PUNTO DE VENTA
              </h2>
              <div style={{ width: '40px', height: '1px', backgroundColor: '#2D2D2D', marginBottom: '12px' }} />
              <p style={{ fontSize: '13px', color: '#9A9A9A', marginBottom: '16px' }}>
                Accede al sistema de ventas rápido y seguro para tu punto de venta.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Ventas</span>
                <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Cobros</span>
                <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Cortes de caja</span>
                <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Tickets</span>
                <span style={{ fontSize: '11px', color: '#7E7E7E' }}>Clientes</span>
              </div>
              <button
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#BDBDBD',
                  backgroundColor: '#1B1B1B',
                  border: '1px solid #3D3D3D',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#BDBDBD';
                  e.currentTarget.style.color = '#F5F5F5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3D3D3D';
                  e.currentTarget.style.color = '#BDBDBD';
                }}
              >
                INGRESAR
              </button>
            </div>
          </div>
        ) : (
          /* Formulario expandido */
          <div style={{ maxWidth: '448px', margin: '0 auto' }}>
            <button
              onClick={() => setExpandedCard(null)}
              style={{ marginBottom: '24px', fontSize: '14px', color: '#9A9A9A', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              ← Volver
            </button>

            <h2 style={{ fontSize: '24px', fontWeight: 300, color: '#F5F5F5', marginBottom: '24px' }}>
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
                  style={{ marginBottom: '16px', width: '100%', padding: '12px', borderRadius: '6px', fontSize: '14px', backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', color: '#F5F5F5' }}
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleMainLogin()}
                  style={{ marginBottom: '24px', width: '100%', padding: '12px', borderRadius: '6px', fontSize: '14px', backgroundColor: '#1B1B1B', border: '1px solid #2D2D2D', color: '#F5F5F5' }}
                />
                <button
                  onClick={handleMainLogin}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: loading ? '#9A9A9A' : '#BDBDBD',
                    backgroundColor: loading ? '#2D2D2D' : '#1B1B1B',
                    border: '1px solid #3D3D3D',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.borderColor = '#BDBDBD';
                      e.currentTarget.style.color = '#F5F5F5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.borderColor = '#3D3D3D';
                      e.currentTarget.style.color = '#BDBDBD';
                    }
                  }}
                >
                  {loading ? "Entrando..." : "INGRESAR"}
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
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          backgroundColor: '#1B1B1B',
                          border: '1px solid #2D2D2D',
                          color: '#BDBDBD',
                        }}
                      >
                        {index < nip.length ? '●' : '○'}
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '14px', color: '#9A9A9A' }}>
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
                        width: '64px',
                        height: '64px',
                        borderRadius: '8px',
                        fontSize: '24px',
                        fontWeight: 500,
                        backgroundColor: '#1B1B1B',
                        border: '1px solid #2D2D2D',
                        color: '#F5F5F5',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#222222';
                        e.currentTarget.style.borderColor = '#3D3D3D';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#1B1B1B';
                        e.currentTarget.style.borderColor = '#2D2D2D';
                      }}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handleNipDelete}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      fontSize: '24px',
                      fontWeight: 500,
                      backgroundColor: 'rgba(155, 58, 58, 0.1)',
                      border: '1px solid #9B3A3A',
                      color: '#9B3A3A',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(155, 58, 58, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(155, 58, 58, 0.1)';
                    }}
                  >
                    ⌫
                  </button>
                  <button
                    onClick={() => handleNipInput('0')}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      fontSize: '24px',
                      fontWeight: 500,
                      backgroundColor: '#1B1B1B',
                      border: '1px solid #2D2D2D',
                      color: '#F5F5F5',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#222222';
                      e.currentTarget.style.borderColor = '#3D3D3D';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#1B1B1B';
                      e.currentTarget.style.borderColor = '#2D2D2D';
                    }}
                  >
                    0
                  </button>
                  <button
                    onClick={handleNipClear}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      fontSize: '24px',
                      fontWeight: 500,
                      backgroundColor: '#1B1B1B',
                      border: '1px solid #2D2D2D',
                      color: '#9A9A9A',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#222222';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#1B1B1B';
                    }}
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

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#7E7E7E' }}>
            Alta seguridad · Respaldo en la nube · Soporte especializado
          </p>
          <p style={{ fontSize: '11px', color: '#7E7E7E', marginTop: '8px' }}>
            © {new Date().getFullYear()} {config.companyName || 'Sistema de Gestión'}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}