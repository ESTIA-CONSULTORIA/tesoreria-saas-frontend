import { useState, useEffect } from "react";
import { api } from "../../core/api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onReceived: () => void;
  order: any;
}

export default function ReceiveOrderModal({ open, onClose, onReceived, order }: Props) {
  const [receivedItems, setReceivedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && order) {
      setReceivedItems(
        order.items.map((item: any) => ({
          ...item,
          cantidadRecibida: item.cantidadRecibida || 0,
        }))
      );
    }
  }, [open, order]);

  function updateReceivedItem(index: number, value: number) {
    const newItems = [...receivedItems];
    newItems[index].cantidadRecibida = value;
    setReceivedItems(newItems);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      await api.put(`/purchases/orders/${order.id}/receive`, {
        receivedItems: receivedItems.map((item) => ({
          descripcion: item.descripcion,
          cantidadRecibida: item.cantidadRecibida,
        })),
      });

      onReceived();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible registrar la recepción");
    } finally {
      setLoading(false);
    }
  }

  if (!open || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header - flex-shrink-0 */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">Recepción de Mercancía</h3>
              <p className="text-sm text-slate-400">OC: {order.numero}</p>
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
            <div className="mb-4 rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              {receivedItems.map((item, index) => (
                <div key={index} className="grid gap-2 grid-cols-1 md:grid-cols-3 items-center p-3 rounded-lg bg-slate-800">
                  <div className="md:col-span-2">
                    <p className="text-sm text-white font-medium">{item.descripcion}</p>
                    <p className="text-xs text-slate-400">Solicitado: {item.cantidad}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Recibido</label>
                    <input
                      type="number"
                      value={item.cantidadRecibida}
                      onChange={(e) => updateReceivedItem(index, Number(e.target.value))}
                      max={item.cantidad}
                      className="w-full rounded border border-slate-700 bg-slate-700 p-2 text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
              >
                {loading ? "Guardando..." : "Registrar Recepción"}
              </button>
            </div>
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
