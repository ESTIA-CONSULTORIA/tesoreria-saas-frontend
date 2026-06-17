import { useState, useEffect } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import { useBrandingStore } from "../../core/store/useBrandingStore";

interface AppearanceSettings {
  // Identidad
  systemName: string;
  logoUrl: string;
  faviconUrl: string;
  backgroundImage: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  // Tipografía
  fontFamily: 'Inter' | 'Roboto' | 'Poppins' | 'Montserrat';
  fontSize: number;
  // Sidebar
  sidebarBgColor: string;
  sidebarTextColor: string;
  sidebarActiveColor: string;
  sidebarStyle: 'compact' | 'normal' | 'expanded';
  // Botones y controles
  primaryButtonColor: string;
  secondaryButtonColor: string;
  buttonBorderRadius: 'square' | 'rounded' | 'pill';
}

const defaultSettings: AppearanceSettings = {
  systemName: '',
  logoUrl: '',
  faviconUrl: '',
  backgroundImage: '',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  accentColor: '#0ea5e9',
  fontFamily: 'Inter',
  fontSize: 16,
  sidebarBgColor: '#0f172a',
  sidebarTextColor: '#e2e8f0',
  sidebarActiveColor: '#2563eb',
  sidebarStyle: 'normal',
  primaryButtonColor: '#2563eb',
  secondaryButtonColor: '#64748b',
  buttonBorderRadius: 'rounded',
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'identidad' | 'tipografia' | 'sidebar' | 'botones'>('identidad');
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const updateBranding = useBrandingStore((s) => s.update);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    applyCSSVariables(settings);
  }, [settings]);

  async function loadSettings() {
    try {
      const tenantId = localStorage.getItem("tenant_id") || "test-tenant";
      const response = await api.get(`/tenant-settings/${tenantId}`);
      if (response.data) {
        setSettings({
          systemName: response.data.name || '',
          logoUrl: response.data.logoUrl || '',
          faviconUrl: response.data.faviconUrl || '',
          backgroundImage: response.data.backgroundImage || '',
          primaryColor: response.data.primaryColor || '#2563eb',
          secondaryColor: response.data.secondaryColor || '#64748b',
          accentColor: response.data.accentColor || '#0ea5e9',
          fontFamily: response.data.fontFamily || 'Inter',
          fontSize: response.data.fontSize || 16,
          sidebarBgColor: response.data.sidebarColor || '#0f172a',
          sidebarTextColor: response.data.sidebarTextColor || '#e2e8f0',
          sidebarActiveColor: response.data.sidebarActiveColor || '#2563eb',
          sidebarStyle: response.data.sidebarStyle || 'normal',
          primaryButtonColor: response.data.primaryButtonColor || '#2563eb',
          secondaryButtonColor: response.data.secondaryButtonColor || '#64748b',
          buttonBorderRadius: response.data.buttonBorderRadius || 'rounded',
        });
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  }

  function applyCSSVariables(s: AppearanceSettings) {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', s.primaryColor);
    root.style.setProperty('--color-secondary', s.secondaryColor);
    root.style.setProperty('--color-accent', s.accentColor);
    root.style.setProperty('--font-family', s.fontFamily);
    root.style.setProperty('--font-size-base', `${s.fontSize}px`);
    root.style.setProperty('--sidebar-bg', s.sidebarBgColor);
    root.style.setProperty('--sidebar-text', s.sidebarTextColor);
    root.style.setProperty('--sidebar-active', s.sidebarActiveColor);
    root.style.setProperty('--button-primary', s.primaryButtonColor);
    root.style.setProperty('--button-secondary', s.secondaryButtonColor);
    
    const borderRadius = s.buttonBorderRadius === 'square' ? '0' : 
                        s.buttonBorderRadius === 'rounded' ? '0.375rem' : '9999px';
    root.style.setProperty('--btn-radius', borderRadius);
  }

  async function saveSettings() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const tenantId = localStorage.getItem("tenant_id") || "test-tenant";
      await api.put(`/tenant-settings/${tenantId}`, {
        name: settings.systemName,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
        backgroundImage: settings.backgroundImage,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        sidebarColor: settings.sidebarBgColor,
        sidebarTextColor: settings.sidebarTextColor,
        sidebarActiveColor: settings.sidebarActiveColor,
        sidebarStyle: settings.sidebarStyle,
        primaryButtonColor: settings.primaryButtonColor,
        secondaryButtonColor: settings.secondaryButtonColor,
        buttonBorderRadius: settings.buttonBorderRadius,
      });

      updateBranding(settings.systemName, settings.logoUrl, settings.accentColor, settings.backgroundImage);
      // Re-fetch from server so MainLayout picks up the latest logo/name
      await useBrandingStore.getState().load();
      setSuccess("Configuración guardada correctamente");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar la configuración");
    } finally {
      setLoading(false);
    }
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSettings((s) => ({ ...s, logoUrl: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function handleBackgroundFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSettings((s) => ({ ...s, backgroundImage: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function restoreDefaults() {
    setSettings(defaultSettings);
    setSuccess("Valores por defecto restaurados (recuerda guardar)");
    setTimeout(() => setSuccess(""), 3000);
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Configuración</h2>
            <p className="text-slate-400">Personaliza la apariencia del sistema</p>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">{error}</div>}
        {success && <div className="rounded-xl border border-green-700 bg-green-900/30 p-4 text-green-300">{success}</div>}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('identidad')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'identidad' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'
            }`}
          >
            Identidad
          </button>
          <button
            onClick={() => setActiveTab('tipografia')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'tipografia' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'
            }`}
          >
            Tipografía
          </button>
          <button
            onClick={() => setActiveTab('sidebar')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'sidebar' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'
            }`}
          >
            Sidebar
          </button>
          <button
            onClick={() => setActiveTab('botones')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'botones' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'
            }`}
          >
            Botones y Controles
          </button>
        </div>

        {/* Tab Content */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          {activeTab === 'identidad' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Nombre del sistema</label>
                <input
                  value={settings.systemName}
                  onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                  placeholder="Mi Empresa SaaS"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Logo del sistema</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFile}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 outline-none focus:border-blue-500 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-1 file:text-sm file:text-slate-200"
                />
                {settings.logoUrl && (
                  <div className="mt-2">
                    <img src={settings.logoUrl} alt="Logo preview" className="h-12 rounded" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">URL del Favicon</label>
                <input
                  value={settings.faviconUrl}
                  onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                  placeholder="https://example.com/favicon.ico"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Imagen de fondo del sistema</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleBackgroundFile}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 outline-none focus:border-blue-500 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-1 file:text-sm file:text-slate-200"
                />
                {settings.backgroundImage && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={settings.backgroundImage}
                      alt="Fondo preview"
                      className="h-16 w-28 rounded object-cover border border-slate-700"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, backgroundImage: '' })}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Quitar fondo
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Color Primario</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="h-10 w-12 rounded border border-slate-700 bg-slate-800 p-1"
                    />
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Color Secundario</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="h-10 w-12 rounded border border-slate-700 bg-slate-800 p-1"
                    />
                    <input
                      type="text"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Color de Acento</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      className="h-10 w-12 rounded border border-slate-700 bg-slate-800 p-1"
                    />
                    <input
                      type="text"
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tipografia' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Fuente Principal</label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Montserrat">Montserrat</option>
                </select>
                <p className="mt-2 text-sm text-slate-400" style={{ fontFamily: settings.fontFamily }}>
                  Preview: El rápido zorro marrón salta sobre el perro perezoso
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Tamaño Base (px)</label>
                <input
                  type="number"
                  min="12"
                  max="24"
                  value={settings.fontSize}
                  onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-sm text-slate-400" style={{ fontSize: `${settings.fontSize}px` }}>
                  Preview: Este texto tiene el tamaño seleccionado
                </p>
              </div>
            </div>
          )}

          {activeTab === 'sidebar' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Color de Fondo</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.sidebarBgColor}
                      onChange={(e) => setSettings({ ...settings, sidebarBgColor: e.target.value })}
                      className="h-10 w-12 rounded border border-slate-700 bg-slate-800 p-1"
                    />
                    <input
                      type="text"
                      value={settings.sidebarBgColor}
                      onChange={(e) => setSettings({ ...settings, sidebarBgColor: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Color de Texto</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.sidebarTextColor}
                      onChange={(e) => setSettings({ ...settings, sidebarTextColor: e.target.value })}
                      className="h-10 w-12 rounded border border-slate-700 bg-slate-800 p-1"
                    />
                    <input
                      type="text"
                      value={settings.sidebarTextColor}
                      onChange={(e) => setSettings({ ...settings, sidebarTextColor: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Color Activo</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.sidebarActiveColor}
                      onChange={(e) => setSettings({ ...settings, sidebarActiveColor: e.target.value })}
                      className="h-10 w-12 rounded border border-slate-700 bg-slate-800 p-1"
                    />
                    <input
                      type="text"
                      value={settings.sidebarActiveColor}
                      onChange={(e) => setSettings({ ...settings, sidebarActiveColor: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Estilo del Sidebar</label>
                <div className="flex gap-2">
                  {[
                    { value: 'compact', label: 'Compacto' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'expanded', label: 'Expandido' },
                  ].map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setSettings({ ...settings, sidebarStyle: style.value as any })}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        settings.sidebarStyle === style.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'botones' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Color Botón Primario</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.primaryButtonColor}
                      onChange={(e) => setSettings({ ...settings, primaryButtonColor: e.target.value })}
                      className="h-10 w-12 rounded border border-slate-700 bg-slate-800 p-1"
                    />
                    <input
                      type="text"
                      value={settings.primaryButtonColor}
                      onChange={(e) => setSettings({ ...settings, primaryButtonColor: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Color Botón Secundario</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.secondaryButtonColor}
                      onChange={(e) => setSettings({ ...settings, secondaryButtonColor: e.target.value })}
                      className="h-10 w-12 rounded border border-slate-700 bg-slate-800 p-1"
                    />
                    <input
                      type="text"
                      value={settings.secondaryButtonColor}
                      onChange={(e) => setSettings({ ...settings, secondaryButtonColor: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Bordes de Botones</label>
                <div className="flex gap-2">
                  {[
                    { value: 'square', label: 'Cuadrado' },
                    { value: 'rounded', label: 'Redondeado' },
                    { value: 'pill', label: 'Pill' },
                  ].map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setSettings({ ...settings, buttonBorderRadius: style.value as any })}
                      className={`flex-1 py-2 font-medium transition-colors ${
                        settings.buttonBorderRadius === style.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                      style={{
                        borderRadius: style.value === 'square' ? '0' : 
                                   style.value === 'rounded' ? '8px' : '9999px'
                      }}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  className="px-6 py-3 text-white font-medium"
                  style={{
                    backgroundColor: settings.primaryButtonColor,
                    borderRadius: settings.buttonBorderRadius === 'square' ? '0' : 
                               settings.buttonBorderRadius === 'rounded' ? '8px' : '9999px'
                  }}
                >
                  Botón Primario
                </button>
                <button
                  className="px-6 py-3 text-white font-medium"
                  style={{
                    backgroundColor: settings.secondaryButtonColor,
                    borderRadius: settings.buttonBorderRadius === 'square' ? '0' : 
                               settings.buttonBorderRadius === 'rounded' ? '8px' : '9999px'
                  }}
                >
                  Botón Secundario
                </button>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-4 pt-6 border-t border-slate-800">
            <button
              onClick={saveSettings}
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Guardar Configuración"}
            </button>
            <button
              onClick={restoreDefaults}
              className="rounded-lg bg-slate-700 px-6 py-3 font-medium text-white hover:bg-slate-600"
            >
              Restaurar Defaults
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
