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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  async function handleLogin() {
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
        modulosActivos
      );

      navigate("/dashboard");
    } catch (error: any) {
      console.error(error);
      setError(error.response?.data?.message || "Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  // Verificar modo de mantenimiento
  if (config.maintenanceMode) {
    const containerStyle = {
      ...(config.backgroundImage && {
        backgroundImage: `url(${config.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }),
    };

    return (
      <div
        className="login-container min-h-screen flex items-center justify-center px-4"
        style={containerStyle}
      >
        <div
          className="login-card w-full max-w-md p-8 rounded-lg text-center"
        >
          <div className="text-5xl mb-4">🔧</div>
          <h1 className="login-title text-2xl font-bold mb-4">
            Sistema en Mantenimiento
          </h1>
          <p className="text-sm">
            {config.maintenanceMessage || 'El sistema se encuentra en mantenimiento programado. Por favor, intente más tarde.'}
          </p>
          {config.maintenanceStartTime && config.maintenanceEndTime && (
            <p className="text-xs mt-4">
              {new Date(config.maintenanceStartTime).toLocaleString()} - {new Date(config.maintenanceEndTime).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  const containerStyle = {
    ...(config.backgroundImage && {
      backgroundImage: `url(${config.backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }),
  };

  return (
    <div
      className="login-container min-h-screen flex items-center justify-center px-4"
      style={containerStyle}
    >
      <div className="login-card w-full max-w-md p-8 rounded-lg">
        {/* Logo */}
        {config.logoUrl && (
          <img
            src={config.logoUrl}
            alt="Logo"
            style={{ maxHeight: '56px', marginBottom: '20px', display: 'block', margin: '0 auto 20px' }}
          />
        )}

        {/* Company Name */}
        <h1 className="login-title text-center text-3xl font-bold mb-2">
          {config.companyName}
        </h1>

        {/* Tagline */}
        <p className="text-center text-sm mb-8">
          {config.tagline}
        </p>

        {/* Error Message */}
        {error && (
          <div className="login-error mb-4 p-3 rounded text-sm text-center">
            {error}
          </div>
        )}

        {/* Email Input */}
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-input mb-4 w-full p-3 rounded text-sm"
        />

        {/* Password Input */}
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          className="login-input mb-6 w-full p-3 rounded text-sm"
        />

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className={`login-button w-full p-3 rounded font-semibold text-sm transition-colors ${loading ? 'loading' : ''}`}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}