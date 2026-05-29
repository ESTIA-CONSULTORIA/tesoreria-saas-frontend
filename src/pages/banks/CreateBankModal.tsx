import { useState, useEffect } from "react";
import { api } from "../../core/api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

export default function CreateBankModal({ open, onClose, onCreated }: Props) {
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bank, setBank] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [currency, setCurrency] = useState("MXN");
  const [type, setType] = useState("BANCO");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      loadBranches();
    }
  }, [open]);

  async function loadBranches() {
    try {
      const response = await api.get("/branches");
      setBranches(Array.isArray(response.data) ? response.data : []);
    } catch {
      setBranches([]);
    }
  }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header - flex-shrink-0 */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">Nueva Cuenta Bancaria</h3>
              <p className="text-sm text-slate-400">Registro de cuenta por sucursal</p>
            </div>
            <button onClick={onClose} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700">Cerrar</button>
          </div>
        </div>

        {/* Body - flex-1 overflow-y-auto */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
            >
              <option value="">Seleccionar sucursal</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code})
                </option>
              ))}
            </select>
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

        {/* Footer - flex-shrink-0 */}
        <div className="flex-shrink-0 p-4 border-t border-slate-800 text-center text-xs text-slate-500">
          ESC para cerrar
        </div>
      </div>
    </div>
  );
}
