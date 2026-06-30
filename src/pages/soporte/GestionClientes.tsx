import { useEffect, useState } from "react";
import { api } from "../../core/api/api";
import MainLayout from "../../core/layout/MainLayout";

interface Tenant {
  id: string;
  legalName: string;
  tradeName: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  taxId?: string;
}

interface TenantDetail extends Tenant {
  adminUser?: {
    email: string;
    name: string;
  };
  modules?: string[];
  history?: Array<{
    date: string;
    action: string;
    details: string;
  }>;
}

const PLAN_MODULES: Record<string, string[]> = {
  LITE_CORTE: ['dashboard', 'corte-caja-lite', 'usuarios', 'empresas', 'sucursales', 'apariencia-logo-only'],
  LITE_POS:   ['dashboard', 'pos-sin-inventario', 'usuarios', 'empresas', 'sucursales', 'apariencia-logo-only'],
  BASIC:      ['dashboard', 'bancos', 'tesoreria'],
  PRO:        ['dashboard', 'bancos', 'tesoreria', 'compras', 'rh'],
  BUSINESS:   ['dashboard', 'bancos', 'tesoreria', 'compras', 'rh', 'reportes', 'integraciones'],
  ENTERPRISE: ['dashboard', 'bancos', 'tesoreria', 'compras', 'rh', 'reportes', 'integraciones', 'pos', 'conciliacion', 'audit'],
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', bancos: 'Bancos', tesoreria: 'Tesorería',
  compras: 'Compras', rh: 'RH', reportes: 'Reportes',
  integraciones: 'Integraciones', pos: 'POS / Corte Caja',
  conciliacion: 'Conciliación', audit: 'Auditoría',
  'corte-caja-lite': 'Corte de Caja', 'pos-sin-inventario': 'POS sin inventario',
  usuarios: 'Usuarios', empresas: 'Empresas', sucursales: 'Sucursales',
  'apariencia-logo-only': 'Apariencia (logo)',
};

export default function GestionClientes() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<TenantDetail | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editTenantOpen, setEditTenantOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editName, setEditName] = useState('');
  const [editPlan, setEditPlan] = useState('BASIC');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState('ADMIN');
  const [newUserLoading, setNewUserLoading] = useState(false);
  const [newUserError, setNewUserError] = useState('');
  const [newUserSuccess, setNewUserSuccess] = useState('');
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPlan, setNewPlan] = useState('BASIC');
  const [selectedModules, setSelectedModules] = useState<string[]>([...PLAN_MODULES['BASIC']]);
  const [newLoading, setNewLoading] = useState(false);
  const [newError, setNewError] = useState('');

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    try {
      const response = await api.get("/administration/tenants");
      setTenants(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error loading tenants:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleViewDetail(tenantId: string) {
    try {
      const response = await api.get(`/administration/tenants/${tenantId}`);
      setSelectedTenant(response.data);
      setDetailModalOpen(true);
    } catch (error) {
      console.error("Error loading tenant detail:", error);
    }
  }

  async function handleChangePlan(tenantId: string, newPlan: string) {
    try {
      await api.put(`/administration/tenants/${tenantId}/plan`, { plan: newPlan });
      loadTenants();
      setPlanModalOpen(false);
    } catch (error) {
      console.error("Error changing plan:", error);
    }
  }

  async function handleToggleStatus(tenantId: string, currentStatus: boolean) {
    try {
      await api.put(`/administration/tenants/${tenantId}`, { isActive: !currentStatus });
      loadTenants();
    } catch (error) {
      console.error("Error toggling tenant status:", error);
    }
  }

  function openEditTenant(tenant: Tenant) {
    setEditTenant(tenant);
    setEditName(tenant.legalName || tenant.tradeName || '');
    setEditPlan(tenant.plan || 'BASIC');
    setEditError('');
    setNewUserName(''); setNewUserEmail(''); setNewUserPass('');
    setNewUserRole('ADMIN'); setNewUserError(''); setNewUserSuccess('');
    setEditTenantOpen(true);
  }

  async function handleCreateUser() {
    if (!editTenant || !newUserEmail || !newUserPass) return;
    setNewUserLoading(true);
    setNewUserError('');
    setNewUserSuccess('');
    try {
      await api.post('/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPass,
        roleCode: newUserRole,
        tenantId: editTenant.id,
      });
      setNewUserSuccess('Usuario creado correctamente');
      setNewUserName(''); setNewUserEmail(''); setNewUserPass('');
    } catch (err: any) {
      setNewUserError(err.response?.data?.message || 'Error al crear usuario');
    } finally {
      setNewUserLoading(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTenant) return;
    setEditLoading(true);
    setEditError('');
    try {
      await api.put(`/tenants/${editTenant.id}`, {
        legalName: editName,
        tradeName: editName,
        plan: editPlan,
      });
      setEditTenantOpen(false);
      loadTenants();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setEditLoading(false);
    }
  }

  function handlePlanChange(plan: string) {
    setNewPlan(plan);
    setSelectedModules([...(PLAN_MODULES[plan] || [])]);
  }

  function toggleModule(mod: string) {
    setSelectedModules(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  }

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    setNewLoading(true);
    setNewError('');
    try {
      await api.post('/tenants', {
        legalName: newName,
        tradeName: newName,
        ownerName: newOwnerName,
        email: newEmail,
        password: newPassword,
        plan: newPlan,
        modules: selectedModules,
      });
      setNewClientOpen(false);
      setNewName(''); setNewOwnerName(''); setNewEmail(''); setNewPassword('');
      setNewPlan('BASIC'); setSelectedModules([...PLAN_MODULES['BASIC']]);
      loadTenants();
    } catch (err: any) {
      setNewError(err.response?.data?.message || 'Error al crear el cliente');
    } finally {
      setNewLoading(false);
    }
  }

  function getModulesForPlan(plan: string): string[] {
    const modulesByPlan: Record<string, string[]> = {
      BASIC: ["Dashboard", "Movimientos", "Bancos"],
      PROFESIONAL: ["Dashboard", "Movimientos", "Bancos", "Reportes", "Tesorería"],
      BUSINESS: ["Dashboard", "Movimientos", "Bancos", "Reportes", "Tesorería", "Compras", "Proveedores"],
      ENTERPRISE: ["Dashboard", "Movimientos", "Bancos", "Reportes", "Tesorería", "Compras", "Proveedores", "Costos", "Sucursales", "Roles"],
    };
    return modulesByPlan[plan] || [];
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="rounded-xl bg-slate-900 p-6">Cargando datos...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
            <p className="text-slate-400">Administra todos los tenants del sistema</p>
          </div>
          <button
            onClick={() => setNewClientOpen(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            + Nuevo Cliente
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Nombre</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Plan Actual</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Módulos Activos</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Fecha Registro</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{tenant.tradeName || tenant.legalName}</div>
                      <div className="text-sm text-slate-400">{tenant.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        tenant.plan === "ENTERPRISE" ? "bg-purple-900/40 text-purple-300" :
                        tenant.plan === "BUSINESS" ? "bg-blue-900/40 text-blue-300" :
                        tenant.plan === "PROFESIONAL" ? "bg-green-900/40 text-green-300" :
                        "bg-slate-700 text-slate-300"
                      }`}>
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {getModulesForPlan(tenant.plan).slice(0, 3).map((mod) => (
                          <span key={mod} className="px-2 py-0.5 rounded bg-slate-700 text-xs text-slate-300">
                            {mod}
                          </span>
                        ))}
                        {getModulesForPlan(tenant.plan).length > 3 && (
                          <span className="px-2 py-0.5 rounded bg-slate-700 text-xs text-slate-300">
                            +{getModulesForPlan(tenant.plan).length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString('es-MX') : 'Sin fecha'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        tenant.isActive ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                      }`}>
                        {tenant.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditTenant(tenant)}
                          className="px-3 py-1.5 rounded bg-slate-600 text-white text-sm hover:bg-slate-500"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleViewDetail(tenant.id)}
                          className="px-3 py-1.5 rounded bg-slate-700 text-white text-sm hover:bg-slate-600"
                        >
                          Ver detalle
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setPlanModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                        >
                          Cambiar plan
                        </button>
                        <button
                          onClick={() => handleToggleStatus(tenant.id, tenant.isActive)}
                          className={`px-3 py-1.5 rounded text-white text-sm ${
                            tenant.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {tenant.isActive ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal editar tenant */}
        {editTenantOpen && editTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
              <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-800">
                <div>
                  <h3 className="text-xl font-bold text-white">Editar Cliente</h3>
                  <p className="text-sm text-slate-400 font-mono truncate max-w-[220px]">{editTenant.id}</p>
                </div>
                <button onClick={() => setEditTenantOpen(false)}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700">
                  Cerrar
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {editError && (
                  <div className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">{editError}</div>
                )}
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nombre</label>
                    <input
                      value={editName} onChange={e => setEditName(e.target.value)}
                      placeholder="Nombre del tenant"
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Plan</label>
                    <select value={editPlan} onChange={e => setEditPlan(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500">
                      <option value="LITE_CORTE">LITE — Corte de Caja (manual)</option>
                      <option value="LITE_POS">LITE — POS sin inventario</option>
                      <option value="BASIC">BASIC</option>
                      <option value="PRO">PRO</option>
                      <option value="BUSINESS">BUSINESS</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </div>
                  <button disabled={editLoading}
                    className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {editLoading ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </form>

                {/* Sección crear usuario */}
                <div className="border-t border-slate-700 pt-4 mt-2 space-y-3">
                  <div className="text-xs text-slate-400">Crear usuario para este tenant</div>
                  {newUserError && (
                    <div className="rounded-lg border border-red-700 bg-red-900/30 p-2 text-xs text-red-300">{newUserError}</div>
                  )}
                  {newUserSuccess && (
                    <div className="rounded-lg border border-green-700 bg-green-900/30 p-2 text-xs text-green-300">{newUserSuccess}</div>
                  )}
                  <input
                    value={newUserName} onChange={e => setNewUserName(e.target.value)}
                    placeholder="Nombre"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                  <input
                    type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                  <input
                    type="password" value={newUserPass} onChange={e => setNewUserPass(e.target.value)}
                    placeholder="Password / PIN"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                  <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white outline-none focus:border-blue-500">
                    <option value="ADMIN">Administrador</option>
                    <option value="CAJERO">Cajero</option>
                    <option value="GERENTE">Gerente</option>
                  </select>
                  <button
                    onClick={handleCreateUser}
                    disabled={newUserLoading || !newUserEmail || !newUserPass}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 p-2.5 text-sm text-white hover:bg-slate-700 disabled:opacity-40"
                  >
                    {newUserLoading ? 'Creando...' : '+ Crear usuario'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal nuevo cliente */}
        {newClientOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
              <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-800">
                <div>
                  <h3 className="text-xl font-bold text-white">Nuevo Cliente</h3>
                  <p className="text-sm text-slate-400">Crea un nuevo tenant en el sistema</p>
                </div>
                <button onClick={() => { setNewClientOpen(false); setNewError(''); }}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700">
                  Cerrar
                </button>
              </div>
              <form onSubmit={handleCreateTenant} className="flex-1 overflow-y-auto p-6 space-y-4">
                {newError && (
                  <div className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">{newError}</div>
                )}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nombre del tenant</label>
                  <input
                    value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="Ej: Restaurante El Sazón"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nombre del dueño / administrador</label>
                  <input
                    value={newOwnerName} onChange={e => setNewOwnerName(e.target.value)}
                    placeholder="Ej: Juan García"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email del administrador</label>
                  <input
                    type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    placeholder="admin@empresa.com"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Password del administrador</label>
                  <input
                    type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Plan</label>
                  <select value={newPlan} onChange={e => handlePlanChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500">
                    <option value="LITE_CORTE">LITE — Corte de Caja (manual)</option>
                    <option value="LITE_POS">LITE — POS sin inventario</option>
                    <option value="BASIC">BASIC</option>
                    <option value="PRO">PRO</option>
                    <option value="BUSINESS">BUSINESS</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2">Módulos incluidos</label>
                  <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 grid grid-cols-2 gap-2">
                    {Object.keys(MODULE_LABELS).map(mod => (
                      <label key={mod} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedModules.includes(mod)}
                          onChange={() => toggleModule(mod)}
                          className="rounded accent-blue-500"
                        />
                        <span className="text-sm text-slate-300">{MODULE_LABELS[mod]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button disabled={newLoading}
                  className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {newLoading ? 'Creando...' : 'Crear Cliente'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal detalle */}
        {detailModalOpen && selectedTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
              <div className="flex-shrink-0 p-6 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Detalle del Tenant</h3>
                    <p className="text-sm text-slate-400">{selectedTenant.tradeName || selectedTenant.legalName}</p>
                  </div>
                  <button
                    onClick={() => setDetailModalOpen(false)}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-slate-800">
                    <h4 className="text-sm text-slate-400 mb-2">ID</h4>
                    <p className="text-white font-mono text-sm">{selectedTenant.id}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800">
                    <h4 className="text-sm text-slate-400 mb-2">RFC/Tax ID</h4>
                    <p className="text-white">{selectedTenant.taxId || "N/A"}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800">
                    <h4 className="text-sm text-slate-400 mb-2">Plan</h4>
                    <p className="text-white font-semibold">{selectedTenant.plan}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800">
                    <h4 className="text-sm text-slate-400 mb-2">Estado</h4>
                    <p className={`font-semibold ${selectedTenant.isActive ? "text-green-400" : "text-red-400"}`}>
                      {selectedTenant.isActive ? "Activo" : "Inactivo"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-800">
                  <h4 className="text-sm text-slate-400 mb-3">Módulos Activos</h4>
                  <div className="flex flex-wrap gap-2">
                    {getModulesForPlan(selectedTenant.plan).map((mod) => (
                      <span key={mod} className="px-3 py-1 rounded bg-blue-900/40 text-blue-300 text-sm">
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-800">
                  <h4 className="text-sm text-slate-400 mb-3">Fecha de Registro</h4>
                  <p className="text-white">{selectedTenant.createdAt ? new Date(selectedTenant.createdAt).toLocaleString('es-MX') : 'Sin fecha'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal cambiar plan */}
        {planModalOpen && selectedTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
              <div className="flex-shrink-0 p-6 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Cambiar Plan</h3>
                    <p className="text-sm text-slate-400">{selectedTenant.tradeName || selectedTenant.legalName}</p>
                  </div>
                  <button
                    onClick={() => setPlanModalOpen(false)}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-3">
                  {["LITE_CORTE", "LITE_POS", "BASIC", "PRO", "BUSINESS", "ENTERPRISE"].map((plan) => (
                    <button
                      key={plan}
                      onClick={() => handleChangePlan(selectedTenant.id, plan)}
                      className={`w-full p-4 rounded-lg border text-left transition-colors ${
                        selectedTenant.plan === plan
                          ? "border-blue-500 bg-blue-900/20"
                          : "border-slate-700 bg-slate-800 hover:bg-slate-700"
                      }`}
                    >
                      <div className="font-semibold text-white">{plan}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {getModulesForPlan(plan).length} módulos incluidos
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
