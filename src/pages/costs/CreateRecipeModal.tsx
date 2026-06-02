import { useState, useEffect } from "react";
import { api } from "../../core/api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  insumos: any[];
  recipe?: any;
}

export default function CreateRecipeModal({ open, onClose, onCreated, insumos, recipe }: Props) {
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    tipo: "PRODUCTO_VENTA",
    rendimiento: 1,
    unidadRendimiento: "",
    margenDeseado: 0.35,
    isActive: true,
  });
  const [items, setItems] = useState<any[]>([{ insumoId: "", cantidad: 1, unidadMedida: "", costoUnitario: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (recipe) {
        setFormData({
          nombre: recipe.nombre || "",
          descripcion: recipe.descripcion || "",
          tipo: recipe.tipo || "PRODUCTO_VENTA",
          rendimiento: recipe.rendimiento || 1,
          unidadRendimiento: recipe.unidadRendimiento || "",
          margenDeseado: recipe.margenDeseado || 0.35,
          isActive: recipe.isActive !== undefined ? recipe.isActive : true,
        });
        setItems(recipe.items || [{ insumoId: "", cantidad: 1, unidadMedida: "", costoUnitario: 0 }]);
      } else {
        setFormData({
          nombre: "",
          descripcion: "",
          tipo: "PRODUCTO_VENTA",
          rendimiento: 1,
          unidadRendimiento: "",
          margenDeseado: 0.35,
          isActive: true,
        });
        setItems([{ insumoId: "", cantidad: 1, unidadMedida: "", costoUnitario: 0 }]);
      }
    }
  }, [open, recipe]);

  function addItem() {
    setItems([...items, { insumoId: "", cantidad: 1, unidadMedida: "", costoUnitario: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  }

  function updateItem(index: number, field: string, value: any) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Si se selecciona un insumo, cargar su costo unitario y unidad
    if (field === "insumoId" && value) {
      const insumo = insumos.find((i) => i.id === value);
      if (insumo) {
        newItems[index].costoUnitario = insumo.costoUnitario;
        newItems[index].unidadMedida = insumo.unidadMedida;
      }
    }
    
    setItems(newItems);
  }

  function getCostoTotal() {
    return items.reduce((sum, item) => sum + (item.cantidad * item.costoUnitario), 0);
  }

  function getPrecioSugerido() {
    const costo = getCostoTotal();
    const margen = formData.margenDeseado;
    return margen > 0 ? costo / (1 - margen) : costo;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const itemsWithSubtotal = items.map((item) => ({
        ...item,
        subtotal: item.cantidad * item.costoUnitario,
      }));

      const recipeData = {
        ...formData,
        items: itemsWithSubtotal,
        costoTotal: getCostoTotal(),
        precioVentaSugerido: getPrecioSugerido(),
      };

      if (recipe) {
        await api.put(`/costs/recipes/${recipe.id}`, recipeData);
      } else {
        await api.post("/costs/recipes", recipeData);
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar la receta");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header - flex-shrink-0 */}
        <div className="flex-shrink-0 p-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">{recipe ? "Editar Receta" : "Nueva Receta"}</h3>
              <p className="text-xs text-slate-400">Completa los datos de la receta</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Body - flex-1 overflow-y-auto */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-xl border border-red-700 bg-red-900/30 p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm outline-none focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm outline-none focus:border-blue-500"
              >
                <option value="PRODUCTO_VENTA">Producto de Venta</option>
                <option value="INSUMO_ELABORADO">Insumo Elaborado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Rendimiento</label>
              <input
                type="number"
                value={formData.rendimiento}
                onChange={(e) => setFormData({ ...formData, rendimiento: Number(e.target.value) })}
                step="0.01"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Unidad Rendimiento</label>
              <input
                type="text"
                value={formData.unidadRendimiento}
                onChange={(e) => setFormData({ ...formData, unidadRendimiento: e.target.value })}
                placeholder="kg, litro, unidad, etc."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Margen Deseado (%)</label>
            <input
              type="number"
              value={(formData.margenDeseado * 100).toFixed(0)}
              onChange={(e) => setFormData({ ...formData, margenDeseado: Number(e.target.value) / 100 })}
              step="1"
              min="0"
              max="100"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold text-white">Insumos</h4>
              <button
                type="button"
                onClick={addItem}
                className="rounded-lg bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
              >
                + Agregar
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 grid-cols-1 md:grid-cols-5 items-end p-2 rounded-lg bg-slate-800">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Insumo</label>
                    <select
                      value={item.insumoId}
                      onChange={(e) => updateItem(index, "insumoId", e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-700 p-1.5 text-white text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">Seleccionar</option>
                      {insumos.map((i) => (
                        <option key={i.id} value={i.id}>{i.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Cantidad</label>
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => updateItem(index, "cantidad", Number(e.target.value))}
                      className="w-full rounded border border-slate-700 bg-slate-700 p-1.5 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Costo Unit.</label>
                    <input
                      type="number"
                      value={item.costoUnitario}
                      onChange={(e) => updateItem(index, "costoUnitario", Number(e.target.value))}
                      step="0.01"
                      className="w-full rounded border border-slate-700 bg-slate-700 p-1.5 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">Subtotal</label>
                      <input
                        type="text"
                        value={(item.cantidad * item.costoUnitario).toFixed(2)}
                        readOnly
                        className="w-full rounded border border-slate-700 bg-slate-600 p-1.5 text-white text-xs outline-none"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded bg-red-600 px-1.5 py-1.5 text-white hover:bg-red-700 text-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Costo Total:</span>
              <span className="text-white">{getCostoTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Margen:</span>
              <span className="text-white">{(formData.margenDeseado * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-sm font-bold mt-1">
              <span className="text-white">Precio Sugerido:</span>
              <span className="text-white">{getPrecioSugerido().toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-slate-700 bg-slate-800"
            />
            <label htmlFor="isActive" className="text-xs text-slate-400">
              Activo
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {loading ? "Guardando..." : recipe ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
        </div>

        {/* Footer - flex-shrink-0 */}
        <div className="flex-shrink-0 p-2 border-t border-slate-800 text-center text-xs text-slate-500">
          ESC para cerrar
        </div>
      </div>
    </div>
  );
}
