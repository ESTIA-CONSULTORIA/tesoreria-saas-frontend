import { useEffect, useState } from "react";
import { api } from "../../core/api/api";

interface Tenant {
  id: string;
  name: string;
  plan: string;
  status: string;
  createdAt: string;
}

export default function SoporteDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    try {
      const response = await api.get("/tenants");
      setTenants(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error loading tenants:", error);
    } finally {
      setLoading(false);
    }
  }

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "ACTIVE").length;
  const tenantsByPlan = tenants.reduce((acc, tenant) => {
    acc[tenant.plan] = (acc[tenant.plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const recentTenants = [...tenants]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Soporte</h1>
        <p className="text-slate-400">Vista general del sistema de tenants</p>
      </div>

      {loading ? (
        <div className="rounded-xl bg-slate-900 p-6">Cargando datos...</div>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="text-sm text-slate-400">Total Tenants</div>
              <div className="text-3xl font-bold text-white mt-2">{totalTenants}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="text-sm text-slate-400">Tenants Activos</div>
              <div className="text-3xl font-bold text-green-400 mt-2">{activeTenants}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="text-sm text-slate-400">Plan BASIC</div>
              <div className="text-3xl font-bold text-blue-400 mt-2">{tenantsByPlan["BASIC"] || 0}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="text-sm text-slate-400">Plan PRO</div>
              <div className="text-3xl font-bold text-purple-400 mt-2">{tenantsByPlan["PRO"] || 0}</div>
            </div>
          </div>

          {/* Tenants por plan */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-xl font-semibold mb-4">Tenants por Plan</h3>
            <div className="space-y-3">
              {Object.entries(tenantsByPlan).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <span className="text-slate-300">{plan}</span>
                  <span className="font-semibold text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Últimos tenants */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-xl font-semibold mb-4">Últimos Tenants Registrados</h3>
            {recentTenants.length === 0 ? (
              <p className="text-slate-400">No hay tenants registrados</p>
            ) : (
              <div className="space-y-3">
                {recentTenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800">
                    <div>
                      <div className="font-medium text-white">{tenant.name}</div>
                      <div className="text-sm text-slate-400">{tenant.plan}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      tenant.status === "ACTIVE" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                    }`}>
                      {tenant.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alertas del sistema */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-xl font-semibold mb-4">Alertas del Sistema</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-900/20 border border-yellow-700">
                <span className="text-yellow-400">⚠️</span>
                <span className="text-yellow-200">3 tenants con pagos pendientes</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-900/20 border border-blue-700">
                <span className="text-blue-400">ℹ️</span>
                <span className="text-blue-200">5 nuevos tenants registrados esta semana</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
