import { useEffect, useState } from "react";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";

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

interface Company {
  id: string;
  legalName: string;
}

export default function CreateTransferModal({ open, onClose, onCreated }: Props) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("0");
  const [concept, setConcept] = useState("");
  const [tipo, setTipo] = useState<"INTERNA" | "INTERCOMPAÑIA">("INTERNA");
  const [empresaOrigenId, setEmpresaOrigenId] = useState("");
  const [empresaDestinoId, setEmpresaDestinoId] = useState("");
  const [referencia, setReferencia] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const user = useAuthStore((state) => state.user);
  const isAdminOrSoporte = user?.roleCode === "ADMIN" || user?.roleCode === "SOPORTE";

  useEffect(() => {
    if (open) {
      loadAccounts();
      if (isAdminOrSoporte) loadCompanies();
    }
  }, [open, isAdminOrSoporte]);

  async function loadAccounts() {
    try {
      const response = await api.get("/banks");
      setAccounts(Array.isArray(response.data) ? response.data : []);
    } catch {
      setAccounts([]);
    }
  }

  async function loadCompanies() {
    try {
      const response = await api.get("/companies");
      setCompanies(Array.isArray(response.data) ? response.data : []);
    } catch {
      setCompanies([]);
    }
  }

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const payload: any = {
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        concept,
        tipo,
        referencia,
        motivo,
      };
      if (tipo === "INTERCOMPAÑIA") {
        payload.empresaOrigenId = empresaOrigenId;
        payload.empresaDestinoId = empresaDestinoId;
      }
      await api.post("/transfers", payload);
      onCreated();
      onClose();
      setFromAccountId("");
      setToAccountId("");
      setAmount("0");
      setConcept("");
      setTipo("INTERNA");
      setEmpresaOrigenId("");
      setEmpresaDestinoId("");
      setReferencia("");
      setMotivo("");
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible realizar el traslado");
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
              <h3 className="text-2xl font-bold text-white">Nuevo Traslado</h3>
              <p className="text-sm text-slate-400">Valida saldo suficiente en cuenta origen</p>
            </div>
            <button onClick={onClose} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700">Cerrar</button>
          </div>
        </div>

        {/* Body - flex-1 overflow-y-auto */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdminOrSoporte && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">Tipo de Traslado</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as "INTERNA" | "INTERCOMPAÑIA")} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white">
                  <option value="INTERNA">Traslado Interno</option>
                  <option value="INTERCOMPAÑIA">Traslado Intercompañía</option>
                </select>
              </div>
            )}
            {tipo === "INTERCOMPAÑIA" && isAdminOrSoporte && (
              <>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Empresa Origen</label>
                  <select value={empresaOrigenId} onChange={(e) => setEmpresaOrigenId(e.target.value)} required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white">
                    <option value="">Seleccionar empresa origen</option>
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>{comp.legalName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Empresa Destino</label>
                  <select value={empresaDestinoId} onChange={(e) => setEmpresaDestinoId(e.target.value)} required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white">
                    <option value="">Seleccionar empresa destino</option>
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>{comp.legalName}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
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
            <input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Concepto" required className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white" />
            {tipo === "INTERCOMPAÑIA" && (
              <>
                <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Referencia (opcional)" className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white" />
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo del traslado" className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white" />
              </>
            )}
            <button disabled={loading} className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {loading ? "Procesando..." : "Realizar Traslado"}
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
