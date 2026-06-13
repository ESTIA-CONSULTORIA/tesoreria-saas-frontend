import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";
import CreateTransferModal from "./CreateTransferModal";

interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  concept?: string;
  tipo?: 'INTERNA' | 'INTERCOMPAÑIA';
  status?: 'PENDIENTE' | 'AUTORIZADA' | 'RECHAZADA';
  empresaOrigenId?: string;
  empresaDestinoId?: string;
  referencia?: string;
  motivo?: string;
  createdAt: string;
}

interface BankAccount {
  id: string;
  name: string;
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTransferId, setRejectTransferId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const user = useAuthStore((state) => state.user);
  const isAdminOrSoporte = user?.roleCode === "ADMIN" || user?.roleCode === "SOPORTE";

  useEffect(() => {
    loadAccounts();
    loadTransfers();
  }, []);

  async function loadAccounts() {
    try {
      const response = await api.get("/banks");
      setAccounts(Array.isArray(response.data) ? response.data : []);
    } catch {
      setAccounts([]);
    }
  }

  async function loadTransfers() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/transfers");
      setTransfers(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar traslados de fondos");
    } finally {
      setLoading(false);
    }
  }

  async function authorizeTransfer(id: string) {
    try {
      await api.put(`/transfers/${id}/authorize`);
      loadTransfers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al autorizar traslado");
    }
  }

  function openRejectModal(id: string) {
    setRejectTransferId(id);
    setRejectReason("");
    setRejectModalOpen(true);
  }

  async function confirmReject() {
    if (!rejectTransferId || !rejectReason.trim()) return;
    try {
      await api.put(`/transfers/${rejectTransferId}/reject`, { motivo: rejectReason });
      setRejectModalOpen(false);
      setRejectTransferId(null);
      setRejectReason("");
      loadTransfers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al rechazar traslado");
    }
  }

  function cancelReject() {
    setRejectModalOpen(false);
    setRejectTransferId(null);
    setRejectReason("");
  }

  function getAccountName(accountId: string): string {
    const account = accounts.find((acc) => acc.id === accountId);
    return account?.name || accountId;
  }

  function handleTransferClick(transfer: Transfer) {
    setSelectedTransfer(transfer);
    setDetailModalOpen(true);
  }

  return (
    <MainLayout>
      <CreateTransferModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={loadTransfers} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Traslado de Fondos</h2>
            <p className="text-slate-400">Traspasos entre cuentas</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
            + Nuevo Traslado
          </button>
        </div>
        {error && <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">{error}</div>}
        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando traslados de fondos...</div>
        ) : (
          <div className="space-y-4">
            {transfers.length === 0 ? (
              <div className="rounded-xl bg-slate-900 p-6">No existen traslados de fondos registrados</div>
            ) : (
              transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-6 cursor-pointer hover:bg-slate-800/50"
                  onClick={() => handleTransferClick(transfer)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">${Number(transfer.amount).toFixed(2)}</h3>
                        {transfer.tipo && (
                          <span className={`px-2 py-1 rounded text-xs ${
                            transfer.tipo === 'INTERNA' ? 'bg-blue-900/40 text-blue-300' : 'bg-purple-900/40 text-purple-300'
                          }`}>
                            {transfer.tipo === 'INTERNA' ? 'Traslado Interno' : 'Traslado Intercompañía'}
                          </span>
                        )}
                        {transfer.status && (
                          <span className={`px-2 py-1 rounded text-xs ${
                            transfer.status === 'AUTORIZADA' ? 'bg-green-900/40 text-green-300' :
                            transfer.status === 'RECHAZADA' ? 'bg-red-900/40 text-red-300' :
                            'bg-yellow-900/40 text-yellow-300'
                          }`}>
                            {transfer.status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400">
                        {getAccountName(transfer.fromAccountId)} → {getAccountName(transfer.toAccountId)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {transfer.concept || "Sin concepto"} · {new Date(transfer.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {isAdminOrSoporte && transfer.status === 'PENDIENTE' && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); authorizeTransfer(transfer.id); }}
                          className="px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                        >
                          Autorizar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openRejectModal(transfer.id); }}
                          className="px-3 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal de rechazo */}
        {rejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white">Rechazar Traslado</h3>
                <p className="text-sm text-slate-400">Por favor, ingrese el motivo del rechazo</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Motivo del rechazo</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Describa el motivo..."
                    rows={4}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={cancelReject}
                    className="px-4 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmReject}
                    disabled={!rejectReason.trim()}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Rechazo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de detalle de traslado */}
        {detailModalOpen && selectedTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">Detalle de Traslado</h3>
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
                  <p className="text-lg font-semibold">{selectedTransfer.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Tipo</p>
                  <p className="text-lg font-semibold">{selectedTransfer.tipo || 'INTERNA'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <p className="text-lg font-semibold">{selectedTransfer.status || 'AUTORIZADA'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Cuenta Origen</p>
                  <p className="text-lg font-semibold">{getAccountName(selectedTransfer.fromAccountId)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Cuenta Destino</p>
                  <p className="text-lg font-semibold">{getAccountName(selectedTransfer.toAccountId)}</p>
                </div>
                {selectedTransfer.empresaOrigenId && (
                  <div>
                    <p className="text-sm text-slate-400">Empresa Origen</p>
                    <p className="text-lg font-semibold">{selectedTransfer.empresaOrigenId}</p>
                  </div>
                )}
                {selectedTransfer.empresaDestinoId && (
                  <div>
                    <p className="text-sm text-slate-400">Empresa Destino</p>
                    <p className="text-lg font-semibold">{selectedTransfer.empresaDestinoId}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-400">Monto</p>
                  <p className="text-lg font-semibold">${Number(selectedTransfer.amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Concepto</p>
                  <p className="text-lg font-semibold">{selectedTransfer.concept || "Sin concepto"}</p>
                </div>
                {selectedTransfer.referencia && (
                  <div>
                    <p className="text-sm text-slate-400">Referencia</p>
                    <p className="text-lg font-semibold">{selectedTransfer.referencia}</p>
                  </div>
                )}
                {selectedTransfer.motivo && (
                  <div>
                    <p className="text-sm text-slate-400">Motivo</p>
                    <p className="text-lg font-semibold">{selectedTransfer.motivo}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-400">Fecha de creación</p>
                  <p className="text-lg font-semibold">{new Date(selectedTransfer.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
