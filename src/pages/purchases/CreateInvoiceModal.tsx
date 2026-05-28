import { useState, useEffect } from "react";
import { api } from "../../core/api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  suppliers: any[];
  orders: any[];
}

export default function CreateInvoiceModal({ open, onClose, onCreated, suppliers, orders }: Props) {
  const [formData, setFormData] = useState({
    numero: "",
    supplierId: "",
    ocId: "",
    fecha: new Date().toISOString().split('T')[0],
    fechaVencimiento: "",
    metodoPago: "",
    incluirIVA: true,
  });
  const [items, setItems] = useState<any[]>([{ descripcion: "", cantidad: 1, precioUnitario: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setFormData({
        numero: "",
        supplierId: "",
        ocId: "",
        fecha: new Date().toISOString().split('T')[0],
        fechaVencimiento: "",
        metodoPago: "",
        incluirIVA: true,
      });
      setItems([{ descripcion: "", cantidad: 1, precioUnitario: 0 }]);
    }
  }, [open]);

  function addItem() {
    setItems([...items, { descripcion: "", cantidad: 1, precioUnitario: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  }

  function updateItem(index: number, field: string, value: any) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  function getSubtotal() {
    return items.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0);
  }

  function getIVA() {
    return formData.incluirIVA ? getSubtotal() * 0.16 : 0;
  }

  function getTotal() {
    return getSubtotal() + getIVA();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const itemsWithSubtotal = items.map((item) => ({
        ...item,
        subtotal: item.cantidad * item.precioUnitario,
      }));

      const invoiceData = {
        ...formData,
        items: itemsWithSubtotal,
        subtotal: getSubtotal(),
        impuestos: getIVA(),
        total: getTotal(),
        status: "PENDIENTE",
        montoPagado: 0,
      };

      await api.post("/purchases/invoices", invoiceData);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible capturar la factura");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-3xl rounded-t-2xl md:rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl md:h-auto h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">Capturar Factura de Compra</h3>
            <p className="text-sm text-slate-400">Completa los datos de la factura</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
          >
            Cerrar
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Número de factura *</label>
              <input
                type="text"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Proveedor *</label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              >
                <option value="">Seleccionar proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Vincular a OC (opcional)</label>
              <select
                value={formData.ocId}
                onChange={(e) => setFormData({ ...formData, ocId: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              >
                <option value="">Sin OC</option>
                {orders.filter(o => o.status === 'RECIBIDA' || o.status === 'PARCIAL').map((o) => (
                  <option key={o.id} value={o.id}>{o.numero}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Fecha</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Fecha vencimiento</label>
              <input
                type="date"
                value={formData.fechaVencimiento}
                onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Método de pago</label>
              <select
                value={formData.metodoPago}
                onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              >
                <option value="">Seleccionar</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="CHEQUE">Cheque</option>
                <option value="TARJETA">Tarjeta</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="incluirIVA"
                checked={formData.incluirIVA}
                onChange={(e) => setFormData({ ...formData, incluirIVA: e.target.checked })}
                className="rounded border-slate-700 bg-slate-800"
              />
              <label htmlFor="incluirIVA" className="text-sm text-slate-400">
                Incluir IVA (16%)
              </label>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-lg font-semibold text-white">Items</h4>
              <button
                type="button"
                onClick={addItem}
                className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
              >
                + Agregar Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 grid-cols-1 md:grid-cols-4 items-end p-3 rounded-lg bg-slate-800">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Descripción</label>
                    <input
                      type="text"
                      value={item.descripcion}
                      onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-700 p-2 text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Cantidad</label>
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => updateItem(index, "cantidad", Number(e.target.value))}
                      className="w-full rounded border border-slate-700 bg-slate-700 p-2 text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">Precio unitario</label>
                      <input
                        type="number"
                        value={item.precioUnitario}
                        onChange={(e) => updateItem(index, "precioUnitario", Number(e.target.value))}
                        className="w-full rounded border border-slate-700 bg-slate-700 p-2 text-white text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded bg-red-600 px-2 py-2 text-white hover:bg-red-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Subtotal:</span>
              <span className="text-white">{getSubtotal().toFixed(2)}</span>
            </div>
            {formData.incluirIVA && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">IVA (16%):</span>
                <span className="text-white">{getIVA().toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold mt-2">
              <span className="text-white">Total:</span>
              <span className="text-white">{getTotal().toFixed(2)}</span>
            </div>
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {loading ? "Guardando..." : "Capturar Factura"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
