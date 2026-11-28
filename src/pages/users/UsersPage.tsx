import { useEffect, useState } from "react";
import { usePuede } from "../../core/hooks/usePuede";
import { activarConTeclado } from '../../core/utils/accesoTeclado';
import MainLayout from "../../core/layout/MainLayout";
import MatrizPermisos from '../permisos/MatrizPermisos';
import { api } from "../../core/api/api";
import CreateUserModal from "./CreateUserModal";
import CreateRoleModal from "../roles/CreateRoleModal";
import { useCompanyStore } from "../../core/store/useCompanyStore";
import { useAuthStore } from "../../core/store/useAuthStore";
import { etiquetaAmbito, etiquetaNegocio } from "./etiquetasUsuario";
import { leerNegocioActivo } from "../../core/api/negocioActivo";

interface User {
  id: string;
  email: string;
  name?: string;
  roleCode?: string;
  roleName?: string;
  isActive: boolean;
  companyId?: string;
  branchId?: string;
  tenantId?: string;
  tenantNombre?: string | null;
  empresaNombre?: string | null;
  sucursalNombre?: string | null;
  tienePinEjecutivo?: boolean;
}

interface Negocio {
  id: string;
  tradeName?: string;
  legalName?: string;
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

const TXT = '#c8cdd8';
const ACENTO = '#8fafd4';
const TXT_SUAVE = 'rgba(255,255,255,0.62)';
const FONDO_LISTA = '#0f1117';
const FONDO_DETALLE = '#141820';

export default function UsersPage() {
  const puedeEliminarUsuarios = usePuede('usuarios', 'eliminar');
  const puedeCrearUsuarios = usePuede('usuarios', 'crear');
  const puedeEditarUsuarios = usePuede('usuarios', 'editar');
  const { activeCompany } = useCompanyStore();
  const esSoporte = useAuthStore((s) => s.user?.roleCode) === "SOPORTE";
  // Solo SOPORTE elige negocio ("" = todos); el servidor ignora ?tenantId= para cualquier otro rol.
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  // Arranca en el negocio activo global de SOPORTE (barra superior); aquí además existe «Todos» ("")
  const [negocioSel, setNegocioSel] = useState(() => (esSoporte ? leerNegocioActivo(localStorage)?.id ?? "" : ""));
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [avisoPin, setAvisoPin] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Two-panel state
  const [selectedRol, setSelectedRol] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [view, setView] = useState<'rol' | 'user' | null>(null);
  const [localPermissions, setLocalPermissions] = useState<Permission[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  useEffect(() => { loadData(); }, [activeCompany?.id, negocioSel]);
  useEffect(() => {
    if (!esSoporte) return;
    api.get("/tenants").then((r) => setNegocios(Array.isArray(r.data) ? r.data : [])).catch(() => setNegocios([]));
  }, [esSoporte]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [usersRes, rolesRes] = await Promise.all([api.get("/users", esSoporte ? { params: { tenantId: negocioSel } } : undefined), api.get("/roles")]);
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

  const textoBusqueda = busqueda.trim().toLowerCase();
  const usuariosVisibles = users.filter((u) =>
    (!selectedRol || u.roleCode === selectedRol.code) &&
    (filtroEstado === 'todos' || (filtroEstado === 'activos') === u.isActive) &&
    (!textoBusqueda || (u.name || '').toLowerCase().includes(textoBusqueda) || u.email.toLowerCase().includes(textoBusqueda)));
  const cuentaPorRol = (code: string) => users.filter((u) => u.roleCode === code).length;
  function elegirRol(rol: Role | null) {
    setSelectedUser(null);
    if (!rol) { setSelectedRol(null); setView(null); return; }
    setSelectedRol(rol); setLocalPermissions(rol.permissions || []); setView('rol');
  }

  function handleCloseUserModal() { setModalOpen(false); setEditingUser(null); }

  return (
    <MainLayout>
      <CreateUserModal open={modalOpen} onClose={handleCloseUserModal} onCreated={(aviso) => { loadData(); if (aviso) { setAvisoPin(aviso); window.setTimeout(() => setAvisoPin(""), 6000); } }} user={editingUser} negocioFiltro={negocioSel} />
      {avisoPin && <div role="status" style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 60, padding: '10px 16px', borderRadius: 8, background: FONDO_DETALLE, color: TXT, border: `1px solid ${ACENTO}`, fontSize: 13 }}>{avisoPin}</div>}
      <CreateRoleModal open={roleModalOpen} onClose={() => setRoleModalOpen(false)} onCreated={loadData} />

      {deleteConfirmOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ width: 360, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: FONDO_DETALLE, padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: TXT, marginBottom: 8 }}>Eliminar usuario</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>¿Estás seguro? Esta acción no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmId(null); }}
                style={{ padding: '6px 16px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: TXT, fontSize: 12, cursor: 'pointer' }}>
                Cancelar
              </button>
              {puedeEliminarUsuarios && <button onClick={handleDeleteConfirm}
                style={{ padding: '6px 16px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>
                Eliminar
              </button>}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '0 24px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ marginRight: 'auto' }}>
            <h2 className="text-content-1" style={{ fontSize: 16, fontWeight: 600, marginBottom: 0 }}>Usuarios y Roles</h2>
            <p className="text-content-2" style={{ fontSize: 12 }}>Administración de usuarios y roles</p>
          </div>
          {esSoporte && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="usuarios-negocio" className="text-content-3" style={{ fontSize: 12 }}>Negocio</label>
              <select id="usuarios-negocio" value={negocioSel}
                onChange={(ev) => { setNegocioSel(ev.target.value); setSelectedUser(null); setView(null); }}
                className="bg-surface-1 text-content-1 border border-line"
                style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, maxWidth: 260 }}>
                <option value="">Todos los negocios</option>
                {negocios.map((n) => (
                  <option key={n.id} value={n.id}>{n.tradeName || n.legalName || "Sin nombre"}</option>
                ))}
              </select>
            </div>
          )}
          <button onClick={() => setRoleModalOpen(true)}
            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: TXT, cursor: 'pointer' }}>
            + Nuevo rol
          </button>
          {puedeCrearUsuarios && <button onClick={() => { setEditingUser(null); setModalOpen(true); }}
            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(123,156,204,0.3)', background: 'rgba(123,156,204,0.08)', color: ACENTO, cursor: 'pointer' }}>
            + Nuevo usuario
          </button>}
        </div>

        {error && (
          <div style={{ marginBottom: 8, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: 12 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-content-2" style={{ fontSize: 12, padding: 24 }}>Cargando datos...</div>
        ) : (
          <div style={{ display: 'flex', height: 'calc(100vh - 190px)', minHeight: 320, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>

            {/* ── LISTA DE USUARIOS (principal) ── */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: FONDO_LISTA }}>

              {/* Roles: chips compactos que filtran */}
              <div role="group" aria-label="Filtrar por rol" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <button type="button" onClick={() => elegirRol(null)} aria-pressed={!selectedRol}
                  style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, cursor: 'pointer', color: !selectedRol ? ACENTO : TXT,
                    border: !selectedRol ? '1px solid rgba(123,156,204,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    background: !selectedRol ? 'rgba(123,156,204,0.12)' : 'transparent' }}>
                  Todos ({users.length})
                </button>
                {roles.map((rol) => {
                  const activo = selectedRol?.id === rol.id;
                  return (
                    <button type="button" key={rol.id} onClick={() => elegirRol(rol)} aria-pressed={activo} title={rol.code}
                      style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, cursor: 'pointer', color: activo ? ACENTO : TXT,
                        border: activo ? '1px solid rgba(123,156,204,0.5)' : '1px solid rgba(255,255,255,0.1)',
                        background: activo ? 'rgba(123,156,204,0.12)' : 'transparent' }}>
                      {rol.name} ({cuentaPorRol(rol.code)})
                    </button>
                  );
                })}
              </div>

              {/* Buscador y estado */}
              <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', alignItems: 'center' }}>
                <input type="search" aria-label="Buscar usuario por nombre o correo" placeholder="Buscar por nombre o correo"
                  value={busqueda} onChange={(ev) => setBusqueda(ev.target.value)}
                  className="bg-surface-1 text-content-1 border border-line"
                  style={{ flex: 1, minWidth: 0, fontSize: 12, padding: '5px 10px', borderRadius: 6 }} />
                <select aria-label="Filtrar por estado" value={filtroEstado} onChange={(ev) => setFiltroEstado(ev.target.value as 'todos' | 'activos' | 'inactivos')}
                  className="bg-surface-1 text-content-1 border border-line" style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6 }}>
                  <option value="todos">Todos los estados</option>
                  <option value="activos">Activos</option>
                  <option value="inactivos">Inactivos</option>
                </select>
                <span className="text-content-3" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{usuariosVisibles.length} de {users.length}</span>
              </div>

              {/* Tabla: scroll solo aquí */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                  <thead style={{ position: 'sticky', top: 0, background: FONDO_LISTA, zIndex: 1 }}>
                    <tr style={{ textAlign: 'left', color: TXT_SUAVE }}>
                      <th scope="col" style={{ padding: '6px 12px', fontWeight: 500 }}>Nombre</th>
                      <th scope="col" style={{ padding: '6px 8px', fontWeight: 500 }}>Correo</th>
                      <th scope="col" style={{ padding: '6px 8px', fontWeight: 500, width: 110 }}>Rol</th>
                      <th scope="col" style={{ padding: '6px 8px', fontWeight: 500 }}>{esSoporte ? 'Negocio · Sucursal' : 'Sucursal'}</th>
                      <th scope="col" style={{ padding: '6px 12px 6px 8px', fontWeight: 500, width: 80 }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosVisibles.map((u) => {
                      const sel = selectedUser?.id === u.id;
                      const abrir = () => { setSelectedUser(u); setSelectedRol(null); setView('user'); };
                      const celda = { padding: '7px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;
                      return (
                        <tr key={u.id} onClick={abrir} {...activarConTeclado(abrir)} aria-pressed={sel}
                          style={{ cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.04)', color: TXT,
                            background: sel ? 'rgba(123,156,204,0.1)' : 'transparent' }}>
                          <td style={{ ...celda, paddingLeft: 12, borderLeft: sel ? '3px solid #8fafd4' : '3px solid transparent' }}>{u.name || u.email}</td>
                          <td style={{ ...celda, color: TXT_SUAVE }}>{u.email}</td>
                          <td style={celda}>{u.roleName || u.roleCode}</td>
                          <td style={{ ...celda, color: TXT_SUAVE }}>
                            {esSoporte ? `${etiquetaNegocio(u.tenantNombre, u.tenantId)} · ` : ''}{etiquetaAmbito(u.sucursalNombre, u.branchId)}
                          </td>
                          <td style={{ ...celda, paddingRight: 12 }}>
                            <span style={{ fontSize: 12, padding: '1px 6px', borderRadius: 99,
                              background: u.isActive ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                              color: u.isActive ? '#4ade80' : TXT_SUAVE }}>
                              {u.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {usuariosVisibles.length === 0 && (
                  <div className="text-content-2" style={{ fontSize: 12, padding: 24, textAlign: 'center' }}>
                    {users.length === 0 ? 'Aún no hay usuarios.' : 'Ningún usuario coincide con el filtro.'}
                  </div>
                )}
              </div>
            </div>

            {/* ── DETALLE (rol o usuario), solo cuando hay selección ── */}
            {view && (
              <div style={{ width: view === 'rol' ? 520 : 340, maxWidth: '55%', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', background: FONDO_DETALLE, minWidth: 0, flexShrink: 0 }}>
                {view === 'rol' && selectedRol && (
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <MatrizPermisos rolCode={selectedRol.code} rolNombre={selectedRol.name} descripcion={selectedRol.description} />
                  </div>
                )}

                {view === 'user' && selectedUser && (
                  <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 16, fontWeight: 500, color: TXT, marginBottom: 4 }}>{selectedUser.name || selectedUser.email}</div>
                      <div style={{ fontSize: 12, color: TXT_SUAVE, overflowWrap: 'anywhere' }}>{selectedUser.email}</div>
                      {(selectedUser.roleCode === 'ADMIN' || selectedUser.roleCode === 'GERENTE') && (
                        <div style={{ fontSize: 12, color: TXT_SUAVE, marginTop: 4 }}>PIN ejecutivo (autoriza retiros): {selectedUser.tienePinEjecutivo ? 'asignado' : 'sin asignar'}</div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {puedeEditarUsuarios && <button onClick={() => { setEditingUser(selectedUser); setModalOpen(true); }}
                          style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: TXT, fontSize: 12, cursor: 'pointer' }}>
                          Editar
                        </button>}
                        {puedeEliminarUsuarios && <button onClick={() => handleDelete(selectedUser.id)}
                          style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(252,165,165,0.2)', background: 'transparent', color: 'rgba(252,165,165,0.7)', fontSize: 12, cursor: 'pointer' }}>
                          Eliminar
                        </button>}
                        <button onClick={() => { setSelectedUser(null); setView(null); }}
                          style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: TXT_SUAVE, fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}>
                          Cerrar
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                      {[
                        { label: 'Estado', value: selectedUser.isActive ? 'Activo' : 'Inactivo' },
                        { label: 'Rol', value: selectedUser.roleName || selectedUser.roleCode || '—' },
                        { label: 'Negocio', value: etiquetaNegocio(selectedUser.tenantNombre, selectedUser.tenantId) },
                        { label: 'Empresa', value: etiquetaAmbito(selectedUser.empresaNombre, selectedUser.companyId) },
                        { label: 'Sucursal', value: etiquetaAmbito(selectedUser.sucursalNombre, selectedUser.branchId) },
                      ].map(item => (
                        <div key={item.label} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: FONDO_LISTA }}>
                          <div style={{ fontSize: 12, color: TXT_SUAVE, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                          <div style={{ fontSize: 13, color: TXT }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </MainLayout>
  );
}
