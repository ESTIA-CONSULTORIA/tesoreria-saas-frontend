import { useState, useEffect } from "react";
import { api } from "../../core/api/api";

interface Branch {
  id: string;
  name: string;
  code?: string;
  city?: string;
  address?: string;
  state?: string;
  isActive: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  branch?: Branch | null;
}

export default function CreateBranchModal({ open, onClose, onCreated, branch }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (branch) {
      setName(branch.name);
      setCode(branch.code || "");
      setCity(branch.city || "");
      setAddress(branch.address || "");
      setState(branch.state || "");
      setIsActive(branch.isActive);
    } else {
      setName("");
      setCode("");
      setCity("");
      setAddress("");
      setState("");
      setIsActive(true);
    }
  }, [branch, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      if (branch) {
        await api.patch(`/branches/${branch.id}`, {
          name,
          code,
          city,
          address,
          state,
          isActive,
        });
      } else {
        await api.post("/branches", {
          companyId: localStorage.getItem("tenant_id") || "test-tenant",
          name,
          code,
          city,
          address,
          state,
        });
      }

      onCreated();
      onClose();

      setName("");
      setCode("");
      setCity("");
      setAddress("");
      setState("");
      setIsActive(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar la sucursal");
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
              <h3 className="text-2xl font-bold text-white">{branch ? "Editar Sucursal" : "Nueva Sucursal"}</h3>
              <p className="text-sm text-slate-400">
                {branch ? "Modifica los datos de la sucursal" : "Registra una sucursal para el tenant actual"}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de sucursal"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
            />

            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Codigo de sucursal"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
            />

            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ciudad"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
            />

            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Direccion"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
            />

            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Estado"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
            />

            {branch && (
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
              {loading ? "Guardando..." : branch ? "Actualizar sucursal" : "Guardar sucursal"}
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
