import { useEffect, useState } from "react";
import { api } from "../../core/api/api";

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

export default function Monitoreo() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ERROR" | "WARNING" | "INFO">("ALL");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const response = await api.get("/logs?limit=50");
      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = filter === "ALL" ? logs : logs.filter((log) => log.level === filter);

  if (loading) {
    return <div className="rounded-xl bg-slate-900 p-6">Cargando datos...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Monitoreo del Sistema</h1>
        <p className="text-slate-400">Logs de actividad de todos los tenants</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-4 py-2 rounded-lg ${filter === "ALL" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter("ERROR")}
          className={`px-4 py-2 rounded-lg ${filter === "ERROR" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-300"}`}
        >
          Errores
        </button>
        <button
          onClick={() => setFilter("WARNING")}
          className={`px-4 py-2 rounded-lg ${filter === "WARNING" ? "bg-yellow-600 text-white" : "bg-slate-800 text-slate-300"}`}
        >
          Advertencias
        </button>
        <button
          onClick={() => setFilter("INFO")}
          className={`px-4 py-2 rounded-lg ${filter === "INFO" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-300"}`}
        >
          Info
        </button>
      </div>

      {/* Tabla de logs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full">
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
                  <div className="font-medium text-white">{log.tenantName}</div>
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
  );
}
