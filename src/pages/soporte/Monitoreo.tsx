import { useEffect, useState } from "react";
import { api } from "../../core/api/api";
import MainLayout from "../../core/layout/MainLayout";

interface LogEntry {
  id: string;
  tenantId: string;
  tenantName: string;
  action: string;
  userId: string;
  userEmail: string;
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR";
}

interface Tenant {
  id: string;
  tradeName: string;
  legalName: string;
  isActive: boolean;
  plan: string;
}

interface Session {
  userId: string;
  userName: string;
  userEmail: string;
  tenantId: string;
  lastActivity: string;
}

interface SystemStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  todayMovements: number;
  recentErrors: number;
}

export default function Monitoreo() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ERROR" | "WARNING" | "INFO">("ALL");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [tenantsRes, sessionsRes, logsRes] = await Promise.all([
        api.get("/administration/tenants"),
        api.get("/administration/sessions"),
        api.get("/administration/audit-logs?limit=50"),
      ]);
      setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : []);
      setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
      setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  const stats: SystemStats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter((t) => t.isActive).length,
    totalUsers: sessions.length,
    todayMovements: logs.filter((l) => l.action === "MOVEMENT_CREATE").length,
    recentErrors: logs.filter((l) => l.level === "ERROR").length,
  };

  const filteredLogs = filter === "ALL" ? logs : logs.filter((log) => log.level === filter);

  if (loading) {
    return (
      <MainLayout>
        <div className="rounded-xl bg-slate-900 p-6">Cargando datos...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Monitoreo del Sistema</h1>
          <p className="text-slate-400">Estadísticas generales y actividad del sistema</p>
        </div>

        {/* Estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-2 text-sm text-slate-400">Total Tenants</h3>
            <p className="text-3xl font-bold text-white">{stats.totalTenants}</p>
            <p className="text-xs text-green-400 mt-1">{stats.activeTenants} activos</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-2 text-sm text-slate-400">Total Usuarios</h3>
            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
            <p className="text-xs text-slate-400 mt-1">Sesiones activas</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-2 text-sm text-slate-400">Movimientos Hoy</h3>
            <p className="text-3xl font-bold text-blue-400">{stats.todayMovements}</p>
            <p className="text-xs text-slate-400 mt-1">Registrados hoy</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-2 text-sm text-slate-400">Errores Recientes</h3>
            <p className={`text-3xl font-bold ${stats.recentErrors > 0 ? "text-red-400" : "text-green-400"}`}>
              {stats.recentErrors}
            </p>
            <p className="text-xs text-slate-400 mt-1">Últimos 50 logs</p>
          </div>
        </div>

        {/* Alertas del sistema */}
        {stats.recentErrors > 0 && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 p-6">
            <h3 className="mb-4 text-lg font-semibold text-red-300">⚠️ Alertas del Sistema</h3>
            <div className="space-y-2">
              {logs.filter((l) => l.level === "ERROR").slice(0, 5).map((log) => (
                <div key={log.id} className="p-3 rounded-lg bg-red-900/50 border border-red-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-white">{log.action}</p>
                      <p className="text-sm text-red-300">{log.userEmail} - {log.tenantName}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de tenants con último acceso */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-4 text-lg font-semibold">Último Acceso por Tenant</h3>
          <div className="space-y-2">
            {sessions.slice(0, 10).map((session) => (
              <div key={session.userId} className="flex justify-between items-center p-3 rounded-lg bg-slate-800">
                <div>
                  <p className="font-medium text-white">{session.userName}</p>
                  <p className="text-sm text-slate-400">{session.userEmail}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-300">Tenant: {session.tenantId}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(session.lastActivity).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-slate-400 text-center py-4">No hay sesiones activas</p>
            )}
          </div>
        </div>

        {/* Filtros de logs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-4 py-2 rounded-lg ${filter === "ALL" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}`}
          >
            Todos ({logs.length})
          </button>
          <button
            onClick={() => setFilter("ERROR")}
            className={`px-4 py-2 rounded-lg ${filter === "ERROR" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-300"}`}
          >
            Errores ({logs.filter((l) => l.level === "ERROR").length})
          </button>
          <button
            onClick={() => setFilter("WARNING")}
            className={`px-4 py-2 rounded-lg ${filter === "WARNING" ? "bg-yellow-600 text-white" : "bg-slate-800 text-slate-300"}`}
          >
            Advertencias ({logs.filter((l) => l.level === "WARNING").length})
          </button>
          <button
            onClick={() => setFilter("INFO")}
            className={`px-4 py-2 rounded-lg ${filter === "INFO" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-300"}`}
          >
            Info ({logs.filter((l) => l.level === "INFO").length})
          </button>
        </div>

        {/* Tabla de logs */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Timestamp</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Nivel</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Tenant</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Usuario</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50">
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      log.level === "ERROR" ? "bg-red-900/40 text-red-300" :
                      log.level === "WARNING" ? "bg-yellow-900/40 text-yellow-300" :
                      "bg-green-900/40 text-green-300"
                    }`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{log.tenantName || "N/A"}</div>
                    <div className="text-sm text-slate-400">{log.tenantId}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{log.userEmail}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div className="p-6 text-center text-slate-400">No hay logs registrados</div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
