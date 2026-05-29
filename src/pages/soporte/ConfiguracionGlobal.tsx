import { useEffect, useState } from "react";
import { api } from "../../core/api/api";

interface SystemConfig {
  maintenanceMode: boolean;
  maxTenants: number;
  defaultPlan: string;
  enableRegistration: boolean;
  supportEmail: string;
  systemName: string;
}

export default function ConfiguracionGlobal() {
  const [config, setConfig] = useState<SystemConfig>({
    maintenanceMode: false,
    maxTenants: 100,
    defaultPlan: "BASIC",
    enableRegistration: true,
    supportEmail: "support@estia.com",
    systemName: "Tesorería SaaS",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const response = await api.get("/system/config");
      if (response.data) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error("Error loading config:", error);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      await api.put("/system/config", config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving config:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración Global</h1>
        <p className="text-slate-400">Parámetros del sistema</p>
      </div>

      {saved && (
        <div className="rounded-xl border border-green-700 bg-green-900/30 p-4 text-green-300">
          Configuración guardada exitosamente
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-xl font-semibold mb-4">Configuración General</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nombre del Sistema</label>
              <input
                type="text"
                value={config.systemName}
                onChange={(e) => setConfig({ ...config, systemName: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email de Soporte</label>
              <input
                type="email"
                value={config.supportEmail}
                onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-xl font-semibold mb-4">Configuración de Tenants</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Máximo de Tenants</label>
              <input
                type="number"
                value={config.maxTenants}
                onChange={(e) => setConfig({ ...config, maxTenants: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Plan por Defecto</label>
              <select
                value={config.defaultPlan}
                onChange={(e) => setConfig({ ...config, defaultPlan: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              >
                <option value="BASIC">BASIC</option>
                <option value="PRO">PRO</option>
                <option value="BUSINESS">BUSINESS</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableRegistration"
                checked={config.enableRegistration}
                onChange={(e) => setConfig({ ...config, enableRegistration: e.target.checked })}
                className="rounded border-slate-700 bg-slate-800"
              />
              <label htmlFor="enableRegistration" className="text-sm text-slate-400">
                Habilitar registro de nuevos tenants
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-xl font-semibold mb-4">Mantenimiento</h3>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="maintenanceMode"
              checked={config.maintenanceMode}
              onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
              className="rounded border-slate-700 bg-slate-800"
            />
            <label htmlFor="maintenanceMode" className="text-sm text-slate-400">
              Modo de mantenimiento (bloquea acceso a todos los tenants)
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar Configuración"}
        </button>
      </form>
    </div>
  );
}
