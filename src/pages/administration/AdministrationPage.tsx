import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import LogsPage from "./LogsPage";
import ActiveSessionsPage from "./ActiveSessionsPage";
import GlobalConfigPage from "./GlobalConfigPage";

interface Tenant {
  id: string;
  legalName: string;
  tradeName: string;
  taxId?: string;
  plan?: string;
  isActive: boolean;
}

interface AddonSubscription {
  id: string;
  tenantId: string;
  moduloNombre: string;
  activoDesde: string;
  activoHasta: string;
  precio: number;
  status: string;
}

const AVAILABLE_ADDONS = [
  { key: "proveedores", label: "Proveedores" },
  { key: "compras", label: "Compras" },
  { key: "costos", label: "Costos y Producción" },
  { key: "configuracion-pos", label: "Configuración POS" },
  { key: "integraciones", label: "Integraciones" },
  { key: "rh", label: "Recursos Humanos" },
  { key: "sat-cfdi", label: "SAT CFDI" },
  { key: "white-label", label: "White Label" },
];

const PLAN_MODULES: Record<string, string[]> = {
  BASIC: ["dashboard", "empresas", "sucursales", "usuarios", "bancos", "movimientos", "transferencias", "reportes", "tesoreria", "conciliacion", "configuracion"],
  PROFESIONAL: ["dashboard", "empresas", "sucursales", "usuarios", "bancos", "movimientos", "transferencias", "proveedores", "compras", "reportes", "tesoreria", "conciliacion", "configuracion"],
  BUSINESS: ["dashboard", "empresas", "sucursales", "usuarios", "bancos", "movimientos", "transferencias", "proveedores", "compras", "costos", "reportes", "tesoreria", "conciliacion", "configuracion", "configuracion-pos"],
  ENTERPRISE: ["dashboard", "empresas", "sucursales", "usuarios", "bancos", "movimientos", "transferencias", "proveedores", "compras", "costos", "reportes", "tesoreria", "conciliacion", "configuracion", "configuracion-pos", "integraciones", "rh", "sat-cfdi", "white-label"],
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  empresas: "Empresas",
  sucursales: "Sucursales",
  usuarios: "Usuarios y Roles",
  bancos: "Bancos",
  movimientos: "Movimientos",
  transferencias: "Transferencias",
  proveedores: "Proveedores",
  compras: "Compras",
  costos: "Costos y Producción",
  reportes: "Reportes",
  tesoreria: "Tesorería",
  conciliacion: "Conciliación",
  configuracion: "Configuración",
  "configuracion-pos": "Configuración POS",
  integraciones: "Integraciones",
  rh: "Recursos Humanos",
  "sat-cfdi": "SAT CFDI",
  "white-label": "White Label",
};

export default function AdministrationPage() {
  const [activeTab, setActiveTab] = useState<"audit" | "tenants" | "sessions" | "config" | "active-sessions" | "global-config">("audit");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [tenantAddons, setTenantAddons] = useState<AddonSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedTenantForPlan, setSelectedTenantForPlan] = useState<Tenant | null>(null);
  const [newPlan, setNewPlan] = useState("");

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      if (activeTab === "tenants") {
        const response = await api.get("/administration/tenants");
        setTenants(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar los datos");
    } finally {
      setLoading(false);
    }
  }

  async function updateTenant(id: string, data: { legalName?: string; tradeName?: string; isActive?: boolean }) {
    try {
      await api.put(`/administration/tenants/${id}`, data);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible actualizar el tenant");
    }
  }

  async function loadTenantAddons(tenantId: string) {
    try {
      const response = await api.get(`/addons/tenant/${tenantId}/modules`);
      setTenantAddons(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar los módulos del tenant");
    }
  }

  async function activateAddon(tenantId: string, moduloNombre: string) {
    try {
      await api.post("/addons", {
        tenantId,
        moduloNombre,
        activoDesde: new Date().toISOString().split('T')[0],
        status: "ACTIVO",
        precio: 0,
      });
      loadTenantAddons(tenantId);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible activar el módulo");
    }
  }

  async function deactivateAddon(addonId: string, tenantId: string) {
    try {
      await api.put(`/addons/${addonId}`, { status: "CANCELADO" });
      loadTenantAddons(tenantId);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible desactivar el módulo");
    }
  }

  function handleOpenChangePlanModal(tenant: Tenant) {
    setSelectedTenantForPlan(tenant);
    setNewPlan(tenant.plan || "BASIC");
    setPlanModalOpen(true);
  }

  async function handleChangePlan() {
    if (!selectedTenantForPlan || !newPlan) return;
    try {
      await api.put(`/subscriptions/${selectedTenantForPlan.id}/plan`, { planCode: newPlan });
      setPlanModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cambiar el plan");
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Administración</h2>
          <p className="text-slate-400">Panel de control del sistema</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "audit" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400"
            }`}
          >
            Logs y Auditoría
          </button>
          <button
            onClick={() => setActiveTab("tenants")}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "tenants" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400"
            }`}
          >
            Gestión de Tenants
          </button>
          <button
            onClick={() => setActiveTab("active-sessions")}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "active-sessions" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400"
            }`}
          >
            Sesiones Activas
          </button>
          <button
            onClick={() => setActiveTab("global-config")}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "global-config" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400"
            }`}
          >
            Configuración Global
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "audit" && <LogsPage />}
        {activeTab === "active-sessions" && <ActiveSessionsPage />}
        {activeTab === "global-config" && <GlobalConfigPage />}
        {activeTab === "tenants" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-3 text-lg font-semibold">Tenants del Sistema</h3>
              {loading ? (
                <p className="text-slate-400">Cargando...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">ID</th>
                        <th className="p-2">Nombre Legal</th>
                        <th className="p-2">Nombre Comercial</th>
                        <th className="p-2">RUT/NIT</th>
                        <th className="p-2">Plan Actual</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map((tenant) => (
                        <tr key={tenant.id} className="border-t border-slate-800">
                          <td className="p-2">{tenant.id}</td>
                          <td className="p-2">{tenant.legalName}</td>
                          <td className="p-2">{tenant.tradeName}</td>
                          <td className="p-2">{tenant.taxId || "-"}</td>
                          <td className="p-2">
                            <span className="rounded-full px-2 py-1 text-xs bg-blue-900/40 text-blue-300">
                              {tenant.plan || "BASIC"}
                            </span>
                          </td>
                          <td className="p-2">
                            <span
                              className={`rounded-full px-2 py-1 text-xs ${
                                tenant.isActive ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                              }`}
                            >
                              {tenant.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => updateTenant(tenant.id, { isActive: !tenant.isActive })}
                              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 mr-2"
                            >
                              {tenant.isActive ? "Desactivar" : "Activar"}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTenant(tenant.id);
                                loadTenantAddons(tenant.id);
                              }}
                              className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 mr-2"
                            >
                              Módulos
                            </button>
                            <button
                              onClick={() => handleOpenChangePlanModal(tenant)}
                              className="rounded bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700"
                            >
                              Cambiar Plan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Módulos Add-on del Tenant Seleccionado */}
            {selectedTenant && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Módulos Adicionales - {tenants.find(t => t.id === selectedTenant)?.tradeName}</h3>
                  <button
                    onClick={() => setSelectedTenant(null)}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {AVAILABLE_ADDONS.map((addon) => {
                    const isActive = tenantAddons.some(a => a.moduloNombre === addon.key && a.status === "ACTIVO");
                    const addonSub = tenantAddons.find(a => a.moduloNombre === addon.key);
                    return (
                      <div
                        key={addon.key}
                        className={`p-4 rounded-lg border ${
                          isActive
                            ? "border-green-600 bg-green-900/20"
                            : "border-slate-700 bg-slate-800"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-white">{addon.label}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              isActive ? "bg-green-600 text-white" : "bg-slate-700 text-slate-400"
                            }`}
                          >
                            {isActive ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        {isActive && addonSub && (
                          <div className="text-xs text-slate-400 mb-2">
                            Desde: {addonSub.activoDesde}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            if (isActive && addonSub) {
                              deactivateAddon(addonSub.id, selectedTenant);
                            } else {
                              activateAddon(selectedTenant, addon.key);
                            }
                          }}
                          className={`w-full py-1 rounded text-xs font-medium ${
                            isActive
                              ? "bg-red-600 text-white hover:bg-red-700"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {isActive ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Cambiar Plan */}
        {planModalOpen && selectedTenantForPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white">Cambiar Plan</h3>
                <p className="text-sm text-slate-400">{selectedTenantForPlan.tradeName}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">Nuevo Plan</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                >
                  <option value="BASIC">BASIC</option>
                  <option value="PROFESIONAL">PROFESIONAL</option>
                  <option value="BUSINESS">BUSINESS</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>

              <div className="mb-4 p-3 rounded-lg bg-slate-800">
                <p className="text-xs text-slate-400">Plan actual: <span className="text-white font-medium">{selectedTenantForPlan.plan || "BASIC"}</span></p>
                <p className="text-xs text-slate-400">Nuevo plan: <span className="text-white font-medium">{newPlan}</span></p>
              </div>

              <div className="mb-4 p-3 rounded-lg bg-slate-800">
                <p className="text-xs text-slate-400 mb-2">Módulos incluidos en {newPlan}:</p>
                <div className="flex flex-wrap gap-2">
                  {PLAN_MODULES[newPlan]?.map((mod) => (
                    <span key={mod} className="text-xs bg-blue-900/40 text-blue-300 px-2 py-1 rounded">
                      {MODULE_LABELS[mod] || mod}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setPlanModalOpen(false)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangePlan}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Cambiar Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
