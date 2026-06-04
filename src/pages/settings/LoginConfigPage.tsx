import { useState, useEffect } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { useLoginConfigStore, LoginConfig } from "../../core/store/useLoginConfigStore";
import { useAuthStore } from "../../core/store/useAuthStore";

export default function LoginConfigPage() {
  const { config, setConfig, loadConfig, saveConfig, resetConfig } = useLoginConfigStore();
  const tenantId = useAuthStore((state) => state.tenantId);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig(tenantId);
  }, [loadConfig, tenantId]);

  async function handleSave() {
    try {
      setSaving(true);
      await saveConfig(tenantId);
      alert("Configuración guardada exitosamente");
    } catch (error) {
      alert("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (confirm("¿Está seguro de restablecer la configuración a los valores predeterminados?")) {
      resetConfig();
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, field: 'backgroundImage' | 'logoUrl') {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig({ [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  }

  if (previewMode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{
        backgroundImage: config.backgroundImage ? `url(${config.backgroundImage})` : 'none',
        backgroundColor: config.backgroundImage ? 'transparent' : '#0A0A0A',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        <div 
          className="w-full max-w-md p-8 rounded-lg"
          style={{
            backgroundColor: `rgba(22, 22, 22, ${config.cardOpacity})`,
            border: '1px solid #2D2D2D',
          }}
        >
          {config.logoUrl && (
            <div className="flex justify-center mb-6">
              <img src={config.logoUrl} alt="Logo" className="h-16 object-contain" />
            </div>
          )}
          <h1 
            className="text-center text-3xl font-bold mb-2"
            style={{ color: config.textColor }}
          >
            {config.companyName}
          </h1>
          <p 
            className="text-center text-sm mb-8"
            style={{ color: '#A3A3A3' }}
          >
            {config.tagline}
          </p>
          <input
            type="email"
            placeholder="Correo electrónico"
            disabled
            className="mb-4 w-full p-3 rounded text-sm"
            style={{
              backgroundColor: '#0F0F0F',
              color: '#F5F5F5',
              border: '1px solid #2D2D2D',
              borderRadius: '4px',
            }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            disabled
            className="mb-6 w-full p-3 rounded text-sm"
            style={{
              backgroundColor: '#0F0F0F',
              color: '#F5F5F5',
              border: '1px solid #2D2D2D',
              borderRadius: '4px',
            }}
          />
          <button
            disabled
            className="w-full p-3 rounded font-semibold text-sm"
            style={{
              backgroundColor: config.primaryColor,
              color: '#0A0A0A',
              border: `1px solid ${config.primaryColor}`,
              opacity: config.buttonOpacity,
            }}
          >
            Entrar
          </button>
          <button
            onClick={() => setPreviewMode(false)}
            className="w-full mt-4 p-3 rounded font-semibold text-sm"
            style={{
              backgroundColor: '#2D2D2D',
              color: '#F5F5F5',
              border: '1px solid #2D2D2D',
            }}
          >
            Volver al Editor
          </button>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold" style={{ color: '#F5F5F5' }}>
              Configuración de Login
            </h2>
            <p style={{ color: '#A3A3A3', fontSize: '14px' }}>
              Personaliza la página de inicio de sesión
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewMode(true)}
              className="px-4 py-2 font-medium text-sm"
              style={{
                backgroundColor: '#2D2D2D',
                color: '#F5F5F5',
                borderRadius: '4px',
                border: '1px solid #2D2D2D',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D3D3D'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2D2D2D'}
            >
              📱 Vista Previa
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 font-medium text-sm"
              style={{
                backgroundColor: '#C0C0C0',
                color: '#0A0A0A',
                borderRadius: '4px',
                border: '1px solid #C0C0C0',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E8E8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C0C0C0'}
            >
              {saving ? "Guardando..." : "💾 Guardar"}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 font-medium text-sm"
              style={{
                backgroundColor: '#C53030',
                color: '#F5F5F5',
                borderRadius: '4px',
                border: '1px solid #C53030',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E53E3E'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C53030'}
            >
              🔄 Restablecer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuración Visual */}
          <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>
              Configuración Visual
            </h3>
            
            <div className="space-y-4">
              {/* Imagen de Fondo */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>
                  Imagen de Fondo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'backgroundImage')}
                  className="w-full text-sm"
                  style={{
                    backgroundColor: '#0F0F0F',
                    color: '#F5F5F5',
                    borderRadius: '4px',
                    border: '1px solid #2D2D2D',
                    padding: '8px 12px',
                  }}
                />
                {config.backgroundImage && (
                  <div className="mt-2">
                    <img 
                      src={config.backgroundImage} 
                      alt="Fondo" 
                      className="w-full h-32 object-cover rounded"
                      style={{ border: '1px solid #2D2D2D' }}
                    />
                    <button
                      onClick={() => setConfig({ backgroundImage: '' })}
                      className="mt-2 text-xs"
                      style={{ color: '#C53030' }}
                    >
                      Eliminar imagen
                    </button>
                  </div>
                )}
              </div>

              {/* Logo */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>
                  Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'logoUrl')}
                  className="w-full text-sm"
                  style={{
                    backgroundColor: '#0F0F0F',
                    color: '#F5F5F5',
                    borderRadius: '4px',
                    border: '1px solid #2D2D2D',
                    padding: '8px 12px',
                  }}
                />
                {config.logoUrl && (
                  <div className="mt-2">
                    <img 
                      src={config.logoUrl} 
                      alt="Logo" 
                      className="h-16 object-contain"
                    />
                    <button
                      onClick={() => setConfig({ logoUrl: '' })}
                      className="mt-2 text-xs"
                      style={{ color: '#C53030' }}
                    >
                      Eliminar logo
                    </button>
                  </div>
                )}
              </div>

              {/* Nombre de la Empresa */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  value={config.companyName}
                  onChange={(e) => setConfig({ companyName: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F0F0F',
                    color: '#F5F5F5',
                    borderRadius: '4px',
                    border: '1px solid #2D2D2D',
                    padding: '8px 12px',
                    fontSize: '13px',
                  }}
                />
              </div>

              {/* Eslogan */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>
                  Eslogan
                </label>
                <input
                  type="text"
                  value={config.tagline}
                  onChange={(e) => setConfig({ tagline: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F0F0F',
                    color: '#F5F5F5',
                    borderRadius: '4px',
                    border: '1px solid #2D2D2D',
                    padding: '8px 12px',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Colores y Transparencia */}
          <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>
              Colores y Transparencia
            </h3>
            
            <div className="space-y-4">
              {/* Color Primario */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>
                  Color Primario (Botones)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ primaryColor: e.target.value })}
                    style={{
                      width: '50px',
                      height: '40px',
                      borderRadius: '4px',
                      border: '1px solid #2D2D2D',
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ primaryColor: e.target.value })}
                    style={{
                      flex: 1,
                      backgroundColor: '#0F0F0F',
                      color: '#F5F5F5',
                      borderRadius: '4px',
                      border: '1px solid #2D2D2D',
                      padding: '8px 12px',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              {/* Color de Texto */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>
                  Color de Texto
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.textColor}
                    onChange={(e) => setConfig({ textColor: e.target.value })}
                    style={{
                      width: '50px',
                      height: '40px',
                      borderRadius: '4px',
                      border: '1px solid #2D2D2D',
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="text"
                    value={config.textColor}
                    onChange={(e) => setConfig({ textColor: e.target.value })}
                    style={{
                      flex: 1,
                      backgroundColor: '#0F0F0F',
                      color: '#F5F5F5',
                      borderRadius: '4px',
                      border: '1px solid #2D2D2D',
                      padding: '8px 12px',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              {/* Color de Acento */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>
                  Color de Acento
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => setConfig({ accentColor: e.target.value })}
                    style={{
                      width: '50px',
                      height: '40px',
                      borderRadius: '4px',
                      border: '1px solid #2D2D2D',
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="text"
                    value={config.accentColor}
                    onChange={(e) => setConfig({ accentColor: e.target.value })}
                    style={{
                      flex: 1,
                      backgroundColor: '#0F0F0F',
                      color: '#F5F5F5',
                      borderRadius: '4px',
                      border: '1px solid #2D2D2D',
                      padding: '8px 12px',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              {/* Transparencia de Botones */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>
                  Transparencia de Botones: {Math.round(config.buttonOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.buttonOpacity}
                  onChange={(e) => setConfig({ buttonOpacity: parseFloat(e.target.value) })}
                  style={{
                    width: '100%',
                    accentColor: config.primaryColor,
                  }}
                />
              </div>

              {/* Transparencia de Tarjeta */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>
                  Transparencia de Tarjeta: {Math.round(config.cardOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.cardOpacity}
                  onChange={(e) => setConfig({ cardOpacity: parseFloat(e.target.value) })}
                  style={{
                    width: '100%',
                    accentColor: config.primaryColor,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Modo de Mantenimiento */}
          <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>
              Modo de Mantenimiento
            </h3>
            
            <div className="space-y-4">
              {/* Activar Mantenimiento */}
              <div className="flex items-center justify-between">
                <label style={{ fontSize: '13px', color: '#F5F5F5' }}>
                  Activar Modo de Mantenimiento
                </label>
                <button
                  onClick={() => setConfig({ maintenanceMode: !config.maintenanceMode })}
                  className="px-4 py-2 rounded text-sm font-medium"
                  style={{
                    backgroundColor: config.maintenanceMode ? '#C53030' : '#2F855A',
                    color: '#F5F5F5',
                    border: `1px solid ${config.maintenanceMode ? '#C53030' : '#2F855A'}`,
                  }}
                >
                  {config.maintenanceMode ? 'ACTIVADO' : 'DESACTIVADO'}
                </button>
              </div>

              {/* Mensaje de Mantenimiento */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>
                  Mensaje de Mantenimiento
                </label>
                <textarea
                  value={config.maintenanceMessage || ''}
                  onChange={(e) => setConfig({ maintenanceMessage: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F0F0F',
                    color: '#F5F5F5',
                    borderRadius: '4px',
                    border: '1px solid #2D2D2D',
                    padding: '8px 12px',
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Fecha de Inicio */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>
                  Fecha y Hora de Inicio
                </label>
                <input
                  type="datetime-local"
                  value={config.maintenanceStartTime || ''}
                  onChange={(e) => setConfig({ maintenanceStartTime: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F0F0F',
                    color: '#F5F5F5',
                    borderRadius: '4px',
                    border: '1px solid #2D2D2D',
                    padding: '8px 12px',
                    fontSize: '13px',
                  }}
                />
              </div>

              {/* Fecha de Fin */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>
                  Fecha y Hora de Fin
                </label>
                <input
                  type="datetime-local"
                  value={config.maintenanceEndTime || ''}
                  onChange={(e) => setConfig({ maintenanceEndTime: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F0F0F',
                    color: '#F5F5F5',
                    borderRadius: '4px',
                    border: '1px solid #2D2D2D',
                    padding: '8px 12px',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* CSS Personalizado */}
          <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '16px' }}>
              CSS Personalizado
            </h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#7E7E7E', marginBottom: '6px' }}>
                Código CSS adicional (para personalizaciones avanzadas)
              </label>
              <textarea
                value={config.customCSS || ''}
                onChange={(e) => setConfig({ customCSS: e.target.value })}
                rows={8}
                placeholder=".login-container { /* tu CSS aquí */ }"
                style={{
                  width: '100%',
                  backgroundColor: '#0F0F0F',
                  color: '#F5F5F5',
                  borderRadius: '4px',
                  border: '1px solid #2D2D2D',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                }}
              />
              <p style={{ fontSize: '11px', color: '#7E7E7E', marginTop: '4px' }}>
                ⚠️ Usa con precaución. CSS inválido puede afectar la apariencia del login.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
