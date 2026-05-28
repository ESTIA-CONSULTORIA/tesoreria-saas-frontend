import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateRoleModal from "./CreateRoleModal";

interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

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
            <p className="text-slate-400">Administracion de roles</p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            + Nuevo Rol
          </button>
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

                    <span className="rounded-full bg-green-900/40 px-3 py-1 text-sm text-green-300">
                      {role.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
