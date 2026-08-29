import { useState, useEffect } from "react";
import { api } from "../../core/api/api";

interface Insumo {
  id: string;
  nombre: string;
  isActive: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onReplaced: () => void;
  insumo: Insumo | null;
  insumos: Insumo[];
}

// Auditoría de producto (GoodsHabits, Punto 2): UI mínima para POST /costs/insumos/:id/replace
// — el backend ya tenía todo esto construido (replaceInsumo(), wouldCreateReplacementCycle(),
// costoUnitarioInsumo() siguiendo la cadena), pero no había ninguna pantalla que lo llamara.
// No se duplica la validación de ciclos acá — el backend ya la tiene, este modal solo
// muestra el error que devuelva si el usuario elige algo que crearía uno.
export default function ReplaceInsumoModal({ open, onClose, onReplaced, insumo, insumos }: Props) {
  const [newInsumoId, setNewInsumoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNewInsumoId("");
      setError("");
    }
  }, [open, insumo]);

  if (!open || !insumo) return null;

  const candidatos = insumos.filter((i) => i.isActive && i.id !== insumo.id);

  async function handleConfirm() {
    if (!newInsumoId) {
      setError("Selecciona el insumo de reemplazo.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await api.post(`/costs/insumos/${insumo!.id}/replace`, { newInsumoId });
      onReplaced();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible reemplazar el insumo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-xl font-bold text-white">Reemplazar insumo</h3>
          <p className="text-sm text-slate-400 mt-1">
            "{insumo.nombre}" quedará <span className="text-slate-300">inactivo</span> y toda receta
            que lo use se resolverá automáticamente contra el reemplazo — no hace falta editar
            las recetas a mano.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1">Reemplazar con</label>
            <select
              value={newInsumoId}
              onChange={(e) => setNewInsumoId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
            >
              <option value="">Seleccionar insumo activo</option>
              {candidatos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {loading ? "Reemplazando..." : "Confirmar reemplazo"}
          </button>
        </div>
      </div>
    </div>
  );
}
