import { useState } from "react";
import MainLayout from "../../core/layout/MainLayout";

export default function PosConfigPage() {
  const [activeTab, setActiveTab] = useState("productos");

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
