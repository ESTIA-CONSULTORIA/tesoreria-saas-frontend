import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateUserModal from "./CreateUserModal";

interface User {
  id: string;
  email: string;
  name?: string;
  roleCode?: string;
  isActive: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/users");
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <CreateUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadUsers}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Usuarios</h2>
            <p className="text-slate-400">Administracion de usuarios</p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            + Nuevo Usuario
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando usuarios...</div>
        ) : (
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="rounded-xl bg-slate-900 p-6">
                No existen usuarios registrados
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {user.name || "Sin nombre"}
                      </h3>

                      <p className="text-sm text-slate-400">{user.email}</p>

                      <p className="text-xs text-slate-500">
                        Rol: {user.roleCode || "USER"}
                      </p>
                    </div>

                    <span className="rounded-full bg-green-900/40 px-3 py-1 text-sm text-green-300">
                      {user.isActive ? "Activo" : "Inactivo"}
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
