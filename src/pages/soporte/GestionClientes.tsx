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
  giro?: string;
}

interface GiroOption {
  code: string;
  label: string;
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

// Keep MODULE_LABELS available for future use
void MODULE_LABELS;
// Keep PLAN_MODULES available for future use
void PLAN_MODULES;

const STEPS = [
  { num: 1, label: 'Negocio' },
  { num: 2, label: 'Contacto' },
  { num: 3, label: 'Plan' },
  { num: 4, label: 'Confirmar' },
];

const WIZARD_INITIAL = {
  legalName: '',
  tradeName: '',
  rfc: '',
  // Auditoría de producto (GoodsHabits, Hallazgo 3): reemplaza "industry" (texto libre,
  // sin validar, sin ningún consumidor en el backend) por "giro" (catálogo cerrado que sí
  // gatea módulos verticales — ver GET /tenants/giros).
  giro: '',
  ownerName: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  plan: 'LITE_CORTE',
  slug: '',
  password: '',
  billingCycle: 'monthly',
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
  const [editGiro, setEditGiro] = useState('generico');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState('ADMIN');
  const [newUserLoading, setNewUserLoading] = useState(false);
  const [newUserError, setNewUserError] = useState('');
  const [newUserSuccess, setNewUserSuccess] = useState('');

  const [alerts, setAlerts] = useState<any[]>([]);

  const [tenantModules, setTenantModules] = useState<string[]>([]);
  const [allModules, setAllModules] = useState<any[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);

  // Wizard
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({ ...WIZARD_INITIAL });
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [wizardError, setWizardError] = useState('');

  // Auditoría de producto (GoodsHabits, Hallazgo 3): catálogo de giros, fuente única en
  // GIROS/GIRO_LABELS del backend (src/config/giros.config.ts) — se pide una vez al montar
  // en vez de hardcodearlo aquí, para que agregar un giro nuevo no requiera tocar el
  // frontend.
  const [giros, setGiros] = useState<GiroOption[]>([]);

  useEffect(() => {
    loadTenants();
    api.get('/subscriptions/alerts')
      .then(r => setAlerts(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    api.get('/tenants/giros')
      .then(r => setGiros(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
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
      loadTenantModules(tenantId);
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
    setEditGiro(tenant.giro || 'generico');
    setEditError('');
    setNewUserName(''); setNewUserEmail(''); setNewUserPass('');
    setNewUserRole('ADMIN'); setNewUserError(''); setNewUserSuccess('');
    setEditTenantOpen(true);
    loadTenantModules(tenant.id);
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
        giro: editGiro,
      });
      setEditTenantOpen(false);
      loadTenants();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setEditLoading(false);
    }
  }

  const loadTenantModules = async (tenantId: string) => {
    setLoadingModules(true);
    try {
      const [active, all] = await Promise.all([
        api.get(`/modules/tenant/${tenantId}`),
        api.get('/modules'),
      ]);
      setTenantModules(Array.isArray(active.data) ? active.data : []);
      setAllModules(Array.isArray(all.data) ? all.data : []);
    } catch {}
    setLoadingModules(false);
  };

  const toggleModule = async (tenantId: string, moduleCode: string, isActive: boolean) => {
    if (isActive) {
      await api.delete(`/modules/tenant/${tenantId}/${moduleCode}`);
      setTenantModules(prev => prev.filter(m => m !== moduleCode));
    } else {
      await api.post(`/modules/tenant/${tenantId}/activate`, { moduleCode, source: 'manual_support' });
      setTenantModules(prev => [...prev, moduleCode]);
    }
  };

  async function handleRenew(tenantId: string) {
    try {
      await api.post(`/subscriptions/${tenantId}/renew`);
      loadTenants();
    } catch (err: any) {
      console.error('Error renovando suscripción:', err.response?.data?.message || err.message);
    }
  }

  async function handleCreateWizard() {
    setCreating(true);
    setWizardError('');
    try {
      await api.post('/tenants', {
        legalName: wizardData.legalName,
        tradeName: wizardData.tradeName || wizardData.legalName,
        rfc: wizardData.rfc,
        taxId: wizardData.rfc,
        giro: wizardData.giro,
        ownerName: wizardData.ownerName,
        email: wizardData.email,
        phone: wizardData.phone,
        city: wizardData.city,
        state: wizardData.state,
        plan: wizardData.plan,
        slug: wizardData.slug,
        password: wizardData.password,
        billingCycle: wizardData.billingCycle,
      });
      setCreateSuccess(true);
      loadTenants();
    } catch (err: any) {
      setWizardError(err.response?.data?.message || 'Error al crear el cliente');
    } finally {
      setCreating(false);
    }
  }

  function openWizard() {
    setWizardData({ ...WIZARD_INITIAL });
    setWizardStep(1);
    setCreateSuccess(false);
    setWizardError('');
    setShowWizard(true);
  }

  function closeWizard() {
    setShowWizard(false);
    setCreateSuccess(false);
    setWizardError('');
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
            onClick={openWizard}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            + Nuevo Cliente
          </button>
        </div>

        {alerts.length > 0 && (
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.2)',
          }}>
            <div style={{ fontSize: 13, color: 'rgba(251,191,36,0.9)', fontWeight: 500, marginBottom: 8 }}>
              ⚠️ {alerts.length} suscripción{alerts.length > 1 ? 'es' : ''} por vencer
            </div>
            {alerts.map((a: any) => (
              <div key={a.id} style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: '3px 0' }}>
                Tenant {a.tenantId} — vence el {new Date(a.endDate).toLocaleDateString('es-MX')}
              </div>
            ))}
          </div>
        )}

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
                        <button
                          onClick={() => handleRenew(tenant.id)}
                          style={{
                            padding: '3px 8px', borderRadius: 6,
                            border: '1px solid rgba(74,222,128,0.2)',
                            background: 'transparent', color: 'rgba(74,222,128,0.7)',
                            fontSize: 11, cursor: 'pointer',
                          }}
                        >
                          Renovar
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
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Giro</label>
                    <select value={editGiro} onChange={e => setEditGiro(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500">
                      {giros.map(g => (
                        <option key={g.code} value={g.code}>{g.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Determina qué módulos verticales puede tener este tenant (ej. Pacientes solo para giros médicos), además de lo que ya permite el plan.
                    </p>
                  </div>
                  <button disabled={editLoading}
                    className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {editLoading ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </form>

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

                {/* Sección módulos */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                    Módulos activos
                  </div>
                  {loadingModules ? (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Cargando...</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {allModules.map(m => {
                        const isActive = tenantModules.includes(m.code);
                        return (
                          <button key={m.code}
                            onClick={() => editTenant && toggleModule(editTenant.id, m.code, isActive)}
                            style={{
                              padding: '5px 12px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
                              border: `1px solid ${isActive ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
                              background: isActive ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.02)',
                              color: isActive ? '#4ade80' : 'rgba(255,255,255,0.3)',
                            }}>
                            {isActive ? '✓' : '+'} {m.name}
                            {m.isAddon && !isActive && m.defaultPrice > 0 && (
                              <span style={{ marginLeft: 4, color: 'rgba(255,255,255,0.2)' }}>${m.defaultPrice}/mo</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard nuevo cliente */}
        {showWizard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div style={{
              width: '100%', maxWidth: 460,
              maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.07)',
              background: '#0d1117',
              boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ flexShrink: 0, padding: '24px 24px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#e8edf5' }}>Nuevo Cliente</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                      Paso {wizardStep} de {STEPS.length}
                    </div>
                  </div>
                  <button
                    onClick={closeWizard}
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer' }}
                  >
                    Cerrar
                  </button>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                  {STEPS.map(s => (
                    <div key={s.num} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                        background: wizardStep >= s.num ? '#8fafd4' : 'rgba(255,255,255,0.08)',
                        color: wizardStep >= s.num ? '#080a0f' : 'rgba(255,255,255,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 600,
                        transition: 'all 0.2s',
                      }}>{s.num}</div>
                      <div style={{
                        fontSize: 10, letterSpacing: '0.06em',
                        color: wizardStep >= s.num ? '#8fafd4' : 'rgba(255,255,255,0.2)',
                        transition: 'all 0.2s',
                      }}>
                        {s.label.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>

                {/* PASO 1 — Negocio */}
                {wizardStep === 1 && (
                  <div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Datos del negocio</div>
                    <input
                      placeholder="Nombre legal (ante SAT)"
                      value={wizardData.legalName}
                      onChange={e => setWizardData(p => ({ ...p, legalName: e.target.value }))}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', color: '#e8edf5', fontSize: 13, marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
                    />
                    <input
                      placeholder="Nombre comercial (opcional)"
                      value={wizardData.tradeName}
                      onChange={e => setWizardData(p => ({ ...p, tradeName: e.target.value }))}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', color: '#e8edf5', fontSize: 13, marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
                    />
                    <input
                      placeholder="RFC"
                      value={wizardData.rfc}
                      onChange={e => setWizardData(p => ({ ...p, rfc: e.target.value.toUpperCase() }))}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', color: '#e8edf5', fontSize: 13, marginBottom: 10, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                    />
                    <select
                      value={wizardData.giro}
                      onChange={e => setWizardData(p => ({ ...p, giro: e.target.value }))}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: '#0d1117', padding: '10px 12px', color: wizardData.giro ? '#e8edf5' : 'rgba(255,255,255,0.3)', fontSize: 13, marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
                    >
                      <option value="">Selecciona el giro</option>
                      {giros.map(g => (
                        <option key={g.code} value={g.code}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* PASO 2 — Contacto */}
                {wizardStep === 2 && (
                  <div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Datos del administrador</div>
                    <input
                      placeholder="Nombre completo del dueño"
                      value={wizardData.ownerName}
                      onChange={e => setWizardData(p => ({ ...p, ownerName: e.target.value }))}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', color: '#e8edf5', fontSize: 13, marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={wizardData.email}
                      onChange={e => setWizardData(p => ({ ...p, email: e.target.value }))}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', color: '#e8edf5', fontSize: 13, marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
                    />
                    <input
                      placeholder="Teléfono"
                      value={wizardData.phone}
                      onChange={e => setWizardData(p => ({ ...p, phone: e.target.value }))}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', color: '#e8edf5', fontSize: 13, marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input
                        placeholder="Ciudad"
                        value={wizardData.city}
                        onChange={e => setWizardData(p => ({ ...p, city: e.target.value }))}
                        style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', color: '#e8edf5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                      />
                      <select
                        value={wizardData.state}
                        onChange={e => setWizardData(p => ({ ...p, state: e.target.value }))}
                        style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: '#0d1117', padding: '10px 12px', color: wizardData.state ? '#e8edf5' : 'rgba(255,255,255,0.3)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                      >
                        <option value="">Estado</option>
                        <option value="AGS">Aguascalientes</option>
                        <option value="BC">Baja California</option>
                        <option value="BCS">Baja California Sur</option>
                        <option value="CAM">Campeche</option>
                        <option value="CHIS">Chiapas</option>
                        <option value="CHIH">Chihuahua</option>
                        <option value="CDMX">Ciudad de México</option>
                        <option value="COAH">Coahuila</option>
                        <option value="COL">Colima</option>
                        <option value="DGO">Durango</option>
                        <option value="GTO">Guanajuato</option>
                        <option value="GRO">Guerrero</option>
                        <option value="HGO">Hidalgo</option>
                        <option value="JAL">Jalisco</option>
                        <option value="MEX">Estado de México</option>
                        <option value="MICH">Michoacán</option>
                        <option value="MOR">Morelos</option>
                        <option value="NAY">Nayarit</option>
                        <option value="NL">Nuevo León</option>
                        <option value="OAX">Oaxaca</option>
                        <option value="PUE">Puebla</option>
                        <option value="QRO">Querétaro</option>
                        <option value="QROO">Quintana Roo</option>
                        <option value="SLP">San Luis Potosí</option>
                        <option value="SIN">Sinaloa</option>
                        <option value="SON">Sonora</option>
                        <option value="TAB">Tabasco</option>
                        <option value="TAMPS">Tamaulipas</option>
                        <option value="TLAX">Tlaxcala</option>
                        <option value="VER">Veracruz</option>
                        <option value="YUC">Yucatán</option>
                        <option value="ZAC">Zacatecas</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* PASO 3 — Plan */}
                {wizardStep === 3 && (
                  <div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Plan y configuración</div>
                    <select
                      value={wizardData.plan}
                      onChange={e => setWizardData(p => ({ ...p, plan: e.target.value }))}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: '#0d1117', padding: '10px 12px', color: '#e8edf5', fontSize: 13, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
                    >
                      <option value="LITE_CORTE">LITE — Corte de Caja Manual ($650/mes)</option>
                      <option value="LITE_POS">LITE — POS Sin Inventario ($650/mes)</option>
                      <option value="BASIC">BASIC ($890/mes)</option>
                      <option value="PRO">PRO ($1,490/mes)</option>
                      <option value="BUSINESS">BUSINESS ($1,980/mes)</option>
                      <option value="ENTERPRISE">ENTERPRISE (cotización)</option>
                    </select>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ciclo de facturación</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[
                          { value: 'monthly', label: 'Mensual', desc: 'Precio normal' },
                          { value: 'annual', label: 'Anual', desc: '1 mes gratis' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setWizardData(p => ({ ...p, billingCycle: opt.value }))}
                            style={{
                              flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                              border: `1px solid ${wizardData.billingCycle === opt.value ? 'rgba(143,175,212,0.4)' : 'rgba(255,255,255,0.07)'}`,
                              background: wizardData.billingCycle === opt.value ? 'rgba(143,175,212,0.08)' : 'transparent',
                            }}
                          >
                            <div style={{ fontSize: 13, color: '#c8cdd8', fontWeight: 500 }}>{opt.label}</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      placeholder="Slug amigable (ej: bocatta)"
                      value={wizardData.slug}
                      onChange={e => setWizardData(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', color: '#e8edf5', fontSize: 13, marginBottom: 4, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                    />
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>
                      Ej: /corte?tenant={wizardData.slug || 'nombre'}
                    </div>

                    <input
                      type="password"
                      placeholder="Password temporal del administrador"
                      value={wizardData.password}
                      onChange={e => setWizardData(p => ({ ...p, password: e.target.value }))}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', color: '#e8edf5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                {/* PASO 4 — Confirmación */}
                {wizardStep === 4 && (
                  <div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Confirmar y crear</div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                      {[
                        { label: 'Nombre legal', value: wizardData.legalName },
                        { label: 'Nombre comercial', value: wizardData.tradeName },
                        { label: 'RFC', value: wizardData.rfc },
                        { label: 'Giro', value: giros.find(g => g.code === wizardData.giro)?.label || wizardData.giro },
                        { label: 'Administrador', value: wizardData.ownerName },
                        { label: 'Email', value: wizardData.email },
                        { label: 'Teléfono', value: wizardData.phone },
                        { label: 'Ubicación', value: [wizardData.city, wizardData.state].filter(Boolean).join(', ') },
                        { label: 'Plan', value: wizardData.plan },
                        { label: 'Facturación', value: wizardData.billingCycle === 'annual' ? 'Anual (1 mes gratis)' : 'Mensual' },
                        { label: 'Slug', value: wizardData.slug },
                      ].map(item => (
                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{item.label}</span>
                          <span style={{ fontSize: 12, color: '#c8cdd8', fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{item.value || '—'}</span>
                        </div>
                      ))}
                    </div>

                    {wizardError && (
                      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12, color: '#f87171' }}>
                        {wizardError}
                      </div>
                    )}

                    {createSuccess && (
                      <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                        <div style={{ fontSize: 13, color: '#4ade80', marginBottom: 10, fontWeight: 600 }}>✓ Cliente creado exitosamente</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.9 }}>
                          <div>Email: <span style={{ color: '#c8cdd8' }}>{wizardData.email}</span></div>
                          <div>Password: <span style={{ color: '#c8cdd8', fontFamily: 'monospace' }}>{wizardData.password}</span></div>
                          <div>Sistema: <span style={{ color: '#8fafd4' }}>https://app.estiaconsultoria.com</span></div>
                          {(wizardData.plan === 'LITE_CORTE' || wizardData.plan === 'LITE_POS') && wizardData.slug && (
                            <div>Corte: <span style={{ color: '#8fafd4' }}>https://app.estiaconsultoria.com/corte?tenant={wizardData.slug}</span></div>
                          )}
                          {wizardData.slug && (
                            <div>Ejecutivo: <span style={{ color: '#8fafd4' }}>https://app.estiaconsultoria.com/executive?tenant={wizardData.slug}</span></div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer — navegación */}
              <div style={{ flexShrink: 0, padding: '16px 24px 24px', display: 'flex', gap: 8 }}>
                {wizardStep > 1 && !createSuccess && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(s => s - 1)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                      color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    ← Anterior
                  </button>
                )}
                {wizardStep < 4 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(s => s + 1)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                      background: 'rgba(143,175,212,0.12)', color: '#8fafd4', fontSize: 13, cursor: 'pointer', fontWeight: 500,
                    }}
                  >
                    Siguiente →
                  </button>
                )}
                {wizardStep === 4 && !createSuccess && (
                  <button
                    type="button"
                    onClick={handleCreateWizard}
                    disabled={creating}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                      background: 'rgba(74,222,128,0.12)', color: '#4ade80', fontSize: 13, cursor: 'pointer', fontWeight: 600,
                      opacity: creating ? 0.6 : 1,
                    }}
                  >
                    {creating ? 'Creando...' : '✓ Crear Cliente'}
                  </button>
                )}
                {createSuccess && (
                  <button
                    type="button"
                    onClick={closeWizard}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.2)',
                      background: 'rgba(74,222,128,0.06)', color: '#4ade80', fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    Cerrar
                  </button>
                )}
              </div>
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
                  <h4 className="text-sm text-slate-400 mb-3">Módulos</h4>
                  {loadingModules ? (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Cargando...</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {allModules.map(m => {
                        const isActive = tenantModules.includes(m.code);
                        return (
                          <button key={m.code}
                            onClick={() => toggleModule(selectedTenant.id, m.code, isActive)}
                            style={{
                              padding: '5px 12px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
                              border: `1px solid ${isActive ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
                              background: isActive ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.02)',
                              color: isActive ? '#4ade80' : 'rgba(255,255,255,0.3)',
                            }}>
                            {isActive ? '✓' : '+'} {m.name}
                            {m.isAddon && !isActive && m.defaultPrice > 0 && (
                              <span style={{ marginLeft: 4, color: 'rgba(255,255,255,0.2)' }}>${m.defaultPrice}/mo</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
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
