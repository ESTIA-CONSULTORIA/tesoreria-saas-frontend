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
}

export default function CreateMovementModal({ open, onClose, onCreated }: Props) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [type, setType] = useState("INGRESO");
  const [category, setCategory] = useState("");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("0");
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
      await api.post("/movements", {
        accountId,
        type,
        category,
        concept,
        amount: Number(amount),
      });
      onCreated();
      onClose();
      setAccountId("");
      setType("INGRESO");
      setCategory("");
      setConcept("");
      setAmount("0");
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible crear el movimiento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header - flex-shrink-0 */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">Nuevo Movimiento</h3>
              <p className="text-sm text-slate-400">Registro de ingreso o egreso</p>
            </div>
            <button onClick={onClose} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700">Cerrar</button>
          </div>
        </div>

        {/* Body - flex-1 overflow-y-auto */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500">
              <option value="">Selecciona cuenta</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.bank})
                </option>
              ))}
            </select>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500">
              <option value="INGRESO">INGRESO</option>
              <option value="EGRESO">EGRESO</option>
            </select>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoria" required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500" />
            <input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Concepto" required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500" />
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto" required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500" />
            <button disabled={loading} className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {loading ? "Guardando..." : "Guardar movimiento"}
            </button>
          </form>
        </div>

        {/* Footer - flex-shrink-0 */}
        <div className="flex-shrink-0 p-4 border-t border-slate-800 text-center text-xs text-slate-500">
          ESC para cerrar
        </div>
      </div>
    </div>
  );
}
