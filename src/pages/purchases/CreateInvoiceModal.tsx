import { useState, useEffect } from "react";
import { api } from "../../core/api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  suppliers: any[];
  orders: any[];
}

interface Insumo {
  id: string;
  codigo: string;
  nombre: string;
  presentacion: string;
  unidadMedida: string;
  costoUnitario: number;
}

export default function CreateInvoiceModal({ open, onClose, onCreated, suppliers, orders }: Props) {
  const [formData, setFormData] = useState({
    numero: "",
    supplierId: "",
    ocId: "",
    fecha: new Date().toISOString().split('T')[0],
    fechaVencimiento: "",
    metodoPago: "",
    diasCredito: 0,
    ivaRate: 16,
  });
  const [items, setItems] = useState<any[]>([{ 
    insumoId: "", 
    codigo: "", 
    nombre: "", 
    presentacion: "", 
    cantidad: 1, 
    costoUnitario: 0, 
    ivaPercent: 16 
  }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [insumoSearchResults, setInsumoSearchResults] = useState<Insumo[]>([]);
  const [searchIndex, setSearchIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setFormData({
        numero: "",
        supplierId: "",
        ocId: "",
        fecha: new Date().toISOString().split('T')[0],
        fechaVencimiento: "",
        metodoPago: "",
        diasCredito: 0,
        ivaRate: 16,
      });
      setItems([{ 
        insumoId: "", 
        codigo: "", 
        nombre: "", 
        presentacion: "", 
        cantidad: 1, 
        costoUnitario: 0, 
        ivaPercent: 16 
      }]);
      setInsumoSearchResults([]);
      setSearchIndex(null);
    }
  }, [open]);

  async function searchInsumos(query: string, index: number) {
    if (query.length < 2) {
      setInsumoSearchResults([]);
      return;
    }
    try {
      const response = await api.get("/costs/insumos/search", { params: { search: query, limit: 10 } });
      setInsumoSearchResults(response.data || []);
      setSearchIndex(index);
    } catch {
      setInsumoSearchResults([]);
    }
  }

  function selectInsumo(insumo: Insumo, index: number) {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      insumoId: insumo.id,
      codigo: insumo.codigo,
      nombre: insumo.nombre,
      presentacion: insumo.presentacion,
      costoUnitario: Number(insumo.costoUnitario),
    };
    setItems(newItems);
    setInsumoSearchResults([]);
    setSearchIndex(null);
  }

  function addItem() {
    setItems([...items, { 
      insumoId: "", 
      codigo: "", 
      nombre: "", 
      presentacion: "", 
      cantidad: 1, 
      costoUnitario: 0, 
      ivaPercent: 16 
    }]);
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

  function getItemSubtotal(item: any) {
    return item.cantidad * item.costoUnitario;
  }

  function getItemIVA(item: any) {
    return getItemSubtotal(item) * (item.ivaPercent / 100);
  }

  function getItemTotal(item: any) {
    return getItemSubtotal(item) + getItemIVA(item);
  }

  function getSubtotal() {
    return items.reduce((sum, item) => sum + getItemSubtotal(item), 0);
  }

  function getIVA() {
    return items.reduce((sum, item) => sum + getItemIVA(item), 0);
  }

  function getTotal() {
    return getSubtotal() + getIVA();
  }

  useEffect(() => {
    if (formData.diasCredito > 0 && formData.fecha) {
      const fecha = new Date(formData.fecha);
      fecha.setDate(fecha.getDate() + formData.diasCredito);
      setFormData({ ...formData, fechaVencimiento: fecha.toISOString().split('T')[0] });
    } else if (formData.diasCredito === 0) {
      setFormData({ ...formData, fechaVencimiento: formData.fecha });
    }
  }, [formData.diasCredito, formData.fecha]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const itemsWithSubtotal = items.map((item) => ({
        insumoId: item.insumoId,
        codigo: item.codigo,
        descripcion: item.nombre,
        presentacion: item.presentacion,
        cantidad: item.cantidad,
        precioUnitario: item.costoUnitario,
        ivaPercent: item.ivaPercent,
        subtotal: getItemSubtotal(item),
        iva: getItemIVA(item),
        total: getItemTotal(item),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header - flex-shrink-0 */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
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
        </div>

        {/* Body - flex-1 overflow-y-auto */}
        <div className="flex-1 overflow-y-auto p-6">
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
                onChange={(e) => {
                  const value = e.target.value;
                  let dias = 0;
                  if (value === "CREDITO_7") dias = 7;
                  else if (value === "CREDITO_15") dias = 15;
                  else if (value === "CREDITO_30") dias = 30;
                  else if (value === "CREDITO_45") dias = 45;
                  else if (value === "CREDITO_60") dias = 60;
                  setFormData({ ...formData, metodoPago: value, diasCredito: dias });
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              >
                <option value="">Seleccionar</option>
                <option value="CONTADO">Contado</option>
                <option value="CREDITO_7">Crédito 7 días</option>
                <option value="CREDITO_15">Crédito 15 días</option>
                <option value="CREDITO_30">Crédito 30 días</option>
                <option value="CREDITO_45">Crédito 45 días</option>
                <option value="CREDITO_60">Crédito 60 días</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="CHEQUE">Cheque</option>
                <option value="TARJETA">Tarjeta</option>
              </select>
            </div>

            {formData.metodoPago?.startsWith("CREDITO") && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">Días de crédito</label>
                <input
                  type="number"
                  value={formData.diasCredito}
                  onChange={(e) => setFormData({ ...formData, diasCredito: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-400 mb-1">Tasa de IVA</label>
              <select
                value={formData.ivaRate}
                onChange={(e) => setFormData({ ...formData, ivaRate: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              >
                <option value={0}>0%</option>
                <option value={8}>8%</option>
                <option value={16}>16%</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-lg font-semibold text-white">Artículos</h4>
              <button
                type="button"
                onClick={addItem}
                className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
              >
                + Agregar Insumo
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Código</th>
                    <th className="p-2">Insumo</th>
                    <th className="p-2">Presentación</th>
                    <th className="p-2">Cantidad</th>
                    <th className="p-2">Costo Unit.</th>
                    <th className="p-2">IVA%</th>
                    <th className="p-2">Subtotal</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-t border-slate-800">
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.codigo}
                          readOnly
                          className="w-20 rounded border border-slate-700 bg-slate-700 p-1 text-white text-xs"
                        />
                      </td>
                      <td className="p-2 relative">
                        <input
                          type="text"
                          value={item.nombre}
                          onChange={(e) => {
                            updateItem(index, "nombre", e.target.value);
                            searchInsumos(e.target.value, index);
                          }}
                          onBlur={() => { setTimeout(() => { setInsumoSearchResults([]); setSearchIndex(null); }, 200); }}
                          placeholder="Buscar insumo..."
                          className="w-48 rounded border border-slate-700 bg-slate-700 p-1 text-white text-xs outline-none focus:border-blue-500"
                        />
                        {searchIndex === index && insumoSearchResults.length > 0 && (
                          <div className="absolute z-10 w-48 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg max-h-40 overflow-y-auto">
                            {insumoSearchResults.map((insumo) => (
                              <div
                                key={insumo.id}
                                onClick={() => selectInsumo(insumo, index)}
                                className="p-2 hover:bg-slate-700 cursor-pointer text-white text-xs"
                              >
                                <div className="font-medium">{insumo.nombre}</div>
                                <div className="text-slate-400">{insumo.codigo} - {insumo.presentacion}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.presentacion}
                          readOnly
                          className="w-24 rounded border border-slate-700 bg-slate-700 p-1 text-white text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) => updateItem(index, "cantidad", Number(e.target.value))}
                          className="w-20 rounded border border-slate-700 bg-slate-700 p-1 text-white text-xs outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.costoUnitario}
                          onChange={(e) => updateItem(index, "costoUnitario", Number(e.target.value))}
                          className="w-24 rounded border border-slate-700 bg-slate-700 p-1 text-white text-xs outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={item.ivaPercent}
                          onChange={(e) => updateItem(index, "ivaPercent", Number(e.target.value))}
                          className="w-16 rounded border border-slate-700 bg-slate-700 p-1 text-white text-xs outline-none focus:border-blue-500"
                        >
                          <option value={0}>0%</option>
                          <option value={8}>8%</option>
                          <option value={16}>16%</option>
                        </select>
                      </td>
                      <td className="p-2 text-white">{getItemSubtotal(item).toFixed(2)}</td>
                      <td className="p-2">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Subtotal:</span>
              <span className="text-white">{getSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">IVA:</span>
              <span className="text-white">{getIVA().toFixed(2)}</span>
            </div>
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

        {/* Footer - flex-shrink-0 */}
        <div className="flex-shrink-0 p-4 border-t border-slate-800 text-center text-xs text-slate-500">
          ESC para cerrar
        </div>
      </div>
    </div>
  );
}
