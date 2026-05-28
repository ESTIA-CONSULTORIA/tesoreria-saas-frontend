import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateRoleModal from "./CreateRoleModal";

interface Permission {
  id: string;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  permissions?: Permission[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/roles");
      setRoles(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar roles");
    } finally {
      setLoading(false);
    }
  }

  async function initializeDefaultRoles() {
    try {
      await api.post("/roles/initialize-default");
      loadRoles();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible inicializar roles");
    }
  }

  async function updatePermission(roleId: string, module: string, field: keyof Permission, value: boolean) {
    try {
      await api.put(`/roles/${roleId}/permissions/${module}`, { [field]: value });
      loadRoles();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible actualizar permiso");
    }
  }

  return (
    <MainLayout>
      <CreateRoleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadRoles}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Roles</h2>
            <p className="text-slate-400">Administracion de roles y permisos</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={initializeDefaultRoles}
              className="rounded-lg bg-slate-700 px-4 py-2 font-medium text-white hover:bg-slate-600"
            >
              Inicializar Roles
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              + Nuevo Rol
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando roles...</div>
        ) : (
          <div className="space-y-4">
            {roles.length === 0 ? (
              <div className="rounded-xl bg-slate-900 p-6">
                No existen roles registrados
              </div>
            ) : (
              roles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{role.name}</h3>

                      <p className="text-sm text-slate-400">
                        Codigo: {role.code}
                      </p>

                      <p className="text-xs text-slate-500">
                        {role.description || "Sin descripcion"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-green-900/40 px-3 py-1 text-sm text-green-300">
                        {role.isActive ? "Activo" : "Inactivo"}
                      </span>
                      <button
                        onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                        className="rounded-lg bg-slate-700 px-3 py-1 text-sm text-white hover:bg-slate-600"
                      >
                        {expandedRole === role.id ? "Ocultar" : "Permisos"}
                      </button>
                    </div>
                  </div>

                  {expandedRole === role.id && role.permissions && (
                    <div className="mt-4 border-t border-slate-800 pt-4">
                      <h4 className="mb-3 text-sm font-semibold">Permisos por Módulo</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="text-slate-400">
                            <tr>
                              <th className="p-2">Módulo</th>
                              <th className="p-2">Ver</th>
                              <th className="p-2">Crear</th>
                              <th className="p-2">Editar</th>
                              <th className="p-2">Eliminar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {role.permissions.map((permission) => (
                              <tr key={permission.id} className="border-t border-slate-800">
                                <td className="p-2">{permission.module}</td>
                                <td className="p-2">
                                  <input
                                    type="checkbox"
                                    checked={permission.canView}
                                    onChange={(e) => updatePermission(role.id, permission.module, "canView", e.target.checked)}
                                    className="rounded"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="checkbox"
                                    checked={permission.canCreate}
                                    onChange={(e) => updatePermission(role.id, permission.module, "canCreate", e.target.checked)}
                                    className="rounded"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="checkbox"
                                    checked={permission.canEdit}
                                    onChange={(e) => updatePermission(role.id, permission.module, "canEdit", e.target.checked)}
                                    className="rounded"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="checkbox"
                                    checked={permission.canDelete}
                                    onChange={(e) => updatePermission(role.id, permission.module, "canDelete", e.target.checked)}
                                    className="rounded"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
