import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";

interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  module: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface Tenant {
  id: string;
  legalName: string;
  tradeName: string;
  taxId?: string;
  plan?: string;
  isActive: boolean;
}

interface Session {
  userId: string;
  userName?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  loginTime: string;
}

interface SystemConfig {
  maintenanceMode: boolean;
  maxUsersPerTenant: number;
  defaultRole: string;
  sessionTimeout: number;
  allowedOrigins: string[];
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
  const [activeTab, setActiveTab] = useState<"audit" | "tenants" | "sessions" | "config">("audit");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [tenantAddons, setTenantAddons] = useState<AddonSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedTenantForPlan, setSelectedTenantForPlan] = useState<Tenant | null>(null);
  const [newPlan, setNewPlan] = useState("");
  const [filters, setFilters] = useState({
    userId: "",
    module: "",
    action: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      if (activeTab === "audit") {
        const response = await api.get("/administration/audit-logs", { params: filters });
        setAuditLogs(Array.isArray(response.data) ? response.data : []);
      } else if (activeTab === "tenants") {
        const response = await api.get("/administration/tenants");
        setTenants(Array.isArray(response.data) ? response.data : []);
      } else if (activeTab === "sessions") {
        const response = await api.get("/administration/sessions");
        setSessions(Array.isArray(response.data) ? response.data : []);
      } else if (activeTab === "config") {
        const response = await api.get("/administration/config");
        setConfig(response.data);
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

  async function updateConfig(data: Partial<SystemConfig>) {
    try {
      await api.put("/administration/config", data);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible actualizar la configuración");
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
            onClick={() => setActiveTab("sessions")}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "sessions" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400"
            }`}
          >
            Sesiones Activas
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "config" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400"
            }`}
          >
            Configuración Global
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando datos...</div>
        ) : (
          <div className="space-y-6">
            {/* Logs y Auditoría */}
            {activeTab === "audit" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <input
                      value={filters.userId}
                      onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                      placeholder="ID Usuario"
                      className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    />
                    <select
                      value={filters.module}
                      onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    >
                      <option value="">Todos los módulos</option>
                      <option value="USERS">Usuarios</option>
                      <option value="ROLES">Roles</option>
                      <option value="BANKS">Bancos</option>
                      <option value="MOVEMENTS">Movimientos</option>
                      <option value="ADMINISTRATION">Administración</option>
                    </select>
                    <select
                      value={filters.action}
                      onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    >
                      <option value="">Todas las acciones</option>
                      <option value="CREATE">Crear</option>
                      <option value="UPDATE">Actualizar</option>
                      <option value="DELETE">Eliminar</option>
                      <option value="LOGIN">Login</option>
                      <option value="LOGOUT">Logout</option>
                    </select>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    />
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="p-2">Fecha</th>
                          <th className="p-2">Usuario</th>
                          <th className="p-2">Email</th>
                          <th className="p-2">Acción</th>
                          <th className="p-2">Módulo</th>
                          <th className="p-2">Entidad</th>
                          <th className="p-2">IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="border-t border-slate-800">
                            <td className="p-2">{new Date(log.createdAt).toLocaleString()}</td>
                            <td className="p-2">{log.userName || "-"}</td>
                            <td className="p-2">{log.userEmail || "-"}</td>
                            <td className="p-2">
                              <span
                                className={`rounded-full px-2 py-1 text-xs ${
                                  log.action === "CREATE"
                                    ? "bg-green-900/40 text-green-300"
                                    : log.action === "UPDATE"
                                    ? "bg-blue-900/40 text-blue-300"
                                    : log.action === "DELETE"
                                    ? "bg-red-900/40 text-red-300"
                                    : "bg-slate-700 text-slate-300"
                                }`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="p-2">{log.module}</td>
                            <td className="p-2">{log.entityId || "-"}</td>
                            <td className="p-2">{log.ipAddress || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-white">{log.userName || "Usuario"}</p>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              log.action === "CREATE"
                                ? "bg-green-900/40 text-green-300"
                                : log.action === "UPDATE"
                                ? "bg-blue-900/40 text-blue-300"
                                : log.action === "DELETE"
                                ? "bg-red-900/40 text-red-300"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {log.action}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <p><span className="text-slate-500">Fecha:</span> {new Date(log.createdAt).toLocaleString()}</p>
                          <p><span className="text-slate-500">Email:</span> {log.userEmail || "-"}</p>
                          <p><span className="text-slate-500">Módulo:</span> {log.module}</p>
                          <p><span className="text-slate-500">IP:</span> {log.ipAddress || "-"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Gestión de Tenants */}
            {activeTab === "tenants" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <h3 className="mb-3 text-lg font-semibold">Tenants del Sistema</h3>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
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

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {tenants.map((tenant) => (
                      <div key={tenant.id} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-white">{tenant.tradeName}</p>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              tenant.isActive ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                            }`}
                          >
                            {tenant.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1 mb-3">
                          <p><span className="text-slate-500">ID:</span> {tenant.id}</p>
                          <p><span className="text-slate-500">Nombre Legal:</span> {tenant.legalName}</p>
                          <p><span className="text-slate-500">RUT/NIT:</span> {tenant.taxId || "-"}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateTenant(tenant.id, { isActive: !tenant.isActive })}
                            className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                          >
                            {tenant.isActive ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTenant(tenant.id);
                              loadTenantAddons(tenant.id);
                            }}
                            className="flex-1 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                          >
                            Módulos
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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

            {/* Sesiones Activas */}
            {activeTab === "sessions" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h3 className="mb-3 text-lg font-semibold">Sesiones Activas</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">Usuario</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">IP</th>
                        <th className="p-2">User Agent</th>
                        <th className="p-2">Hora de Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session, index) => (
                        <tr key={index} className="border-t border-slate-800">
                          <td className="p-2">{session.userName || "-"}</td>
                          <td className="p-2">{session.userEmail || "-"}</td>
                          <td className="p-2">{session.ipAddress || "-"}</td>
                          <td className="p-2">{session.userAgent?.substring(0, 50) || "-"}...</td>
                          <td className="p-2">{new Date(session.loginTime).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Configuración Global */}
            {activeTab === "config" && config && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h3 className="mb-3 text-lg font-semibold">Configuración Global del Sistema</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Modo Mantenimiento</p>
                      <p className="text-xs text-slate-500">Desactiva el acceso al sistema para usuarios</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ maintenanceMode: !config.maintenanceMode })}
                      className={`rounded-lg px-4 py-2 text-sm font-medium ${
                        config.maintenanceMode ? "bg-red-600 text-white" : "bg-green-600 text-white"
                      }`}
                    >
                      {config.maintenanceMode ? "Activado" : "Desactivado"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Máximo de Usuarios por Tenant</p>
                      <p className="text-xs text-slate-500">Límite de usuarios por organización</p>
                    </div>
                    <input
                      type="number"
                      value={config.maxUsersPerTenant}
                      onChange={(e) => updateConfig({ maxUsersPerTenant: Number(e.target.value) })}
                      className="w-24 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Rol por Defecto</p>
                      <p className="text-xs text-slate-500">Rol asignado a nuevos usuarios</p>
                    </div>
                    <select
                      value={config.defaultRole}
                      onChange={(e) => updateConfig({ defaultRole: e.target.value })}
                      className="w-32 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="CAJERO">Cajero</option>
                      <option value="CONTADOR">Contador</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Timeout de Sesión (segundos)</p>
                      <p className="text-xs text-slate-500">Tiempo de inactividad antes de logout</p>
                    </div>
                    <input
                      type="number"
                      value={config.sessionTimeout}
                      onChange={(e) => updateConfig({ sessionTimeout: Number(e.target.value) })}
                      className="w-24 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    />
                  </div>
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
