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

export default function AdministrationPage() {
  const [activeTab, setActiveTab] = useState<"audit" | "tenants" | "sessions" | "config">("audit");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
        <div className="flex gap-2 border-b border-slate-800">
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
                  <div className="overflow-x-auto">
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
                </div>
              </div>
            )}

            {/* Gestión de Tenants */}
            {activeTab === "tenants" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h3 className="mb-3 text-lg font-semibold">Tenants del Sistema</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">ID</th>
                        <th className="p-2">Nombre Legal</th>
                        <th className="p-2">Nombre Comercial</th>
                        <th className="p-2">RUT/NIT</th>
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
                              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                            >
                              {tenant.isActive ? "Desactivar" : "Activar"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
      </div>
    </MainLayout>
  );
}
