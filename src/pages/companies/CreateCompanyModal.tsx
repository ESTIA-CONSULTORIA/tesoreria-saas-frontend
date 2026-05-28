import { useState } from "react";
import { api } from "../../core/api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCompanyModal({
  open,
  onClose,
  onCreated,
}: Props) {
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("MXN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      await api.post("/companies", {
  tenantId: localStorage.getItem("tenant_id") || "test-tenant",
  legalName,
  tradeName,
  taxId,
  baseCurrency,
});

      onCreated();
      onClose();

      setLegalName("");
      setTradeName("");
      setTaxId("");
      setBaseCurrency("MXN");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "No fue posible crear la empresa"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">
              Nueva Empresa
            </h3>
            <p className="text-sm text-slate-400">
              Registra una empresa para el tenant actual
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
          >
            Cerrar
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Razón social"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
          />

          <input
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
            placeholder="Nombre comercial"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
          />

          <input
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder="RFC / Tax ID"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
          />

          <select
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
          >
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>

          <button
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar empresa"}
          </button>
        </form>
      </div>
    </div>
  );
}