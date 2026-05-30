import { useEffect, useState } from "react";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";

interface GlobalConfig {
  systemName: string;
  defaultTimezone: string;
  defaultCurrency: 'MXN' | 'USD' | 'EUR';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  maxSimultaneousSessions: number;
}

const defaultConfig: GlobalConfig = {
  systemName: 'Tesorería SaaS',
  defaultTimezone: 'America/Mexico_City',
  defaultCurrency: 'MXN',
  dateFormat: 'DD/MM/YYYY',
  maxSimultaneousSessions: 3,
};

export default function GlobalConfigPage() {
  const [config, setConfig] = useState<GlobalConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const user = useAuthStore((state) => state.user);
  const isSoporte = user?.rol === "SOPORTE";

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      const response = await api.get('/admin/global-config');
      if (response.data) {
        setConfig(response.data);
      }
    } catch (err) {
      console.error("Error loading config:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.post('/admin/global-config', config);
      setSuccess("Configuración guardada correctamente");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  if (!isSoporte) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración Global</h1>
          <p className="text-slate-400">Configuración del sistema</p>
        </div>
        <div className="rounded-xl border border-red-700 bg-red-900/30 p-6 text-red-300">
          <p className="font-semibold">Acceso Restringido</p>
          <p className="text-sm mt-2">Esta sección solo está disponible para usuarios con rol SOPORTE.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración Global</h1>
        <p className="text-slate-400">Configuración general del sistema</p>
      </div>

      {error && <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">{error}</div>}
      {success && <div className="rounded-xl border border-green-700 bg-green-900/30 p-4 text-green-300">{success}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-400">
          Cargando configuración...
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Nombre del Sistema</label>
            <input
              type="text"
              value={config.systemName}
              onChange={(e) => setConfig({ ...config, systemName: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              placeholder="Tesorería SaaS"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Zona Horaria por Defecto</label>
            <select
              value={config.defaultTimezone}
              onChange={(e) => setConfig({ ...config, defaultTimezone: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
            >
              <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
              <option value="America/New_York">Nueva York (GMT-5)</option>
              <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
              <option value="Europe/Madrid">Madrid (GMT+1)</option>
              <option value="UTC">UTC (GMT+0)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Moneda por Defecto</label>
            <select
              value={config.defaultCurrency}
              onChange={(e) => setConfig({ ...config, defaultCurrency: e.target.value as any })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
            >
              <option value="MXN">Peso Mexicano (MXN)</option>
              <option value="USD">Dólar Estadounidense (USD)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Formato de Fecha</label>
            <select
              value={config.dateFormat}
              onChange={(e) => setConfig({ ...config, dateFormat: e.target.value as any })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (29/05/2026)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (05/29/2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (2026-05-29)</option>
            </select>
            <p className="mt-2 text-sm text-slate-400">
              Preview: {new Date().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })}
            </p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Límite de Sesiones Simultáneas por Usuario</label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.maxSimultaneousSessions}
              onChange={(e) => setConfig({ ...config, maxSimultaneousSessions: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
            />
            <p className="mt-2 text-sm text-slate-400">
              Máximo de {config.maxSimultaneousSessions} sesiones activas por usuario
            </p>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar Configuración"}
            </button>
            <button
              onClick={() => setConfig(defaultConfig)}
              className="rounded-lg bg-slate-700 px-6 py-3 font-medium text-white hover:bg-slate-600"
            >
              Restaurar Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
