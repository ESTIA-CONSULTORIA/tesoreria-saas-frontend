import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateUserModal from "./CreateUserModal";
import CreateRoleModal from "../roles/CreateRoleModal";

interface User {
  id: string;
  email: string;
  name?: string;
  roleCode?: string;
  roleName?: string;
  isActive: boolean;
}

interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [usersResponse, rolesResponse] = await Promise.all([
        api.get("/users"),
        api.get("/roles"),
      ]);

      const usersList = Array.isArray(usersResponse.data) ? usersResponse.data : [];
      const rolesList = Array.isArray(rolesResponse.data) ? rolesResponse.data : [];

      // Mapear nombres de roles a usuarios
      const usersWithRoleNames = usersList.map((user: User) => {
        const role = rolesList.find((r: Role) => r.code === user.roleCode);
        return { ...user, roleName: role?.name };
      });

      setUsers(usersWithRoleNames);
      setRoles(rolesList);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar datos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <CreateUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadData}
      />
      <CreateRoleModal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        onCreated={loadData}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Usuarios y Roles</h2>
            <p className="text-slate-400">Administración de usuarios y roles</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setRoleModalOpen(true)}
              className="rounded-lg bg-slate-700 px-4 py-2 font-medium text-white hover:bg-slate-600"
            >
              + Nuevo Rol
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              + Nuevo Usuario
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando datos...</div>
        ) : (
          <div className="space-y-8">
            {/* Sección de Roles */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Roles</h3>
              <div className="space-y-4">
                {roles.length === 0 ? (
                  <div className="rounded-xl bg-slate-900 p-6">
                    No existen roles registrados
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                      >
                        <div className="flex flex-col gap-2">
                          <div>
                            <h4 className="text-lg font-semibold">{role.name}</h4>
                            <p className="text-sm text-slate-400">Código: {role.code}</p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {role.description || "Sin descripción"}
                          </p>
                          <span className="rounded-full bg-green-900/40 px-3 py-1 text-sm text-green-300 w-fit">
                            {role.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sección de Usuarios */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Usuarios</h3>
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
                            Rol: {user.roleName || user.roleCode || "USER"}
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
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
