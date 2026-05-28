import { useEffect, useState } from "react";
import { api } from "../../core/api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface BankAccount {
  id: string;
  name: string;
  bank: string;
  balance: number;
}

export default function CreateTransferModal({ open, onClose, onCreated }: Props) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("0");
  const [concept, setConcept] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) loadAccounts();
  }, [open]);

  async function loadAccounts() {
    try {
      const response = await api.get("/banks");
      setAccounts(Array.isArray(response.data) ? response.data : []);
    } catch {
      setAccounts([]);
    }
  }

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await api.post("/transfers", {
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        concept,
      });
      onCreated();
      onClose();
      setFromAccountId("");
      setToAccountId("");
      setAmount("0");
      setConcept("");
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible realizar la transferencia");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">Nueva Transferencia</h3>
            <p className="text-sm text-slate-400">Valida saldo suficiente en cuenta origen</p>
          </div>
          <button onClick={onClose} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700">Cerrar</button>
        </div>
        {error && <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white">
            <option value="">Cuenta origen</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.name} ({acc.bank}) - Saldo {Number(acc.balance)}</option>
            ))}
          </select>
          <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white">
            <option value="">Cuenta destino</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.name} ({acc.bank})</option>
            ))}
          </select>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto" required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white" />
          <input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Concepto" className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white" />
          <button disabled={loading} className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? "Procesando..." : "Transferir"}
          </button>
        </form>
      </div>
    </div>
  );
}
