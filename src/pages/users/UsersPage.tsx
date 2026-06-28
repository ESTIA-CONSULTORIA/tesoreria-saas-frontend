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
  companyId?: string;
  branchId?: string;
}

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

const MODULE_KEYS = [
  'DASHBOARD', 'COMPANIES', 'BRANCHES', 'USERS', 'ROLES',
  'BANKS', 'MOVEMENTS', 'TRANSFERS', 'REPORTS', 'POS',
  'TREASURY', 'RECONCILIATION', 'ADMINISTRATION', 'SETTINGS',
] as const;

const MODULE_NAMES: Record<string, string> = {
  DASHBOARD: 'Dashboard',      COMPANIES: 'Empresas',
  BRANCHES: 'Sucursales',      USERS: 'Usuarios',
  ROLES: 'Roles',              BANKS: 'Bancos',
  MOVEMENTS: 'Movimientos',    TRANSFERS: 'Traslado de Fondos',
  REPORTS: 'Reportes',         POS: 'POS',
  TREASURY: 'Tesorería',       RECONCILIATION: 'Conciliación',
  ADMINISTRATION: 'Administración', SETTINGS: 'Configuración',
};

export default function UsersPage() {
  const { activeCompany } = useCompanyStore();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Two-panel state
  const [selectedRol, setSelectedRol] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [view, setView] = useState<'rol' | 'user' | null>(null);
  const [localPermissions, setLocalPermissions] = useState<Permission[]>([]);

  useEffect(() => { loadData(); }, [activeCompany?.id]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [usersRes, rolesRes] = await Promise.all([api.get("/users"), api.get("/roles")]);
      const usersList = Array.isArray(usersRes.data) ? usersRes.data : [];
      const rolesList = Array.isArray(rolesRes.data) ? rolesRes.data : [];
      setUsers(usersList.map((u: User) => {
        const role = rolesList.find((r: Role) => r.code === u.roleCode);
        return { ...u, roleName: role?.name };
      }));
      setRoles(rolesList);
      // Refresh selected role permissions
      if (selectedRol) {
        const updated = rolesList.find((r: Role) => r.id === selectedRol.id);
        if (updated) { setSelectedRol(updated); setLocalPermissions(updated.permissions || []); }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar datos");
    } finally {
      setLoading(false);
    }
  }

  async function updatePermission(module: string, field: keyof Permission, value: boolean) {
    if (!selectedRol) return;
    const prev = [...localPermissions];
    setLocalPermissions(ps => ps.map(p => p.module === module ? { ...p, [field]: value } : p));
    try {
      await api.put(`/roles/${selectedRol.id}/permissions/${module}`, { [field]: value });
      loadData();
    } catch (err: any) {
      setLocalPermissions(prev);
      setError(err.response?.data?.message || "No fue posible actualizar permiso");
    }
  }

  async function activateAll() {
    if (!selectedRol) return;
    const prev = [...localPermissions];
    const all = { canView: true, canCreate: true, canEdit: true, canDelete: true };
    setLocalPermissions(ps => ps.map(p => ({ ...p, ...all })));
    try {
      await Promise.all(localPermissions.map(p => api.put(`/roles/${selectedRol!.id}/permissions/${p.module}`, all)));
      loadData();
    } catch (err: any) { setLocalPermissions(prev); setError("Error al activar permisos"); }
  }

  async function deactivateAll() {
    if (!selectedRol) return;
    const prev = [...localPermissions];
    const none = { canView: false, canCreate: false, canEdit: false, canDelete: false };
    setLocalPermissions(ps => ps.map(p => ({ ...p, ...none })));
    try {
      await Promise.all(localPermissions.map(p => api.put(`/roles/${selectedRol!.id}/permissions/${p.module}`, none)));
      loadData();
    } catch (err: any) { setLocalPermissions(prev); setError("Error al desactivar permisos"); }
  }

  async function setReadOnly() {
    if (!selectedRol) return;
    const prev = [...localPermissions];
    const ro = { canView: true, canCreate: false, canEdit: false, canDelete: false };
    setLocalPermissions(ps => ps.map(p => ({ ...p, ...ro })));
    try {
      await Promise.all(localPermissions.map(p => api.put(`/roles/${selectedRol!.id}/permissions/${p.module}`, ro)));
      loadData();
    } catch (err: any) { setLocalPermissions(prev); setError("Error al establecer solo lectura"); }
  }

  function handleSelectAll(value: boolean) { if (value) activateAll(); else deactivateAll(); }
  function handleViewOnly() { setReadOnly(); }
  function handleSavePermissions() { loadData(); }

  function handleDelete(id: string) { setDeleteConfirmId(id); setDeleteConfirmOpen(true); }

  async function handleDeleteConfirm() {
    if (!deleteConfirmId) return;
    setDeleteConfirmOpen(false);
    try {
      await api.delete(`/users/${deleteConfirmId}`);
      if (selectedUser?.id === deleteConfirmId) { setSelectedUser(null); setView(null); }
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible eliminar el usuario");
    } finally { setDeleteConfirmId(null); }
  }

  function handleCloseUserModal() { setModalOpen(false); setEditingUser(null); }

  return (
    <MainLayout>
      <CreateUserModal open={modalOpen} onClose={handleCloseUserModal} onCreated={loadData} user={editingUser} />
      <CreateRoleModal open={roleModalOpen} onClose={() => setRoleModalOpen(false)} onCreated={loadData} />

      {deleteConfirmOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ width: 360, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#141820', padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#c8cdd8', marginBottom: 8 }}>Eliminar usuario</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>¿Estás seguro? Esta acción no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmId(null); }}
                style={{ padding: '6px 16px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#c8cdd8', fontSize: 12, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleDeleteConfirm}
                style={{ padding: '6px 16px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '0 0 16px' }}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#c8cdd8', marginBottom: 2 }}>Usuarios y Roles</h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Administración de usuarios y roles</p>
        </div>

        {error && (
          <div style={{ marginBottom: 10, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: 12 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: 24 }}>Cargando datos...</div>
        ) : (
          <div style={{ display: 'flex', height: 'calc(100vh - 130px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>

            {/* ── PANEL IZQUIERDO ── */}
            <div style={{ width: 260, borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', background: '#0f1117', flexShrink: 0 }}>

              {/* Header Roles */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Roles</span>
                <button onClick={() => setRoleModalOpen(true)}
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#c8cdd8', cursor: 'pointer' }}>
                  + Nuevo
                </button>
              </div>
              {/* Lista roles */}
              <div style={{ flexShrink: 0 }}>
                {roles.map(rol => (
                  <div key={rol.id}
                    onClick={() => { setSelectedRol(rol); setLocalPermissions(rol.permissions || []); setSelectedUser(null); setView('rol'); }}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: selectedRol?.id === rol.id ? 'rgba(123,156,204,0.1)' : 'transparent',
                      borderLeft: selectedRol?.id === rol.id ? '3px solid #8fafd4' : '3px solid transparent',
                    }}>
                    <div style={{ fontSize: 12, color: '#c8cdd8' }}>{rol.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>{rol.code}</div>
                  </div>
                ))}
              </div>

              {/* Header Usuarios */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Usuarios</span>
                <button onClick={() => { setEditingUser(null); setModalOpen(true); }}
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(123,156,204,0.3)', background: 'rgba(123,156,204,0.08)', color: '#8fafd4', cursor: 'pointer' }}>
                  + Nuevo
                </button>
              </div>
              {/* Lista usuarios */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {users.map(u => (
                  <div key={u.id}
                    onClick={() => { setSelectedUser(u); setSelectedRol(null); setView('user'); }}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: selectedUser?.id === u.id ? 'rgba(123,156,204,0.1)' : 'transparent',
                      borderLeft: selectedUser?.id === u.id ? '3px solid #8fafd4' : '3px solid transparent',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 12, color: '#c8cdd8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || u.email}</div>
                      <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 99, flexShrink: 0,
                        background: u.isActive ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                        color: u.isActive ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>{u.roleCode}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── PANEL DERECHO ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#141820', minWidth: 0 }}>

              {/* Estado vacío */}
              {!view && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.18)', fontSize: 13 }}>
                  Selecciona un rol o usuario para ver el detalle
                </div>
              )}

              {/* Vista ROL — tabla de permisos */}
              {view === 'rol' && selectedRol && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#c8cdd8' }}>{selectedRol.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{selectedRol.description} · {selectedRol.code}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button onClick={() => handleSelectAll(true)}
                        style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)', color: '#4ade80', fontSize: 11, cursor: 'pointer' }}>
                        ✓ Activar todo
                      </button>
                      <button onClick={() => handleSelectAll(false)}
                        style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(252,165,165,0.2)', background: 'transparent', color: 'rgba(252,165,165,0.7)', fontSize: 11, cursor: 'pointer' }}>
                        ✕ Desactivar todo
                      </button>
                      <button onClick={handleViewOnly}
                        style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}>
                        Solo lectura
                      </button>
                      <button onClick={handleSavePermissions}
                        style={{ padding: '4px 12px', borderRadius: 7, border: '1px solid rgba(123,156,204,0.3)', background: 'rgba(123,156,204,0.1)', color: '#8fafd4', fontSize: 11, cursor: 'pointer' }}>
                        Guardar cambios
                      </button>
                    </div>
                  </div>
                  {/* Tabla permisos */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, background: '#141820', zIndex: 1 }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Módulo</div>
                      {['Ver', 'Crear', 'Editar', 'Eliminar'].map(a => (
                        <div key={a} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>{a}</div>
                      ))}
                    </div>
                    {MODULE_KEYS.map(key => {
                      const perm = localPermissions.find(p => p.module === key);
                      return (
                        <div key={key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                          <div style={{ fontSize: 12, color: '#c8cdd8' }}>{MODULE_NAMES[key]}</div>
                          {(['canView', 'canCreate', 'canEdit', 'canDelete'] as const).map(action => (
                            <div key={action} style={{ display: 'flex', justifyContent: 'center' }}>
                              <input type="checkbox"
                                checked={perm ? !!perm[action] : false}
                                onChange={e => updatePermission(key, action, e.target.checked)}
                                disabled={!perm}
                                style={{ width: 15, height: 15, cursor: perm ? 'pointer' : 'not-allowed', accentColor: '#8fafd4' }}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vista USUARIO — detalle */}
              {view === 'user' && selectedUser && (
                <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 500, color: '#c8cdd8', marginBottom: 4 }}>{selectedUser.name || selectedUser.email}</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{selectedUser.email}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Rol: {selectedUser.roleCode}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setEditingUser(selectedUser); setModalOpen(true); }}
                        style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#c8cdd8', fontSize: 12, cursor: 'pointer' }}>
                        Editar
                      </button>
                      <button onClick={() => handleDelete(selectedUser.id)}
                        style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(252,165,165,0.2)', background: 'transparent', color: 'rgba(252,165,165,0.7)', fontSize: 12, cursor: 'pointer' }}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Estado', value: selectedUser.isActive ? 'Activo' : 'Inactivo' },
                      { label: 'Rol', value: selectedUser.roleName || selectedUser.roleCode || '—' },
                      { label: 'Empresa', value: selectedUser.companyId || 'Todas' },
                      { label: 'Sucursal', value: selectedUser.branchId || 'Todas' },
                    ].map(item => (
                      <div key={item.label} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: '#0f1117' }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                        <div style={{ fontSize: 13, color: '#c8cdd8' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </MainLayout>
  );
}
