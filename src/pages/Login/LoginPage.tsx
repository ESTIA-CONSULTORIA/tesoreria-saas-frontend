import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";
import { useLoginConfigStore } from "../../core/store/useLoginConfigStore";

export default function LoginPage() {
  const { login } = useAuthStore();
  const { config, loadConfig } = useLoginConfigStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cajero, setCajero] = useState("");
  const [nip, setNip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAccess, setSelectedAccess] = useState<"main" | "pos" | null>(null);

  useEffect(() => {
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

      // SOPORTE tiene acceso a todos los módulos
      let finalModulosActivos = modulosActivos;
      if (user.roleCode === 'SOPORTE') {
        finalModulosActivos = [
          'dashboard',
          'empresas',
          'sucursales',
          'bancos',
          'movimientos',
          'transferencias',
          'reportes',
          'tesoreria',
          'conciliacion',
          'pos',
          'configuracion-pos',
          'integraciones',
          'proveedores',
          'compras',
          'costos',
          'white-label',
          'administracion'
        ];
      }

      login(
        token,
        user.tenantId || '',
        {
          id: user.id || "1",
          email,
          name: user.name || "Administrador",
          roleCode: user.roleCode,
          tenantId: user.tenantId,
        },
        finalModulosActivos
      );

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
      const response = await api.post("/pos/cashiers/nip", {
        nip,
      }, {
        headers: {
          'tenant-id': tenantId || '',
        },
      });

      const token = response.data.access_token;
      const modulosActivos = response.data.modulosActivos || [];
      const user = response.data.user || {};

      login(
        token,
        user.tenantId || '',
        {
          id: user.id || "1",
          email: user.email || cajero,
          name: user.name || "Cajero",
          roleCode: user.roleCode,
          tenantId: user.tenantId,
        },
        modulosActivos
      );

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

  // Verificar modo de mantenimiento
  if (config.maintenanceMode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="w-full max-w-md p-8 rounded-lg text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-5xl mb-4">🔧</div>
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#ffffff' }}>
            Sistema en Mantenimiento
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {config.maintenanceMessage || 'El sistema se encuentra en mantenimiento programado. Por favor, intente más tarde.'}
          </p>
          {config.maintenanceStartTime && config.maintenanceEndTime && (
            <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {new Date(config.maintenanceStartTime).toLocaleString()} - {new Date(config.maintenanceEndTime).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Columna Izquierda - 40% */}
      <div 
        className="w-2/5 relative flex flex-col justify-between p-12"
        style={{
          backgroundImage: config.backgroundImage ? `url(${config.backgroundImage})` : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Logo en esquina superior derecha */}
        {config.logoUrl && (
          <div className="absolute top-8 right-8">
            <img
              src={config.logoUrl}
              alt="Logo"
              style={{ maxHeight: '60px' }}
            />
          </div>
        )}

        {/* Contenido superior */}
        <div className="mt-20">
          <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '2px' }}>
            BIENVENIDO A
          </p>
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#ffffff' }}>
            {config.companyName || 'Sistema de Gestión'}
          </h1>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {config.tagline || 'Solución integral para tu negocio'}
          </p>
        </div>

        {/* Íconos de características */}
        <div className="grid grid-cols-2 gap-6 mt-12">
          <div className="flex flex-col items-center text-center">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Información en tiempo real</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="text-3xl mb-2">🔒</div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Seguridad avanzada</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="text-3xl mb-2">📈</div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Indicadores clave</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="text-3xl mb-2">👥</div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Multiusuario y permisos</p>
          </div>
        </div>
      </div>

      {/* Columna Derecha - 60% */}
      <div className="w-3/5 flex flex-col p-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#ffffff' }}>
            ¿Cómo deseas ingresar?
          </h1>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Selecciona el acceso que necesitas
          </p>
        </div>

        {/* Tarjetas de acceso */}
        {!selectedAccess ? (
          <div className="grid grid-cols-2 gap-6 flex-1">
            {/* Tarjeta 1 - Sistema Principal */}
            <div
              className="p-6 rounded-lg cursor-pointer transition-all hover:scale-105"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              onClick={() => setSelectedAccess('main')}
            >
              <div className="text-4xl mb-4">🖥️</div>
              <h2 className="text-xl font-bold mb-3" style={{ color: '#ffffff' }}>
                SISTEMA PRINCIPAL
              </h2>
              <div className="w-16 h-0.5 mb-4" style={{ backgroundColor: '#D4AF37' }}></div>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Administra todas las áreas de tu negocio desde una sola plataforma.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>Ventas</span>
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>Inventarios</span>
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>Compras</span>
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>Finanzas</span>
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>Tesorería</span>
              </div>
              <button
                className="w-full py-3 rounded font-semibold text-sm transition-all"
                style={{
                  backgroundColor: '#0a0a0a',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#D4AF37';
                  e.currentTarget.style.borderColor = '#D4AF37';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#0a0a0a';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
              >
                INGRESAR →
              </button>
            </div>

            {/* Tarjeta 2 - Punto de Venta */}
            <div
              className="p-6 rounded-lg cursor-pointer transition-all hover:scale-105"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              onClick={() => setSelectedAccess('pos')}
            >
              <div className="text-4xl mb-4">🧾</div>
              <h2 className="text-xl font-bold mb-3" style={{ color: '#ffffff' }}>
                PUNTO DE VENTA (POS)
              </h2>
              <div className="w-16 h-0.5 mb-4" style={{ backgroundColor: '#D4AF37' }}></div>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Accede al sistema de ventas rápido y seguro para tu punto de venta.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>Ventas</span>
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>Cobros</span>
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>Cortes de caja</span>
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>Tickets</span>
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>Clientes</span>
              </div>
              <button
                className="w-full py-3 rounded font-semibold text-sm transition-all"
                style={{
                  backgroundColor: '#0a0a0a',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#D4AF37';
                  e.currentTarget.style.borderColor = '#D4AF37';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#0a0a0a';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
              >
                INGRESAR →
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de login */
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setSelectedAccess(null)}
              className="mb-6 text-sm flex items-center gap-2"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              ← Volver
            </button>

            <h2 className="text-2xl font-bold mb-6" style={{ color: '#ffffff' }}>
              {selectedAccess === 'main' ? 'Sistema Principal' : 'Punto de Venta'}
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded text-sm text-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            {selectedAccess === 'main' ? (
              <>
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mb-4 w-full p-3 rounded text-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleMainLogin()}
                  className="mb-6 w-full p-3 rounded text-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
                />
                <button
                  onClick={handleMainLogin}
                  disabled={loading}
                  className="w-full py-3 rounded font-semibold text-sm transition-all"
                  style={{
                    backgroundColor: loading ? 'rgba(212,175,55,0.5)' : '#D4AF37',
                    color: '#0a0a0a',
                  }}
                >
                  {loading ? "Entrando..." : "INGRESAR →"}
                </button>
              </>
            ) : (
              <>
                {/* Display de NIP */}
                <div className="mb-8 text-center">
                  <div className="flex justify-center gap-4 mb-3">
                    {[0, 1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#D4AF37',
                        }}
                      >
                        {index < nip.length ? '●' : '○'}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Ingresa tu NIP de 4 dígitos
                  </p>
                </div>

                {/* Teclado numérico */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleNipInput(num)}
                      className="w-16 h-16 rounded-lg text-2xl font-semibold transition-all"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#ffffff',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                      }}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handleNipDelete}
                    className="w-16 h-16 rounded-lg text-2xl font-semibold transition-all"
                    style={{
                      backgroundColor: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#ef4444',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)';
                    }}
                  >
                    ⌫
                  </button>
                  <button
                    onClick={() => handleNipInput('0')}
                    className="w-16 h-16 rounded-lg text-2xl font-semibold transition-all"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#ffffff',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)';
                      e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    }}
                  >
                    0
                  </button>
                  <button
                    onClick={handleNipClear}
                    className="w-16 h-16 rounded-lg text-2xl font-semibold transition-all"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                    }}
                  >
                    C
                  </button>
                </div>

                {/* Input oculto para teclado físico */}
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
                  className="opacity-0 absolute"
                  style={{ pointerEvents: 'none' }}
                  autoFocus
                />
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-8 text-center">
          <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Alta seguridad · Respaldo en la nube · Soporte especializado
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © {new Date().getFullYear()} {config.companyName || 'Sistema de Gestión'}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}