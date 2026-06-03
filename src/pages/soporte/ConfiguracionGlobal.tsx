import { useEffect, useState } from "react";
import { api } from "../../core/api/api";
import MainLayout from "../../core/layout/MainLayout";

interface GlobalConfig {
  nombreSistema: string;
  zonaHoraria: string;
  monedaDefault: string;
  formatoFecha: string;
  limiteSessiones: number;
}

export default function ConfiguracionGlobal() {
  const [config, setConfig] = useState<GlobalConfig>({
    nombreSistema: "ESTIA Financial Suite",
    zonaHoraria: "America/Mexico_City",
    monedaDefault: "MXN",
    formatoFecha: "DD/MM/YYYY",
    limiteSessiones: 3,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const response = await api.get("/administration/global-config");
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
      await api.put("/administration/global-config", config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving config:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración Global</h1>
          <p className="text-slate-400">Parámetros globales del sistema</p>
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
                  value={config.nombreSistema}
                  onChange={(e) => setConfig({ ...config, nombreSistema: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Zona Horaria</label>
                <select
                  value={config.zonaHoraria}
                  onChange={(e) => setConfig({ ...config, zonaHoraria: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="America/Mexico_City">America/Mexico_City</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Europe/Madrid">Europe/Madrid</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Moneda por Defecto</label>
                <select
                  value={config.monedaDefault}
                  onChange={(e) => setConfig({ ...config, monedaDefault: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="MXN">MXN - Peso Mexicano</option>
                  <option value="USD">USD - Dólar Americano</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="COP">COP - Peso Colombiano</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Formato de Fecha</label>
                <select
                  value={config.formatoFecha}
                  onChange={(e) => setConfig({ ...config, formatoFecha: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Límite de Sesiones por Usuario</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.limiteSessiones}
                  onChange={(e) => setConfig({ ...config, limiteSessiones: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                />
              </div>
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
    </MainLayout>
  );
}
