import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import useDebounce from "../../core/hooks/useDebounce";
import CreateMovementModal from "./CreateMovementModal";
import { useCompanyStore } from "../../core/store/useCompanyStore";
import { useAuthStore } from "../../core/store/useAuthStore";

interface Movement {
  id: string;
  accountId: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  concept: string;
  amount: number;
  status: string; // APPROVED | PENDING_APPROVAL | REJECTED
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface BankAccount {
  id: string;
  name: string;
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  APPROVED: { label: "Aprobado", color: "#22C55E" },
  PENDING_APPROVAL: { label: "Pend. Aprobación", color: "#F59E0B" },
  REJECTED: { label: "Rechazado", color: "#EF4444" },
};

export default function MovementsPage() {
  const { activeBranch, activeCompany } = useCompanyStore();
  const user = useAuthStore((s) => s.user);
  const canApprove = user?.roleCode === "ADMIN" || user?.roleCode === "GERENTE";
  const [movements, setMovements] = useState<Movement[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [accountId, setAccountId] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const debouncedCategory = useDebounce(category, 400);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadMovements();
  }, [accountId, type, debouncedCategory, startDate, endDate, page, activeBranch?.id, activeCompany?.id]);

  async function loadAccounts() {
    try {
      const response = await api.get("/banks");
      setAccounts(Array.isArray(response.data) ? response.data : []);
    } catch {
      setAccounts([]);
    }
  }

  async function loadMovements() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/movements", {
        params: { accountId, type, category: debouncedCategory, startDate, endDate, page, limit },
      });
      const payload = response.data?.data ? response.data : { data: response.data, totalPages: 1 };
      setMovements(Array.isArray(payload.data) ? payload.data : []);
      setTotalPages(payload.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar movimientos");
    } finally {
      setLoading(false);
    }
  }

  function getAccountName(accountId: string): string {
    const account = accounts.find((acc) => acc.id === accountId);
    return account?.name || accountId;
  }

  function handleMovementClick(movement: Movement) {
    setSelectedMovement(movement);
    setDetailModalOpen(true);
  }

  async function handleApprove(id: string) {
    try {
      await api.put(`/movements/${id}/approve`);
      loadMovements();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al aprobar");
    }
  }

  async function handleReject(id: string) {
    const reason = prompt("Motivo del rechazo:");
    if (!reason) return;
    try {
      await api.put(`/movements/${id}/reject`, { reason });
      loadMovements();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al rechazar");
    }
  }

  return (
    <MainLayout>
      <CreateMovementModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={loadMovements} />
      {!activeCompany ? (
        <div style={{ padding: '24px', backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', color: '#8A6A3A', textAlign: 'center' }}>
          Selecciona una empresa para ver los datos
        </div>
      ) : (
        <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Movimientos</h2>
            <p className="text-slate-400">Filtros y paginacion por cuenta, tipo, fecha y categoria</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
            + Nuevo Movimiento
          </button>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <select value={accountId} onChange={(e) => { setPage(1); setAccountId(e.target.value); }} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white">
            <option value="">Todas las cuentas</option>
            {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
          <select value={type} onChange={(e) => { setPage(1); setType(e.target.value); }} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white">
            <option value="">Todos los tipos</option>
            <option value="INGRESO">INGRESO</option>
            <option value="EGRESO">EGRESO</option>
          </select>
          <input value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }} placeholder="Categoria" className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white" />
          <input type="date" value={startDate} onChange={(e) => { setPage(1); setStartDate(e.target.value); }} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white" />
          <input type="date" value={endDate} onChange={(e) => { setPage(1); setEndDate(e.target.value); }} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white" />
        </div>

        {error && <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">{error}</div>}
        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando movimientos...</div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Cuenta</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Categoría</th>
                    <th className="p-2">Concepto</th>
                    <th className="p-2">Monto</th>
                    <th className="p-2">Estado</th>
                    {canApprove && <th className="p-2">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {movements.map((item) => {
                    const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.APPROVED;
                    return (
                    <tr
                      key={item.id}
                      className="border-t border-slate-800 cursor-pointer hover:bg-slate-800/50"
                      onClick={() => handleMovementClick(item)}
                    >
                      <td className="p-2">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className="p-2">{getAccountName(item.accountId)}</td>
                      <td className="p-2">{item.type === "INCOME" ? "INGRESO" : "EGRESO"}</td>
                      <td className="p-2">{item.category}</td>
                      <td className="p-2">{item.concept}</td>
                      <td className="p-2">{Number(item.amount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td className="p-2">
                        <span style={{ background: badge.color + "22", color: badge.color, border: `1px solid ${badge.color}44`, borderRadius: 4, padding: "2px 7px", fontSize: 11, whiteSpace: "nowrap" }}>
                          {badge.label}
                        </span>
                      </td>
                      {canApprove && (
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          {item.status === "PENDING_APPROVAL" && (
                            <div className="flex gap-1">
                              <button onClick={() => handleApprove(item.id)} className="rounded bg-green-700 px-2 py-1 text-xs text-white hover:bg-green-600">Aprobar</button>
                              <button onClick={() => handleReject(item.id)} className="rounded bg-red-700 px-2 py-1 text-xs text-white hover:bg-red-600">Rechazar</button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {movements.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-800 bg-slate-800 p-4 cursor-pointer hover:bg-slate-700"
                  onClick={() => handleMovementClick(item)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-white">{item.concept}</p>
                      <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`text-sm font-bold ${item.type === "INCOME" ? "text-green-400" : "text-red-400"}`}>
                      {Number(item.amount)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p><span className="text-slate-500">Cuenta:</span> {getAccountName(item.accountId)}</p>
                    <p><span className="text-slate-500">Tipo:</span> {item.type === "INCOME" ? "INGRESO" : "EGRESO"}</p>
                    <p><span className="text-slate-500">Categoría:</span> {item.category}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-40">Anterior</button>
              <span className="text-sm text-slate-400">Pagina {page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}

        {/* Modal de detalle de movimiento */}
        {detailModalOpen && selectedMovement && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-lg rounded-t-2xl md:rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl md:h-auto h-[80vh] overflow-y-auto">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">Detalle del Movimiento</h3>
                  <p className="text-sm text-slate-400">Información completa</p>
                </div>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400">ID</p>
                  <p className="text-lg font-semibold">{selectedMovement.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Cuenta</p>
                  <p className="text-lg font-semibold">{getAccountName(selectedMovement.accountId)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Tipo</p>
                  <p className="text-lg font-semibold">{selectedMovement.type === "INCOME" ? "INGRESO" : "EGRESO"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Categoría</p>
                  <p className="text-lg font-semibold">{selectedMovement.category}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Concepto</p>
                  <p className="text-lg font-semibold">{selectedMovement.concept}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Monto</p>
                  <p className="text-lg font-semibold">{Number(selectedMovement.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Fecha de creación</p>
                  <p className="text-lg font-semibold">{new Date(selectedMovement.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </MainLayout>
  );
}
