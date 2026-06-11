import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateUserModal from "./CreateUserModal";
import CreateRoleModal from "../roles/CreateRoleModal";
import { useCompanyStore } from "../../core/store/useCompanyStore";

interface User {
  id: string;
  email: string;
  name?: string;
  roleCode?: string;
  roleName?: string;
  isActive: boolean;
}

interface Permission {
  id: string;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  subPermissions?: string[] | null;
}

interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  permissions?: Permission[];
}

export default function UsersPage() {
  const { activeCompany } = useCompanyStore();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [localPermissions, setLocalPermissions] = useState<Permission[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeCompany?.id]);

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

  async function handleRoleClick(role: Role) {
    setSelectedRole(role);
    setLocalPermissions(role.permissions || []);
    setPermissionsModalOpen(true);
  }

  function deleteUser(id: string) {
    setDeleteConfirmId(id);
    setDeleteConfirmOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirmId) return;
    setDeleteConfirmOpen(false);
    try {
      await api.delete(`/users/${deleteConfirmId}`);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible eliminar el usuario");
    } finally {
      setDeleteConfirmId(null);
    }
  }

  function handleEditUser(user: User) {
    setSelectedUser(user);
    setModalOpen(true);
  }

  function handleCreateUser() {
    setSelectedUser(null);
    setModalOpen(true);
  }

  function handleCloseUserModal() {
    setModalOpen(false);
    setSelectedUser(null);
  }

  async function updatePermission(module: string, field: keyof Permission, value: boolean) {
    if (!selectedRole) return;

    // Optimistic update
    const previousPermissions = [...localPermissions];
    setLocalPermissions((prev) =>
      prev.map((p) =>
        p.module === module ? { ...p, [field]: value } : p
      )
    );

    try {
      await api.put(`/roles/${selectedRole.id}/permissions/${module}`, { [field]: value });
      loadData();
    } catch (err: any) {
      // Revert on error
      setLocalPermissions(previousPermissions);
      setError(err.response?.data?.message || "No fue posible actualizar permiso");
    }
  }

  async function updateSubPermission(module: string, subPermissionKey: string, value: boolean) {
    if (!selectedRole) return;

    const permission = localPermissions.find((p) => p.module === module);
    if (!permission) return;

    const currentSubPermissions = permission.subPermissions || [];
    const previousPermissions = [...localPermissions];

    let newSubPermissions: string[];
    if (value) {
      newSubPermissions = [...currentSubPermissions, subPermissionKey];
    } else {
      newSubPermissions = currentSubPermissions.filter((key) => key !== subPermissionKey);
    }

    // Optimistic update
    setLocalPermissions((prev) =>
      prev.map((p) =>
        p.module === module ? { ...p, subPermissions: newSubPermissions } : p
      )
    );

    try {
      await api.put(`/roles/${selectedRole.id}/permissions/${module}`, { subPermissions: newSubPermissions });
      loadData();
    } catch (err: any) {
      setLocalPermissions(previousPermissions);
      setError(err.response?.data?.message || "No fue posible actualizar sub-permiso");
    }
  }

  async function activateAll() {
    if (!selectedRole) return;

    // Optimistic update
    const previousPermissions = [...localPermissions];
    setLocalPermissions((prev) =>
      prev.map((p) => ({
        ...p,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      }))
    );

    try {
      const modules = localPermissions.map((p) => p.module);
      await Promise.all(
        modules.map((module) =>
          api.put(`/roles/${selectedRole!.id}/permissions/${module}`, {
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
          }),
        ),
      );
      loadData();
    } catch (err: any) {
      setLocalPermissions(previousPermissions);
      setError(err.response?.data?.message || "No fue posible activar todos los permisos");
    }
  }

  async function deactivateAll() {
    if (!selectedRole) return;

    // Optimistic update
    const previousPermissions = [...localPermissions];
    setLocalPermissions((prev) =>
      prev.map((p) => ({
        ...p,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      }))
    );

    try {
      const modules = localPermissions.map((p) => p.module);
      await Promise.all(
        modules.map((module) =>
          api.put(`/roles/${selectedRole!.id}/permissions/${module}`, {
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
          }),
        ),
      );
      loadData();
    } catch (err: any) {
      setLocalPermissions(previousPermissions);
      setError(err.response?.data?.message || "No fue posible desactivar todos los permisos");
    }
  }

  async function setReadOnly() {
    if (!selectedRole) return;

    // Optimistic update
    const previousPermissions = [...localPermissions];
    setLocalPermissions((prev) =>
      prev.map((p) => ({
        ...p,
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      }))
    );

    try {
      const modules = localPermissions.map((p) => p.module);
      await Promise.all(
        modules.map((module) =>
          api.put(`/roles/${selectedRole!.id}/permissions/${module}`, {
            canView: true,
            canCreate: false,
            canEdit: false,
            canDelete: false,
          }),
        ),
      );
      loadData();
    } catch (err: any) {
      setLocalPermissions(previousPermissions);
      setError(err.response?.data?.message || "No fue posible establecer solo lectura");
    }
  }

  const moduleIcons: Record<string, string> = {
    DASHBOARD: "📊",
    COMPANIES: "🏢",
    BRANCHES: "🏪",
    USERS: "👤",
    ROLES: "👥",
    BANKS: "🏦",
    MOVEMENTS: "🧾",
    TRANSFERS: "🔁",
    REPORTS: "📑",
    TREASURY: "💰",
    RECONCILIATION: "📋",
    ADMINISTRATION: "🔐",
    SETTINGS: "⚙️",
  };

  const moduleNames: Record<string, string> = {
    DASHBOARD: "Dashboard",
    COMPANIES: "Empresas",
    BRANCHES: "Sucursales",
    USERS: "Usuarios",
    ROLES: "Roles",
    BANKS: "Bancos",
    MOVEMENTS: "Movimientos",
    TRANSFERS: "Traslado de Fondos",
    REPORTS: "Reportes",
    POS: "POS",
    TREASURY: "Tesorería",
    RECONCILIATION: "Conciliación",
    ADMINISTRATION: "Administración",
    SETTINGS: "Configuración",
  };

  const subPermissionsConfig: Record<string, { label: string; key: string }[]> = {
    REPORTS: [
      { label: "Reporte de ventas", key: "sales_report" },
      { label: "Reporte de gastos", key: "expenses_report" },
      { label: "Reporte de compras", key: "purchases_report" },
      { label: "Descuentos y cortesías", key: "discounts_courtesies" },
      { label: "Venta por área/grupo/mesa", key: "sales_by_area" },
      { label: "Flujo de efectivo", key: "cash_flow" },
      { label: "Balance por cuenta", key: "balance_by_account" },
      { label: "Estado de resultados", key: "income_statement" },
      { label: "Punto de equilibrio", key: "break_even_point" },
    ],
    POS: [
      { label: "Apertura y cierre de turno", key: "open_close_shift" },
      { label: "Cancelar productos", key: "cancel_products" },
      { label: "Cancelar ticket completo", key: "cancel_ticket" },
      { label: "Aplicar descuentos", key: "apply_discounts" },
      { label: "Aplicar cortesías", key: "apply_courtesies" },
      { label: "Ver costos en pantalla", key: "view_costs" },
      { label: "Reimprimir tickets", key: "reprint_tickets" },
      { label: "Cambio de precio manual", key: "manual_price_change" },
      { label: "Cobro con tarjeta", key: "card_payment" },
      { label: "Cobro en efectivo", key: "cash_payment" },
      { label: "Dividir cuenta", key: "split_bill" },
      { label: "Transferir mesa", key: "transfer_table" },
      { label: "Abrir cajón de dinero", key: "open_cash_drawer" },
    ],
    MOVEMENTS: [
      { label: "Ver solo movimientos propios", key: "view_own_movements" },
      { label: "Ver todos los movimientos", key: "view_all_movements" },
      { label: "Aprobar movimientos", key: "approve_movements" },
      { label: "Exportar movimientos", key: "export_movements" },
    ],
    RECONCILIATION: [
      { label: "Ver conciliaciones", key: "view_reconciliations" },
      { label: "Conciliar manualmente", key: "manual_reconciliation" },
      { label: "Aprobar conciliación", key: "approve_reconciliation" },
    ],
  };

  function toggleCardExpansion(module: string) {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(module)) {
        newSet.delete(module);
      } else {
        newSet.add(module);
      }
      return newSet;
    });
  }

  function hasSubPermissions(module: string): boolean {
    return module in subPermissionsConfig;
  }

  return (
    <MainLayout>
      <CreateUserModal
        open={modalOpen}
        onClose={handleCloseUserModal}
        onCreated={loadData}
        user={selectedUser}
      />
      <CreateRoleModal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        onCreated={loadData}
      />

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-base font-semibold text-white mb-2">Eliminar usuario</h3>
            <p className="text-sm text-slate-400 mb-6">¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmId(null); }}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

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
              onClick={handleCreateUser}
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
                        onClick={() => handleRoleClick(role)}
                        className="rounded-xl border border-slate-800 bg-slate-900 p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
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

                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-green-900/40 px-3 py-1 text-sm text-green-300">
                            {user.isActive ? "Activo" : "Inactivo"}
                          </span>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Permisos */}
        {permissionsModalOpen && selectedRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <div className="w-full max-w-6xl h-[90vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col">
              {/* Header */}
              <div className="border-b border-slate-700 p-6 bg-slate-800/50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">{selectedRole.name}</h3>
                    <p className="text-sm text-slate-400">{selectedRole.description || "Sin descripción"}</p>
                    <p className="text-xs text-slate-500 mt-1">Código: {selectedRole.code}</p>
                  </div>
                  <button
                    onClick={() => setPermissionsModalOpen(false)}
                    className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Botones de acción rápida */}
              <div className="border-b border-slate-700 p-4 bg-slate-800/30">
                <div className="flex gap-3">
                  <button
                    onClick={activateAll}
                    className="rounded-lg bg-green-600/20 border border-green-600/50 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-600/30 transition-colors"
                  >
                    ✅ Activar todo
                  </button>
                  <button
                    onClick={deactivateAll}
                    className="rounded-lg bg-red-600/20 border border-red-600/50 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-600/30 transition-colors"
                  >
                    ❌ Desactivar todo
                  </button>
                  <button
                    onClick={setReadOnly}
                    className="rounded-lg bg-blue-600/20 border border-blue-600/50 px-4 py-2 text-sm font-medium text-blue-400 hover:bg-blue-600/30 transition-colors"
                  >
                    👁️ Solo lectura
                  </button>
                </div>
              </div>

              {/* Grid de permisos */}
              <div className="flex-1 overflow-y-auto p-4">
                {localPermissions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {localPermissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-800/70 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">{moduleIcons[permission.module] || "📦"}</span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white text-xs">
                              {moduleNames[permission.module] || permission.module}
                            </h4>
                          </div>
                          {hasSubPermissions(permission.module) && (
                            <button
                              onClick={() => toggleCardExpansion(permission.module)}
                              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              {expandedCards.has(permission.module) ? "▲" : "▼"}
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Ver</span>
                            <button
                              onClick={() => updatePermission(permission.module, "canView", !permission.canView)}
                              className={`w-10 h-5 rounded-full transition-colors ${
                                permission.canView ? "bg-blue-600" : "bg-slate-700"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                  permission.canView ? "translate-x-5" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Crear</span>
                            <button
                              onClick={() => updatePermission(permission.module, "canCreate", !permission.canCreate)}
                              className={`w-10 h-5 rounded-full transition-colors ${
                                permission.canCreate ? "bg-blue-600" : "bg-slate-700"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                  permission.canCreate ? "translate-x-5" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Editar</span>
                            <button
                              onClick={() => updatePermission(permission.module, "canEdit", !permission.canEdit)}
                              className={`w-10 h-5 rounded-full transition-colors ${
                                permission.canEdit ? "bg-blue-600" : "bg-slate-700"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                  permission.canEdit ? "translate-x-5" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Eliminar</span>
                            <button
                              onClick={() => updatePermission(permission.module, "canDelete", !permission.canDelete)}
                              className={`w-10 h-5 rounded-full transition-colors ${
                                permission.canDelete ? "bg-blue-600" : "bg-slate-700"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                  permission.canDelete ? "translate-x-5" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Panel de sub-permisos */}
                        {hasSubPermissions(permission.module) && expandedCards.has(permission.module) && (
                          <div className={`mt-3 pt-3 border-t border-slate-700 ${!permission.canView ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="space-y-1.5">
                              {subPermissionsConfig[permission.module]?.map((subPerm) => {
                                const isChecked = (permission.subPermissions || []).includes(subPerm.key);
                                return (
                                  <div key={subPerm.key} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => updateSubPermission(permission.module, subPerm.key, e.target.checked)}
                                      className="rounded w-3 h-3"
                                    />
                                    <span className="text-xs text-slate-300">{subPerm.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-800/50 p-8 text-center text-slate-400">
                    <p className="text-lg">No hay permisos configurados para este rol</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-700 p-4 bg-slate-800/50">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setPermissionsModalOpen(false)}
                    className="rounded-lg bg-slate-700 px-6 py-2 text-sm font-medium text-white hover:bg-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setPermissionsModalOpen(false)}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
