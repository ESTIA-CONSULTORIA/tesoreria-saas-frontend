import { useState, useEffect } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import { useBrandingStore } from "../../core/store/useBrandingStore";

export default function PosConfigPage() {
  const [activeTab, setActiveTab] = useState("productos");

  // Auditoría de producto (GoodsHabits, Punto 1): stockPolicy vive en TenantSetting (nivel
  // tenant), no en PosConfig (nivel sucursal, el resto de esta pantalla) — a propósito, ya
  // aplica a todas las sucursales del tenant a la vez. Se guarda/lee acá porque es el lugar
  // natural donde un ADMIN ya espera encontrar "parámetros de operación del POS", aunque el
  // dato en sí no sea por sucursal.
  const [stockPolicy, setStockPolicy] = useState<'BLOQUEAR' | 'PERMITIR_NEGATIVO'>('PERMITIR_NEGATIVO');
  const [savingStockPolicy, setSavingStockPolicy] = useState(false);
  const [stockPolicySaved, setStockPolicySaved] = useState(false);

  useEffect(() => {
    const tenantId = localStorage.getItem('tenant_id');
    if (!tenantId) return;
    api.get(`/tenant-settings/${tenantId}`)
      .then((res) => {
        if (res.data?.stockPolicy) setStockPolicy(res.data.stockPolicy);
      })
      .catch(() => { /* deja el default PERMITIR_NEGATIVO */ });
  }, []);

  async function saveStockPolicy(value: 'BLOQUEAR' | 'PERMITIR_NEGATIVO') {
    const tenantId = localStorage.getItem('tenant_id');
    if (!tenantId) return;
    setStockPolicy(value);
    setSavingStockPolicy(true);
    setStockPolicySaved(false);
    try {
      await api.put(`/tenant-settings/${tenantId}`, { stockPolicy: value });
      // El POS (POSPage.tsx) lee stockPolicy de useBrandingStore — refresca ese store acá
      // para que el cambio se refleje sin esperar al próximo reload/polling del SW.
      await useBrandingStore.getState().load();
      setStockPolicySaved(true);
    } finally {
      setSavingStockPolicy(false);
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Configuración POS</h2>
          <p className="text-slate-400">Configuración del sistema de punto de venta</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("productos")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "productos"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Productos y Categorías
          </button>
          <button
            onClick={() => setActiveTab("areas")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "areas"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Áreas y Mesas
          </button>
          <button
            onClick={() => setActiveTab("turnos")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "turnos"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Turnos y Cajeros
          </button>
          <button
            onClick={() => setActiveTab("hardware")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "hardware"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Hardware
          </button>
          <button
            onClick={() => setActiveTab("parametros")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "parametros"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Parámetros de Operación
          </button>
        </div>

        {/* Tab Content */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          {activeTab === "productos" && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Productos y Categorías</h3>
              <p className="text-slate-400">Gestión de productos y categorías del POS</p>
              <div className="mt-4 p-4 rounded-lg bg-slate-800">
                <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
              </div>
            </div>
          )}

          {activeTab === "areas" && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Áreas y Mesas</h3>
              <p className="text-slate-400">Configuración de áreas y mesas por sucursal</p>
              <div className="mt-4 p-4 rounded-lg bg-slate-800">
                <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
              </div>
            </div>
          )}

          {activeTab === "turnos" && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Turnos y Cajeros</h3>
              <p className="text-slate-400">Configuración de turnos y cajeros por sucursal</p>
              <div className="mt-4 p-4 rounded-lg bg-slate-800">
                <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
              </div>
            </div>
          )}

          {activeTab === "hardware" && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Hardware</h3>
              <p className="text-slate-400">Configuración de impresoras, terminales y cajones</p>
              <div className="mt-4 p-4 rounded-lg bg-slate-800">
                <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
              </div>
            </div>
          )}

          {activeTab === "parametros" && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Parámetros de Operación</h3>
              <p className="text-slate-400">Configuración de parámetros de operación del POS</p>

              <div className="mt-6 p-4 rounded-lg bg-slate-800 border border-slate-700">
                <h4 className="font-semibold text-white">Stock insuficiente al vender</h4>
                <p className="text-xs text-slate-500 mb-4">
                  Aplica a toda la empresa, no solo a esta sucursal.
                </p>

                <label className="flex items-start gap-3 mb-3 cursor-pointer">
                  <input
                    type="radio"
                    name="stockPolicy"
                    checked={stockPolicy === 'PERMITIR_NEGATIVO'}
                    onChange={() => saveStockPolicy('PERMITIR_NEGATIVO')}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">Permitir venta (stock queda en negativo)</div>
                    <div className="text-xs text-slate-400">El cajero puede vender igual; el stock refleja el déficit real.</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="stockPolicy"
                    checked={stockPolicy === 'BLOQUEAR'}
                    onChange={() => saveStockPolicy('BLOQUEAR')}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">Bloquear venta</div>
                    <div className="text-xs text-slate-400">Sin stock suficiente, la venta se rechaza — el botón del producto se ve deshabilitado en el POS.</div>
                  </div>
                </label>

                <div className="mt-3 h-4 text-xs">
                  {savingStockPolicy && <span className="text-slate-400">Guardando...</span>}
                  {!savingStockPolicy && stockPolicySaved && <span className="text-green-400">Guardado.</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
