import { useEffect, useState } from "react";
import { api } from "../../core/api/api";

interface Plan {
  code: string;
  name: string;
  price: number;
  features: string[];
  modulos: string[];
}

export default function PlanesModulos() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const response = await api.get("/plans");
      setPlans(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error loading plans:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="rounded-xl bg-slate-900 p-6">Cargando datos...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Planes y Módulos</h1>
        <p className="text-slate-400">Configura los planes y módulos disponibles</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div key={plan.code} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
            <div className="text-3xl font-bold text-blue-400 mt-2">${plan.price}/mes</div>
            <div className="mt-4 space-y-2">
              {plan.features.map((feature, index) => (
                <div key={index} className="text-sm text-slate-300 flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  {feature}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-sm text-slate-400 mb-2">Módulos incluidos:</div>
              <div className="space-y-1">
                {plan.modulos.map((modulo, index) => (
                  <div key={index} className="text-sm text-slate-300">• {modulo}</div>
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
    </div>
  );
}
