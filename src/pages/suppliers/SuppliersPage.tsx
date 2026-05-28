import { useState } from "react";
import MainLayout from "../../core/layout/MainLayout";

export default function SuppliersPage() {
  const [suppliers] = useState<any[]>([]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Proveedores</h2>
          <p className="text-slate-400">Gestión de proveedores</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              placeholder="Buscar proveedor..."
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
            />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Nuevo Proveedor
            </button>
          </div>

          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-3">Nombre</th>
                <th className="pb-3">RFC</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Teléfono</th>
                <th className="pb-3">Saldo Pendiente</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No hay proveedores registrados
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-t border-slate-800">
                    <td className="py-3">{supplier.nombre}</td>
                    <td className="py-3">{supplier.rfc || '-'}</td>
                    <td className="py-3">{supplier.email || '-'}</td>
                    <td className="py-3">{supplier.telefono || '-'}</td>
                    <td className="py-3">${supplier.saldoPendiente || 0}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${supplier.isActive ? 'bg-green-600' : 'bg-red-600'}`}>
                        {supplier.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button className="text-blue-400 hover:text-blue-300 mr-2">Editar</button>
                      <button className="text-red-400 hover:text-red-300">Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
