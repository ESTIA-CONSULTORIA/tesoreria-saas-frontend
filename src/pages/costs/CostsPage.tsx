import { useState } from "react";
import MainLayout from "../../core/layout/MainLayout";

export default function CostsPage() {
  const [activeTab, setActiveTab] = useState("insumos");

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Costos y Producción</h2>
          <p className="text-slate-400">Gestión de insumos, recetas y costos de venta</p>
        </div>

        <div className="flex gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("insumos")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "insumos"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Insumos
          </button>
          <button
            onClick={() => setActiveTab("recetas")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "recetas"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Recetas
          </button>
          <button
            onClick={() => setActiveTab("inventario")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "inventario"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Inventario
          </button>
          <button
            onClick={() => setActiveTab("costo-venta")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "costo-venta"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Costo de Venta
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          {activeTab === "insumos" && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Insumos</h3>
              <p className="text-slate-400">Gestión de insumos y materias primas</p>
              <div className="mt-4 p-4 rounded-lg bg-slate-800">
                <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
              </div>
            </div>
          )}

          {activeTab === "recetas" && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Recetas</h3>
              <p className="text-slate-400">Gestión de recetas y cálculo de costos</p>
              <div className="mt-4 p-4 rounded-lg bg-slate-800">
                <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
              </div>
            </div>
          )}

          {activeTab === "inventario" && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Inventario</h3>
              <p className="text-slate-400">Control de inventario por período</p>
              <div className="mt-4 p-4 rounded-lg bg-slate-800">
                <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
              </div>
            </div>
          )}

          {activeTab === "costo-venta" && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Costo de Venta</h3>
              <p className="text-slate-400">Reporte de costo de venta por período</p>
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
