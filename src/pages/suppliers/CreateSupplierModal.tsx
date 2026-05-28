import { useState, useEffect } from "react";
import { api } from "../../core/api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  supplier?: any;
}

export default function CreateSupplierModal({ open, onClose, onCreated, supplier }: Props) {
  const [formData, setFormData] = useState({
    nombre: "",
    razonSocial: "",
    rfc: "",
    email: "",
    telefono: "",
    contacto: "",
    direccion: "",
    ciudad: "",
    estado: "",
    pais: "",
    condicionesPago: "CONTADO",
    limiteCredito: 0,
    moneda: "MXN",
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (supplier) {
      setFormData({
        nombre: supplier.nombre || "",
        razonSocial: supplier.razonSocial || "",
        rfc: supplier.rfc || "",
        email: supplier.email || "",
        telefono: supplier.telefono || "",
        contacto: supplier.contacto || "",
        direccion: supplier.direccion || "",
        ciudad: supplier.ciudad || "",
        estado: supplier.estado || "",
        pais: supplier.pais || "",
        condicionesPago: supplier.condicionesPago || "CONTADO",
        limiteCredito: supplier.limiteCredito || 0,
        moneda: supplier.moneda || "MXN",
        isActive: supplier.isActive !== undefined ? supplier.isActive : true,
      });
    } else {
      setFormData({
        nombre: "",
        razonSocial: "",
        rfc: "",
        email: "",
        telefono: "",
        contacto: "",
        direccion: "",
        ciudad: "",
        estado: "",
        pais: "",
        condicionesPago: "CONTADO",
        limiteCredito: 0,
        moneda: "MXN",
        isActive: true,
      });
    }
  }, [supplier, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      if (supplier) {
        await api.put(`/suppliers/${supplier.id}`, formData);
      } else {
        await api.post("/suppliers", formData);
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar el proveedor");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-2xl rounded-t-2xl md:rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl md:h-auto h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">
              {supplier ? "Editar Proveedor" : "Nuevo Proveedor"}
            </h3>
            <p className="text-sm text-slate-400">
              {supplier ? "Actualiza la información del proveedor" : "Completa los datos del nuevo proveedor"}
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
          <div className="mb-4 rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nombre comercial *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Razón social</label>
              <input
                type="text"
                value={formData.razonSocial}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">RFC</label>
              <input
                type="text"
                value={formData.rfc}
                onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Teléfono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Contacto</label>
              <input
                type="text"
                value={formData.contacto}
                onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Dirección</label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Ciudad</label>
              <input
                type="text"
                value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Estado</label>
              <input
                type="text"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">País</label>
              <input
                type="text"
                value={formData.pais}
                onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Condiciones de pago</label>
              <select
                value={formData.condicionesPago}
                onChange={(e) => setFormData({ ...formData, condicionesPago: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              >
                <option value="CONTADO">Contado</option>
                <option value="7_DIAS">7 días</option>
                <option value="15_DIAS">15 días</option>
                <option value="30_DIAS">30 días</option>
                <option value="45_DIAS">45 días</option>
                <option value="60_DIAS">60 días</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Límite de crédito</label>
              <input
                type="number"
                value={formData.limiteCredito}
                onChange={(e) => setFormData({ ...formData, limiteCredito: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
              />
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
              {loading ? "Guardando..." : supplier ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
