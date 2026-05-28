import { useState } from "react";
import MainLayout from "../../core/layout/MainLayout";

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState("ordenes");

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Compras</h2>
          <p className="text-slate-400">Gestión de órdenes de compra y facturas</p>
        </div>

        <div className="flex gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("ordenes")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "ordenes"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Órdenes de Compra
          </button>
          <button
            onClick={() => setActiveTab("recepcion")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "recepcion"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Recepción de Mercancía
          </button>
          <button
            onClick={() => setActiveTab("facturas")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "facturas"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Facturas de Compra
          </button>
          <button
            onClick={() => setActiveTab("cuentas-pagar")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "cuentas-pagar"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Cuentas por Pagar
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          {activeTab === "ordenes" && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Órdenes de Compra</h3>
              <p className="text-slate-400">Gestión de órdenes de compra (OC)</p>
              <div className="mt-4 p-4 rounded-lg bg-slate-800">
                <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
              </div>
            </div>
          )}

          {activeTab === "recepcion" && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Recepción de Mercancía</h3>
              <p className="text-slate-400">Recepción de mercancía contra órdenes de compra</p>
              <div className="mt-4 p-4 rounded-lg bg-slate-800">
                <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
              </div>
            </div>
          )}

          {activeTab === "facturas" && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Facturas de Compra</h3>
              <p className="text-slate-400">Gestión de facturas de compra</p>
              <div className="mt-4 p-4 rounded-lg bg-slate-800">
                <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
              </div>
            </div>
          )}

          {activeTab === "cuentas-pagar" && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Cuentas por Pagar</h3>
              <p className="text-slate-400">Vista de facturas pendientes por proveedor</p>
              <div className="mt-4 p-4 rounded-lg bg-slate-800">
                <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
