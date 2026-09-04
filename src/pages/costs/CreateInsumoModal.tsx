import { useState, useEffect } from "react";
import { api } from "../../core/api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  suppliers: any[];
  insumo?: any;
}

const PRESENTACIONES = [
  'Kilogramo (kg)',
  'Gramo (g)',
  'Litro (L)',
  'Mililitro (ml)',
  'Pieza (pza)',
  'Caja (cja)',
  'Paquete (paq)',
  'Bolsa (bol)',
  'Lata (lat)',
  'Botella (bot)',
  'Costal (cos)',
  'Cubeta (cub)',
  'Rollo (rol)',
  'Otro',
];

export default function CreateInsumoModal({ open, onClose, onCreated, suppliers, insumo }: Props) {
  const [familias, setFamilias] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    familiaId: "",
    presentacion: "",
    unidadMedida: "",
    presentacionCompra: "",
    factorConversion: 1,
    precioCompra: 0,
    merma: 0,
    costoUnitario: 0,
    moneda: "MXN",
    proveedorId: "",
    categoriaId: "",
    stockActual: 0,
    stockMinimo: 0,
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    loadFamilias();
  }, []);

  async function loadFamilias() {
    try {
      const response = await api.get("/costs/familias");
      setFamilias(Array.isArray(response.data) ? response.data : []);
    } catch {
      setFamilias([]);
    }
  }

  useEffect(() => {
    if (open) {
      if (insumo) {
        setFormData({
          codigo: insumo.codigo || "",
          nombre: insumo.nombre || "",
          descripcion: insumo.descripcion || "",
          familiaId: insumo.familiaId || insumo.familia || "",
          presentacion: insumo.presentacion || "",
          unidadMedida: insumo.unidadMedida || "",
          presentacionCompra: insumo.presentacionCompra || "",
          factorConversion: insumo.factorConversion || 1,
          precioCompra: insumo.precioCompra || 0,
          merma: insumo.merma || 0,
          costoUnitario: insumo.costoUnitario || 0,
          moneda: insumo.moneda || "MXN",
          proveedorId: insumo.proveedorId || "",
          categoriaId: insumo.categoriaId || "",
          stockActual: insumo.stockActual || 0,
          stockMinimo: insumo.stockMinimo || 0,
          isActive: insumo.isActive !== undefined ? insumo.isActive : true,
        });
      } else {
        setFormData({
          codigo: "",
          nombre: "",
          descripcion: "",
          familiaId: "",
          presentacion: "",
          unidadMedida: "",
          presentacionCompra: "",
          factorConversion: 1,
          precioCompra: 0,
          merma: 0,
          costoUnitario: 0,
          moneda: "MXN",
          proveedorId: "",
          categoriaId: "",
          stockActual: 0,
          stockMinimo: 0,
          isActive: true,
        });
      }
    }
  }, [open, insumo]);

  // Auditoría de seguridad (GoodsHabits, portabilidad Costos standalone): mismo cálculo que
  // CostsService.calcularCostoUnitario() del backend — se muestra aquí solo como preview en
  // vivo mientras se captura, el valor real que se guarda lo recalcula el backend siempre que
  // haya precioCompra (nunca se confía en lo que mande el cliente). Sin precioCompra, el
  // campo de Costo Unitario abajo vuelve a ser editable a mano, para no romper la captura
  // manual que ya usan los insumos existentes.
  const precioCompraActivo = Number(formData.precioCompra) > 0;
  const costoCalculado = precioCompraActivo
    ? (() => {
        const factor = Number(formData.factorConversion) > 0 ? Number(formData.factorConversion) : 1;
        const denom = factor * (1 - Number(formData.merma || 0) / 100);
        return denom > 0 ? Number(formData.precioCompra) / denom : 0;
      })()
    : null;

  async function generateCode() {
    if (!formData.familiaId) {
      setError("Selecciona una familia primero");
      return;
    }
    try {
      setGeneratingCode(true);
      const response = await api.get("/costs/insumos/next-code", {
        params: { familiaId: formData.familiaId },
      });
      setFormData({ ...formData, codigo: response.data.codigo });
    } catch (err: any) {
      setError("No fue posible generar el código");
    } finally {
      setGeneratingCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      if (insumo) {
        await api.put(`/costs/insumos/${insumo.id}`, formData);
      } else {
        await api.post("/costs/insumos", formData);
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar el insumo");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header - flex-shrink-0 */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">{insumo ? "Editar Insumo" : "Nuevo Insumo"}</h3>
              <p className="text-sm text-slate-400">Completa los datos del insumo</p>
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
              <label className="block text-sm text-slate-400 mb-1">Familia *</label>
              <select
                value={formData.familiaId}
                onChange={(e) => setFormData({ ...formData, familiaId: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              >
                <option value="">Seleccionar familia</option>
                {familias.map((f) => (
                  <option key={f.id} value={f.id}>{f.nombre} ({f.prefijo})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Código</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                />
                {!insumo && (
                  <button
                    type="button"
                    onClick={generateCode}
                    disabled={generatingCode || !formData.familiaId}
                    className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-40"
                  >
                    {generatingCode ? "..." : "Auto"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Presentación</label>
              <select
                value={formData.presentacion}
                onChange={(e) => setFormData({ ...formData, presentacion: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              >
                <option value="">Seleccionar presentación</option>
                {PRESENTACIONES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Unidad de Medida *</label>
              <input
                type="text"
                value={formData.unidadMedida}
                onChange={(e) => setFormData({ ...formData, unidadMedida: e.target.value })}
                required
                placeholder="kg, litro, unidad, etc."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Presentación de Compra</label>
              <input
                type="text"
                value={formData.presentacionCompra}
                onChange={(e) => setFormData({ ...formData, presentacionCompra: e.target.value })}
                placeholder="Ej: Caja 24 latas, Costal 25 kg"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">Solo descriptivo (no calcula nada) — lo que compras, ej. "Caja de 24".</p>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Factor de Conversión</label>
              <input
                type="number"
                value={formData.factorConversion}
                onChange={(e) => setFormData({ ...formData, factorConversion: Number(e.target.value) })}
                step="0.01"
                min="0"
                placeholder="Unidades por presentación de compra"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Cuántas {formData.unidadMedida || "unidades de consumo"} rinde esa presentación — ej. 24. Se usa para calcular el costo unitario y para sumar el stock correcto al registrar la compra.
              </p>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Precio de Compra</label>
              <input
                type="number"
                value={formData.precioCompra}
                onChange={(e) => setFormData({ ...formData, precioCompra: Number(e.target.value) })}
                step="0.01"
                min="0"
                placeholder="Precio pagado por la presentación completa"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">Lo que pagas por toda la presentación (ej. por la caja completa), no por unidad — de ahí se calcula el costo unitario.</p>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Merma (%)</label>
              <input
                type="number"
                value={formData.merma}
                onChange={(e) => setFormData({ ...formData, merma: Number(e.target.value) })}
                step="0.01"
                min="0"
                max="99"
                placeholder="0"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">% que se pierde antes de poder usarlo (opcional).</p>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Costo Unitario *</label>
              <input
                type="number"
                value={precioCompraActivo ? Number(costoCalculado).toFixed(4) : formData.costoUnitario}
                onChange={(e) => setFormData({ ...formData, costoUnitario: Number(e.target.value) })}
                readOnly={precioCompraActivo}
                required
                step="0.01"
                className={`w-full rounded-lg border p-2 text-white outline-none ${
                  precioCompraActivo
                    ? "border-slate-800 bg-slate-800/50 text-slate-300 cursor-not-allowed"
                    : "border-slate-700 bg-slate-800 focus:border-blue-500"
                }`}
              />
              <p className="mt-1 text-xs text-slate-500">
                {precioCompraActivo
                  ? "Calculado automático: Precio de Compra ÷ (Factor de Conversión × (1 − Merma/100)). No editable mientras haya Precio de Compra."
                  : "Captura manual — déjalo así si no vas a registrar Precio de Compra para este insumo."}
              </p>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Moneda</label>
              <select
                value={formData.moneda}
                onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Proveedor</label>
              <select
                value={formData.proveedorId}
                onChange={(e) => setFormData({ ...formData, proveedorId: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              >
                <option value="">Seleccionar proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Stock Actual</label>
              <input
                type="number"
                value={formData.stockActual}
                onChange={(e) => setFormData({ ...formData, stockActual: Number(e.target.value) })}
                step="0.01"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Stock Mínimo</label>
              <input
                type="number"
                value={formData.stockMinimo}
                onChange={(e) => setFormData({ ...formData, stockMinimo: Number(e.target.value) })}
                step="0.01"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
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
            <label htmlFor="isActive" className="text-sm text-slate-400">
              Activo
            </label>
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
              {loading ? "Guardando..." : insumo ? "Actualizar" : "Crear"}
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
