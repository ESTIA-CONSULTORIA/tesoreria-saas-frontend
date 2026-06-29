import { useEffect, useState } from "react";
import { api } from "../../core/api/api";
import MainLayout from "../../core/layout/MainLayout";

interface Plan {
  id: string;
  code: string;
  name: string;
  price: number;
  description?: string;
  features?: string[];
  modules?: string[];
}

interface Tenant {
  id: string;
  plan: string;
}

export default function PlanesModulos() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [plansRes, tenantsRes] = await Promise.all([
        api.get("/plans"),
        api.get("/administration/tenants"),
      ]);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  const LITE_PLAN: Plan = {
    id: 'lite-static',
    code: 'LITE',
    name: 'LITE',
    price: 0,
    description: 'Solo Corte de Caja',
    features: ['Corte de caja diario', 'Gestión de turnos POS'],
    modules: ['pos'],
  };

  const effectivePlans = plans.some(p => p.code === 'LITE')
    ? plans
    : [LITE_PLAN, ...plans];

  function getClientCountForPlan(planCode: string): number {
    return tenants.filter((t) => t.plan === planCode).length;
  }

  async function handleUpdatePlan(planId: string, data: Partial<Plan>) {
    if (planId === 'lite-static') {
      alert('El plan LITE es gestionado por el sistema y no puede editarse');
      return;
    }
    try {
      await api.put(`/plans/${planId}`, data);
      loadData();
      setEditModalOpen(false);
    } catch (error) {
      console.error("Error updating plan:", error);
    }
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
        <div>
          <h1 className="text-3xl font-bold">Planes y Módulos</h1>
          <p className="text-slate-400">Configura los planes y módulos disponibles</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {effectivePlans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-sm text-slate-400">{plan.code}</p>
                </div>
                <button
                  onClick={() => {
                    setEditingPlan(plan);
                    setEditModalOpen(true);
                  }}
                  className="px-2 py-1 rounded bg-slate-700 text-xs text-white hover:bg-slate-600"
                >
                  Editar
                </button>
              </div>
              <div className="text-3xl font-bold text-blue-400 mt-2">
                ${plan.price || 0}/mes
              </div>
              <div className="mt-2 text-sm text-slate-400">
                {getClientCountForPlan(plan.code)} clientes
              </div>
              {plan.description && (
                <p className="mt-3 text-sm text-slate-300">{plan.description}</p>
              )}
              <div className="mt-4 space-y-2">
                {plan.features?.map((feature, index) => (
                  <div key={index} className="text-sm text-slate-300 flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    {feature}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="text-sm text-slate-400 mb-2">Módulos incluidos:</div>
                <div className="flex flex-wrap gap-1">
                  {plan.modules?.map((modulo, index) => (
                    <span key={index} className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 text-xs">
                      {modulo}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Módulos Add-on */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-xl font-semibold mb-4">Módulos Add-on</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Proveedores", price: 50, description: "Gestión completa de proveedores" },
              { name: "Compras", price: 50, description: "Órdenes de compra y facturas" },
              { name: "Costos", price: 75, description: "Control de costos y recetas" },
              { name: "POS", price: 100, description: "Punto de venta integrado" },
              { name: "Reportes Avanzados", price: 80, description: "Reportes personalizados" },
              { name: "API Integrations", price: 150, description: "API para integraciones" },
            ].map((addon) => (
              <div key={addon.name} className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                <div className="font-semibold text-white">{addon.name}</div>
                <div className="text-sm text-slate-400 mt-1">{addon.description}</div>
                <div className="text-lg font-bold text-blue-400 mt-2">${addon.price}/mes</div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal editar plan */}
        {editModalOpen && editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
              <div className="flex-shrink-0 p-6 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Editar Plan</h3>
                    <p className="text-sm text-slate-400">{editingPlan.name}</p>
                  </div>
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Nombre</label>
                  <input
                    type="text"
                    defaultValue={editingPlan.name}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Precio</label>
                  <input
                    type="number"
                    defaultValue={editingPlan.price}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Descripción</label>
                  <textarea
                    defaultValue={editingPlan.description}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
                    rows={3}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Módulos (separados por coma)</label>
                  <input
                    type="text"
                    defaultValue={editingPlan.modules?.join(", ")}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
                    onChange={(e) => setEditingPlan({ 
                      ...editingPlan, 
                      modules: e.target.value.split(",").map(m => m.trim()).filter(m => m) 
                    })}
                  />
                </div>
                <button
                  onClick={() => handleUpdatePlan(editingPlan.id, editingPlan)}
                  className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
