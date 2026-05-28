import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateTransferModal from "./CreateTransferModal";

interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  concept?: string;
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
      setError(err.response?.data?.message || "No fue posible cargar transferencias");
    } finally {
      setLoading(false);
    }
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
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Transferencias</h2>
            <p className="text-slate-400">Traspasos entre cuentas</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
            + Nueva Transferencia
          </button>
        </div>
        {error && <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">{error}</div>}
        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando transferencias...</div>
        ) : (
          <div className="space-y-4">
            {transfers.length === 0 ? (
              <div className="rounded-xl bg-slate-900 p-6">No existen transferencias registradas</div>
            ) : (
              transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-6 cursor-pointer hover:bg-slate-800/50"
                  onClick={() => handleTransferClick(transfer)}
                >
                  <h3 className="text-lg font-semibold">{Number(transfer.amount)}</h3>
                  <p className="text-sm text-slate-400">
                    {getAccountName(transfer.fromAccountId)} → {getAccountName(transfer.toAccountId)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {transfer.concept || "Sin concepto"} · {new Date(transfer.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal de detalle de transferencia */}
        {detailModalOpen && selectedTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">Detalle de Transferencia</h3>
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
                  <p className="text-sm text-slate-400">Cuenta Origen</p>
                  <p className="text-lg font-semibold">{getAccountName(selectedTransfer.fromAccountId)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Cuenta Destino</p>
                  <p className="text-lg font-semibold">{getAccountName(selectedTransfer.toAccountId)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Monto</p>
                  <p className="text-lg font-semibold">{Number(selectedTransfer.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Concepto</p>
                  <p className="text-lg font-semibold">{selectedTransfer.concept || "Sin concepto"}</p>
                </div>
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
