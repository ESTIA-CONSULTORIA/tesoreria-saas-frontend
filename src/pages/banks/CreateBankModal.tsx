import { useState } from "react";
import { api } from "../../core/api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateBankModal({ open, onClose, onCreated }: Props) {
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bank, setBank] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [currency, setCurrency] = useState("MXN");
  const [type, setType] = useState("BANCO");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await api.post("/banks", {
        branchId,
        name,
        accountNumber,
        bank,
        initialBalance: Number(initialBalance),
        currency,
        type,
      });
      onCreated();
      onClose();
      setBranchId("");
      setName("");
      setAccountNumber("");
      setBank("");
      setInitialBalance("0");
      setCurrency("MXN");
      setType("BANCO");
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">Nueva Cuenta Bancaria</h3>
            <p className="text-sm text-slate-400">Registro de cuenta por sucursal</p>
          </div>
          <button onClick={onClose} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700">Cerrar</button>
        </div>
        {error && <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input value={branchId} onChange={(e) => setBranchId(e.target.value)} placeholder="Branch ID" required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500" />
          <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Numero de cuenta" required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500" />
          <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Banco" required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500" />
          <input type="number" step="0.01" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} placeholder="Saldo inicial" required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500" />
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500">
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500">
            <option value="EFECTIVO">EFECTIVO</option>
            <option value="BANCO">BANCO</option>
            <option value="CAJA">CAJA</option>
          </select>
          <button disabled={loading} className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? "Guardando..." : "Guardar cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
