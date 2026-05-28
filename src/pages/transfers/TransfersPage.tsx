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

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadTransfers();
  }, []);

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
                <div key={transfer.id} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="text-lg font-semibold">{Number(transfer.amount)}</h3>
                  <p className="text-sm text-slate-400">
                    {transfer.fromAccountId} → {transfer.toAccountId}
                  </p>
                  <p className="text-xs text-slate-500">
                    {transfer.concept || "Sin concepto"} · {new Date(transfer.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
