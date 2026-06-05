import { useState, useEffect } from "react";
import { api } from "../../core/api/api";

interface Company {
  id: string;
  legalName: string;
  tradeName: string;
  taxId?: string;
  baseCurrency: string;
  isActive: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  company?: Company | null;
}

export default function CreateCompanyModal({
  open,
  onClose,
  onCreated,
  company,
}: Props) {
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("MXN");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (company) {
      setLegalName(company.legalName);
      setTradeName(company.tradeName);
      setTaxId(company.taxId || "");
      setBaseCurrency(company.baseCurrency);
      setIsActive(company.isActive);
    } else {
      setLegalName("");
      setTradeName("");
      setTaxId("");
      setBaseCurrency("MXN");
      setIsActive(true);
    }
  }, [company, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      if (company) {
        await api.patch(`/companies/${company.id}`, {
          legalName,
          tradeName,
          taxId,
          baseCurrency,
          isActive,
        });
      } else {
        await api.post("/companies", {
          tenantId: localStorage.getItem("tenant_id") || "test-tenant",
          legalName,
          tradeName,
          taxId,
          baseCurrency,
        });
      }

      onCreated();
      onClose();

      setLegalName("");
      setTradeName("");
      setTaxId("");
      setBaseCurrency("MXN");
      setIsActive(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "No fue posible guardar la empresa"
      );
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
              <h3 className="text-2xl font-bold text-white">
                {company ? "Editar Empresa" : "Nueva Empresa"}
              </h3>
              <p className="text-sm text-slate-400">
                {company ? "Modifica los datos de la empresa" : "Registra una empresa para el tenant actual"}
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Body - flex-1 overflow-y-auto */}
        <div className="flex-1 overflow-y-auto p-6">
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

            {company && (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                Activa
              </label>
            )}

            <button
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Guardando..." : company ? "Actualizar empresa" : "Guardar empresa"}
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