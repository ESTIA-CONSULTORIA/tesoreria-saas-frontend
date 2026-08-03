import { useState, useEffect } from "react";
import { api } from "../../core/api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  insumos: any[];
  recipes: any[];
  recipe?: any;
}

function makeKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function emptyItem() {
  return { _key: makeKey(), id: undefined, insumoId: "", componentRecipeId: "", cantidad: 1, unidadMedida: "", costoUnitario: 0 };
}

export default function CreateRecipeModal({ open, onClose, onCreated, insumos, recipes, recipe }: Props) {
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    tipo: "PRODUCTO_VENTA",
    rendimiento: 1,
    unidadRendimiento: "",
    margenDeseado: 0.35,
    isActive: true,
  });
  const [items, setItems] = useState<any[]>([emptyItem()]);
  const [originalItemIds, setOriginalItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

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
      loadRecipeItems(recipe.id);
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
      setItems([emptyItem()]);
      setOriginalItemIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipe]);

  async function loadRecipeItems(recipeId: string) {
    try {
      setLoadingItems(true);
      setError("");
      const response = await api.get(`/costs/recipes/${recipeId}/items`);
      const rows = Array.isArray(response.data) ? response.data : [];

      const resolved = await Promise.all(
        rows.map(async (row: any) => {
          let costoUnitario = 0;
          if (row.insumoId) {
            const insumo = insumos.find((i) => i.id === row.insumoId);
            costoUnitario = insumo ? Number(insumo.costoUnitario) : 0;
          } else if (row.componentRecipeId) {
            try {
              const costRes = await api.get(`/costs/recipes/${row.componentRecipeId}/cost`);
              costoUnitario = Number(costRes.data.costoPorUnidad);
            } catch {
              costoUnitario = 0;
            }
          }
          return {
            _key: makeKey(),
            id: row.id,
            insumoId: row.insumoId || "",
            componentRecipeId: row.componentRecipeId || "",
            cantidad: Number(row.cantidad),
            unidadMedida: row.unidadMedida || "",
            costoUnitario,
          };
        })
      );

      setItems(resolved.length > 0 ? resolved : [emptyItem()]);
      setOriginalItemIds(rows.map((r: any) => r.id));
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar los ingredientes de la receta");
      setItems([emptyItem()]);
      setOriginalItemIds([]);
    } finally {
      setLoadingItems(false);
    }
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(key: string) {
    if (items.length > 1) {
      setItems((prev) => prev.filter((it) => it._key !== key));
    }
  }

  function updateItemField(key: string, field: string, value: any) {
    setItems((prev) => prev.map((it) => (it._key === key ? { ...it, [field]: value } : it)));
  }

  async function handleIngredientChange(key: string, rawValue: string) {
    if (!rawValue) {
      setItems((prev) =>
        prev.map((it) => (it._key === key ? { ...it, insumoId: "", componentRecipeId: "", costoUnitario: 0, unidadMedida: "" } : it))
      );
      return;
    }

    const separatorIndex = rawValue.indexOf(":");
    const kind = rawValue.slice(0, separatorIndex);
    const id = rawValue.slice(separatorIndex + 1);

    if (kind === "insumo") {
      const insumo = insumos.find((i) => i.id === id);
      setItems((prev) =>
        prev.map((it) =>
          it._key === key
            ? {
                ...it,
                insumoId: id,
                componentRecipeId: "",
                costoUnitario: insumo ? Number(insumo.costoUnitario) : 0,
                unidadMedida: insumo ? insumo.unidadMedida : "",
              }
            : it
        )
      );
      return;
    }

    // kind === "receta"
    const receta = recipes.find((r) => r.id === id);
    setItems((prev) =>
      prev.map((it) =>
        it._key === key
          ? { ...it, insumoId: "", componentRecipeId: id, unidadMedida: receta ? receta.unidadRendimiento : "", loadingCosto: true }
          : it
      )
    );

    try {
      const response = await api.get(`/costs/recipes/${id}/cost`);
      setItems((prev) =>
        prev.map((it) => (it._key === key ? { ...it, costoUnitario: Number(response.data.costoPorUnidad), loadingCosto: false } : it))
      );
    } catch (err: any) {
      setItems((prev) => prev.map((it) => (it._key === key ? { ...it, costoUnitario: 0, loadingCosto: false } : it)));
      setError("No fue posible calcular el costo de la receta seleccionada");
    }
  }

  function getCostoTotal() {
    return items.reduce((sum, item) => sum + Number(item.cantidad) * Number(item.costoUnitario), 0);
  }

  function getPrecioSugerido() {
    const costo = getCostoTotal();
    const margen = formData.margenDeseado;
    return margen > 0 ? costo / (1 - margen) : costo;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    let recipeId: string;
    try {
      const recipeData = {
        ...formData,
        costoTotal: getCostoTotal(),
        precioVentaSugerido: getPrecioSugerido(),
      };

      if (recipe) {
        await api.put(`/costs/recipes/${recipe.id}`, recipeData);
        recipeId = recipe.id;
      } else {
        const created = await api.post("/costs/recipes", recipeData);
        recipeId = created.data.id;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar la receta");
      setLoading(false);
      return;
    }

    try {
      const validItems = items.filter((it) => it.insumoId || it.componentRecipeId);

      for (const item of validItems) {
        const payload = {
          insumoId: item.insumoId || null,
          componentRecipeId: item.componentRecipeId || null,
          cantidad: item.cantidad,
          unidadMedida: item.unidadMedida,
        };

        if (item.id) {
          await api.put(`/costs/recipe-items/${item.id}`, payload);
        } else {
          await api.post(`/costs/recipes/${recipeId}/items`, payload);
        }
      }

      const currentIds = validItems.filter((it) => it.id).map((it) => it.id);
      const idsToDelete = originalItemIds.filter((id) => !currentIds.includes(id));
      for (const id of idsToDelete) {
        await api.delete(`/costs/recipe-items/${id}`);
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setError(
        (err.response?.data?.message || "No fue posible guardar todos los ingredientes") +
          " — la receta ya se guardó, pero revisa la lista de ingredientes antes de salir."
      );
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
              <h4 className="text-sm font-semibold text-white">Ingredientes</h4>
              <button
                type="button"
                onClick={addItem}
                className="rounded-lg bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
              >
                + Agregar
              </button>
            </div>

            {loadingItems ? (
              <p className="text-xs text-slate-400">Cargando ingredientes...</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {items.map((item) => {
                  const selectValue = item.insumoId
                    ? `insumo:${item.insumoId}`
                    : item.componentRecipeId
                    ? `receta:${item.componentRecipeId}`
                    : "";

                  return (
                    <div key={item._key} className="grid gap-2 grid-cols-1 md:grid-cols-5 items-end p-2 rounded-lg bg-slate-800">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">Ingrediente</label>
                        <select
                          value={selectValue}
                          onChange={(e) => handleIngredientChange(item._key, e.target.value)}
                          disabled={item.loadingCosto}
                          className="w-full rounded border border-slate-700 bg-slate-700 p-1.5 text-white text-xs outline-none focus:border-blue-500 disabled:opacity-50"
                        >
                          <option value="">Seleccionar</option>
                          <optgroup label="Insumos">
                            {insumos.map((i) => (
                              <option key={`insumo:${i.id}`} value={`insumo:${i.id}`}>{i.nombre}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Recetas (insumo elaborado)">
                            {recipes.map((r) => (
                              <option key={`receta:${r.id}`} value={`receta:${r.id}`}>{r.nombre}</option>
                            ))}
                          </optgroup>
                        </select>
                        {item.loadingCosto && <p className="text-xs text-slate-400 mt-1">Calculando costo...</p>}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Cantidad</label>
                        <input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) => updateItemField(item._key, "cantidad", Number(e.target.value))}
                          step="0.0001"
                          className="w-full rounded border border-slate-700 bg-slate-700 p-1.5 text-white text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Costo Unit.</label>
                        <input
                          type="number"
                          value={item.costoUnitario}
                          onChange={(e) => updateItemField(item._key, "costoUnitario", Number(e.target.value))}
                          step="0.01"
                          disabled={item.loadingCosto}
                          className="w-full rounded border border-slate-700 bg-slate-700 p-1.5 text-white text-xs outline-none focus:border-blue-500 disabled:opacity-50"
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
                            onClick={() => removeItem(item._key)}
                            className="rounded bg-red-600 px-1.5 py-1.5 text-white hover:bg-red-700 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
              disabled={loading || loadingItems}
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
