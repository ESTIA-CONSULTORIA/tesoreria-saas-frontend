import { useEffect, useState } from "react";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  roleCode?: string;
  tenantId: string;
  action: string;
  entity: string;
  details?: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

interface PaginatedLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const actionTranslations: Record<string, string> = {
  CREATE: "Creó",
  UPDATE: "Actualizó",
  DELETE: "Eliminó",
  ACCESS: "Accedió",
};

export default function LogsPage() {
  const [logsData, setLogsData] = useState<PaginatedLogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterUserId, setFilterUserId] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const user = useAuthStore((state) => state.user);
  const isSoporte = user?.roleCode === "SOPORTE";

  useEffect(() => {
    loadLogs();
  }, [currentPage]);

  async function loadLogs() {
    try {
      const params = new URLSearchParams();
      if (filterUserId) params.append("userId", filterUserId);
      if (filterAction) params.append("action", filterAction);
      if (filterEntity) params.append("entity", filterEntity);
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);
      params.append("page", currentPage.toString());
      params.append("limit", "20");

      const response = await api.get(`/audit-logs?${params.toString()}`);
      setLogsData(response.data);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCSV() {
    try {
      const params = new URLSearchParams();
      if (filterUserId) params.append("userId", filterUserId);
      if (filterAction) params.append("action", filterAction);
      if (filterEntity) params.append("entity", filterEntity);
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);

      const response = await api.get(`/audit-logs/export?${params.toString()}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "audit-logs.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error exporting CSV:", error);
    }
  }

  function handleFilter() {
    setLoading(true);
    setCurrentPage(1);
    loadLogs();
  }

  function handleClearFilters() {
    setFilterUserId("");
    setFilterAction("");
    setFilterEntity("");
    setFilterStartDate("");
    setFilterEndDate("");
    setCurrentPage(1);
    setLoading(true);
    loadLogs();
  }

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage);
    setLoading(true);
  }

  function translateAction(action: string): string {
    return actionTranslations[action] || action;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Logs de Auditoría</h1>
        <p className="text-slate-400">
          {isSoporte ? "Logs de todos los tenants" : "Logs de tu tenant"}
        </p>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="text-lg font-semibold mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Usuario ID</label>
            <input
              type="text"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Acción</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
            >
              <option value="">Todas</option>
              <option value="CREATE">Crear</option>
              <option value="UPDATE">Actualizar</option>
              <option value="DELETE">Eliminar</option>
              <option value="ACCESS">Acceder</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Módulo/Entidad</label>
            <input
              type="text"
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Fecha Fin</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleFilter}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Filtrar
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600"
          >
            Limpiar
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabla de logs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Fecha</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Usuario</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Rol</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Acción</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">Módulo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-white">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-slate-400">
                  Cargando...
                </td>
              </tr>
            ) : !logsData || logsData.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-slate-400">
                  No hay logs registrados
                </td>
              </tr>
            ) : (
              logsData.data.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50">
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{log.userEmail}</div>
                    <div className="text-sm text-slate-400">{log.userId}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{log.roleCode || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      log.action === "CREATE" ? "bg-green-900/40 text-green-300" :
                      log.action === "UPDATE" ? "bg-blue-900/40 text-blue-300" :
                      log.action === "DELETE" ? "bg-red-900/40 text-red-300" :
                      "bg-slate-700/40 text-slate-300"
                    }`}>
                      {translateAction(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{log.entity}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{log.ipAddress}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {logsData && logsData.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-sm text-slate-400">
            Mostrando {((logsData.page - 1) * logsData.limit) + 1} a {Math.min(logsData.page * logsData.limit, logsData.total)} de {logsData.total} registros
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(logsData.page - 1)}
              disabled={logsData.page === 1}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-white">
              Página {logsData.page} de {logsData.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(logsData.page + 1)}
              disabled={logsData.page === logsData.totalPages}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
