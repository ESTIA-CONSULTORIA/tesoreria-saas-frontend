import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateSupplierModal from "./CreateSupplierModal";
import { useCompanyStore } from "../../core/store/useCompanyStore";

interface Supplier {
  id: string;
  nombre: string;
  razonSocial?: string;
  rfc?: string;
  email?: string;
  telefono?: string;
  contacto?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  pais?: string;
  condicionesPago: string;
  limiteCredito: number;
  saldoPendiente: number;
  moneda: string;
  isActive: boolean;
}

export default function SuppliersPage() {
  const { activeCompany } = useCompanyStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("");

  useEffect(() => {
    loadSuppliers();
  }, [search, filterActive, activeCompany?.id]);

  async function loadSuppliers() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/suppliers", {
        params: { search, isActive: filterActive },
      });
      setSuppliers(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar proveedores");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await api.put(`/suppliers/${id}/deactivate`);
      loadSuppliers();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible desactivar el proveedor");
    }
  }

  function handleViewDetail(supplier: Supplier) {
    setSelectedSupplier(supplier);
    setDetailOpen(true);
  }

  function handleEdit(supplier: Supplier) {
    setSelectedSupplier(supplier);
    setModalOpen(true);
  }

  function handleCreate() {
    setSelectedSupplier(null);
    setModalOpen(true);
  }

  return (
    <MainLayout>
      <CreateSupplierModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadSuppliers}
        supplier={selectedSupplier}
      />

      {!activeCompany ? (
        <div style={{ padding: '24px', backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', color: '#8A6A3A', textAlign: 'center' }}>
          Selecciona una empresa para ver los datos
        </div>
      ) : (
        <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Proveedores</h2>
            <p className="text-slate-400">Gestión de proveedores</p>
          </div>
          <button
            onClick={handleCreate}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            + Nuevo Proveedor
          </button>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o RFC..."
            className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
          />
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando proveedores...</div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="p-2">Nombre</th>
                    <th className="p-2">RFC</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Teléfono</th>
                    <th className="p-2">Condiciones pago</th>
                    <th className="p-2">Saldo pendiente</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-t border-slate-800">
                      <td className="p-2 font-medium">{supplier.nombre}</td>
                      <td className="p-2">{supplier.rfc || "-"}</td>
                      <td className="p-2">{supplier.email || "-"}</td>
                      <td className="p-2">{supplier.telefono || "-"}</td>
                      <td className="p-2">{supplier.condicionesPago}</td>
                      <td className="p-2">{Number(supplier.saldoPendiente).toFixed(2)} {supplier.moneda}</td>
                      <td className="p-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            supplier.isActive ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                          }`}
                        >
                          {supplier.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetail(supplier)}
                            className="rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600"
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                          >
                            Editar
                          </button>
                          {supplier.isActive && (
                            <button
                              onClick={() => handleDeactivate(supplier.id)}
                              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                            >
                              Desactivar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {suppliers.map((supplier) => (
                <div key={supplier.id} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-white">{supplier.nombre}</p>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        supplier.isActive ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                      }`}
                    >
                      {supplier.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1 mb-3">
                    <p><span className="text-slate-500">RFC:</span> {supplier.rfc || "-"}</p>
                    <p><span className="text-slate-500">Email:</span> {supplier.email || "-"}</p>
                    <p><span className="text-slate-500">Teléfono:</span> {supplier.telefono || "-"}</p>
                    <p><span className="text-slate-500">Condiciones:</span> {supplier.condicionesPago}</p>
                    <p><span className="text-slate-500">Saldo:</span> {Number(supplier.saldoPendiente).toFixed(2)} {supplier.moneda}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetail(supplier)}
                      className="flex-1 rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                    >
                      Editar
                    </button>
                    {supplier.isActive && (
                      <button
                        onClick={() => handleDeactivate(supplier.id)}
                        className="flex-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Desactivar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de detalle */}
        {detailOpen && selectedSupplier && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-2xl rounded-t-2xl md:rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl md:h-auto h-[80vh] overflow-y-auto">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">Detalle del Proveedor</h3>
                  <p className="text-sm text-slate-400">Información completa</p>
                </div>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-400">Nombre comercial</p>
                    <p className="text-lg font-semibold">{selectedSupplier.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Razón social</p>
                    <p className="text-lg font-semibold">{selectedSupplier.razonSocial || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">RFC</p>
                    <p className="text-lg font-semibold">{selectedSupplier.rfc || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Email</p>
                    <p className="text-lg font-semibold">{selectedSupplier.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Teléfono</p>
                    <p className="text-lg font-semibold">{selectedSupplier.telefono || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Contacto</p>
                    <p className="text-lg font-semibold">{selectedSupplier.contacto || "-"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-400">Dirección</p>
                    <p className="text-lg font-semibold">{selectedSupplier.direccion || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Ciudad</p>
                    <p className="text-lg font-semibold">{selectedSupplier.ciudad || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Estado</p>
                    <p className="text-lg font-semibold">{selectedSupplier.estado || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">País</p>
                    <p className="text-lg font-semibold">{selectedSupplier.pais || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Condiciones de pago</p>
                    <p className="text-lg font-semibold">{selectedSupplier.condicionesPago}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Límite de crédito</p>
                    <p className="text-lg font-semibold">{Number(selectedSupplier.limiteCredito).toFixed(2)} {selectedSupplier.moneda}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Saldo pendiente</p>
                    <p className="text-lg font-semibold text-red-400">{Number(selectedSupplier.saldoPendiente).toFixed(2)} {selectedSupplier.moneda}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Estado</p>
                    <p className="text-lg font-semibold">{selectedSupplier.isActive ? "Activo" : "Inactivo"}</p>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 mt-4">
                  <h4 className="text-lg font-semibold mb-3">Historial de compras</h4>
                  <p className="text-sm text-slate-400">No hay compras registradas para este proveedor</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </MainLayout>
  );
}
