import { useEffect, useState } from "react";
import { api } from "../../core/api/api";

interface Tenant {
  id: string;
  name: string;
  plan: string;
  status: string;
  createdAt: string;
  modulosActivos: string[];
}

export default function GestionClientes() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  async function handleImpersonate(tenantId: string) {
    try {
      await api.post(`/tenants/${tenantId}/impersonate`);
      window.location.reload();
    } catch (error) {
      console.error("Error impersonating tenant:", error);
    }
  }

  async function handleChangePlan(tenantId: string, newPlan: string) {
    try {
      await api.put(`/tenants/${tenantId}/plan`, { plan: newPlan });
      loadTenants();
      setModalOpen(false);
    } catch (error) {
      console.error("Error changing plan:", error);
    }
  }

  if (loading) {
    return <div className="rounded-xl bg-slate-900 p-6">Cargando datos...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
        <p className="text-slate-400">Administra todos los tenants del sistema</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Tenant</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Plan</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Estado</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Módulos</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Fecha Registro</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-slate-800/50">
                <td className="px-6 py-4">
                  <div className="font-medium text-white">{tenant.name}</div>
                  <div className="text-sm text-slate-400">{tenant.id}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    tenant.plan === "ENTERPRISE" ? "bg-purple-900/40 text-purple-300" :
                    tenant.plan === "BUSINESS" ? "bg-blue-900/40 text-blue-300" :
                    tenant.plan === "PRO" ? "bg-green-900/40 text-green-300" :
                    "bg-slate-700 text-slate-300"
                  }`}>
                    {tenant.plan}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    tenant.status === "ACTIVE" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                  }`}>
                    {tenant.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-300">
                    {tenant.modulosActivos?.length || 0} módulos activos
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTenant(tenant)}
                      className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                    >
                      Cambiar Plan
                    </button>
                    <button
                      onClick={() => handleImpersonate(tenant.id)}
                      className="px-3 py-1 rounded bg-purple-600 text-white text-sm hover:bg-purple-700"
                    >
                      Impersonar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal cambiar plan */}
      {modalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex-shrink-0 p-6 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">Cambiar Plan</h3>
                  <p className="text-sm text-slate-400">{selectedTenant.name}</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {["BASIC", "PRO", "BUSINESS", "ENTERPRISE"].map((plan) => (
                  <button
                    key={plan}
                    onClick={() => handleChangePlan(selectedTenant.id, plan)}
                    className={`w-full p-4 rounded-lg border text-left ${
                      selectedTenant.plan === plan
                        ? "border-blue-500 bg-blue-900/20"
                        : "border-slate-700 bg-slate-800 hover:bg-slate-700"
                    }`}
                  >
                    <div className="font-semibold text-white">{plan}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 p-4 border-t border-slate-800 text-center text-xs text-slate-500">
              ESC para cerrar
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
