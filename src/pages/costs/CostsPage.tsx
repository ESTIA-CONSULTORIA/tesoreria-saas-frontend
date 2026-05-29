import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateInsumoModal from "./CreateInsumoModal";
import CreateRecipeModal from "./CreateRecipeModal";

interface Insumo {
  id: string;
  nombre: string;
  descripcion: string;
  unidadMedida: string;
  costoUnitario: number;
  moneda: string;
  proveedorId: string;
  categoriaId: string;
  stockActual: number;
  stockMinimo: number;
  isActive: boolean;
}

interface Recipe {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  rendimiento: number;
  unidadRendimiento: string;
  items: any[];
  costoTotal: number;
  precioVentaSugerido: number;
  margenDeseado: number;
  isActive: boolean;
}

interface Inventory {
  id: string;
  insumoId: string;
  periodo: string;
  inventarioInicial: number;
  entradas: number;
  salidas: number;
  inventarioFinal: number;
  costoPromedio: number;
}

interface Supplier {
  id: string;
  nombre: string;
}

export default function CostsPage() {
  const [activeTab, setActiveTab] = useState("insumos");
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [costOfSales, setCostOfSales] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [insumoModalOpen, setInsumoModalOpen] = useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (activeTab === "insumos") loadInsumos();
    if (activeTab === "recetas") loadRecipes();
    if (activeTab === "inventario") loadInventory();
    if (activeTab === "costo-venta") loadCostOfSales();
  }, [activeTab, periodo]);

  async function loadSuppliers() {
    try {
      const response = await api.get("/suppliers");
      setSuppliers(Array.isArray(response.data) ? response.data : []);
    } catch {
      setSuppliers([]);
    }
  }

  async function loadInsumos() {
    try {
      setLoading(true);
      const response = await api.get("/costs/insumos");
      setInsumos(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar insumos");
    } finally {
      setLoading(false);
    }
  }

  async function loadRecipes() {
    try {
      setLoading(true);
      const response = await api.get("/costs/recipes");
      setRecipes(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar recetas");
    } finally {
      setLoading(false);
    }
  }

  async function loadInventory() {
    try {
      setLoading(true);
      const response = await api.get("/costs/inventory", { params: { periodo } });
      setInventory(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar inventario");
    } finally {
      setLoading(false);
    }
  }

  async function loadCostOfSales() {
    try {
      setLoading(true);
      const response = await api.get("/costs/cost-of-sales", { params: { periodo } });
      setCostOfSales(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible calcular costo de venta");
    } finally {
      setLoading(false);
    }
  }

  function getSupplierName(supplierId: string): string {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier?.nombre || supplierId;
  }

  function getInsumoName(insumoId: string): string {
    const insumo = insumos.find((i) => i.id === insumoId);
    return insumo?.nombre || insumoId;
  }

  function isLowStock(insumo: Insumo): boolean {
    return Number(insumo.stockActual) <= Number(insumo.stockMinimo);
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Costos y Producción</h2>
          <p className="text-slate-400">Gestión de insumos, recetas y costos de venta</p>
        </div>

        <div className="flex gap-2 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("insumos")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "insumos"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Insumos
          </button>
          <button
            onClick={() => setActiveTab("recetas")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "recetas"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Recetas
          </button>
          <button
            onClick={() => setActiveTab("inventario")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "inventario"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Inventario
          </button>
          <button
            onClick={() => setActiveTab("costo-venta")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "costo-venta"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Costo de Venta
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando...</div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            {/* TAB 1: Insumos */}
            {activeTab === "insumos" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Insumos</h3>
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={() => { setSelectedInsumo(null); setInsumoModalOpen(true); }}>
                    + Nuevo Insumo
                  </button>
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">Nombre</th>
                        <th className="p-2">Unidad</th>
                        <th className="p-2">Costo Unitario</th>
                        <th className="p-2">Proveedor</th>
                        <th className="p-2">Stock Actual</th>
                        <th className="p-2">Stock Mínimo</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insumos.map((insumo) => (
                        <tr key={insumo.id} className={`border-t border-slate-800 ${isLowStock(insumo) ? "bg-red-900/20" : ""}`}>
                          <td className="p-2 font-medium">{insumo.nombre}</td>
                          <td className="p-2">{insumo.unidadMedida}</td>
                          <td className="p-2">{Number(insumo.costoUnitario).toFixed(2)} {insumo.moneda}</td>
                          <td className="p-2">{getSupplierName(insumo.proveedorId)}</td>
                          <td className={`p-2 ${isLowStock(insumo) ? "text-red-400 font-bold" : ""}`}>
                            {Number(insumo.stockActual).toFixed(2)}
                          </td>
                          <td className="p-2">{Number(insumo.stockMinimo).toFixed(2)}</td>
                          <td className="p-2">
                            <span className={`rounded-full px-2 py-1 text-xs ${insumo.isActive ? "bg-green-900/40 text-green-300" : "bg-slate-700 text-slate-300"}`}>
                              {insumo.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              <button className="rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600">
                                Ver
                              </button>
                              <button className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700" onClick={() => { setSelectedInsumo(insumo); setInsumoModalOpen(true); }}>
                                Editar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-3">
                  {insumos.map((insumo) => (
                    <div key={insumo.id} className={`rounded-lg border ${isLowStock(insumo) ? "border-red-700 bg-red-900/20" : "border-slate-800 bg-slate-800"} p-4`}>
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-white">{insumo.nombre}</p>
                        <span className={`text-xs px-2 py-1 rounded ${insumo.isActive ? "bg-green-900/40 text-green-300" : "bg-slate-700 text-slate-300"}`}>
                          {insumo.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 mb-3">
                        <p><span className="text-slate-500">Unidad:</span> {insumo.unidadMedida}</p>
                        <p><span className="text-slate-500">Costo:</span> {Number(insumo.costoUnitario).toFixed(2)} {insumo.moneda}</p>
                        <p><span className="text-slate-500">Stock:</span> <span className={isLowStock(insumo) ? "text-red-400 font-bold" : ""}>{Number(insumo.stockActual).toFixed(2)}</span> / {Number(insumo.stockMinimo).toFixed(2)}</p>
                      </div>
                      {isLowStock(insumo) && (
                        <div className="mb-2 text-xs text-red-400 font-medium">⚠️ Stock bajo</div>
                      )}
                      <div className="flex gap-2">
                        <button className="flex-1 rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600">
                          Ver
                        </button>
                        <button className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700" onClick={() => { setSelectedInsumo(insumo); setInsumoModalOpen(true); }}>
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Recetas */}
            {activeTab === "recetas" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Recetas</h3>
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={() => { setSelectedRecipe(null); setRecipeModalOpen(true); }}>
                    + Nueva Receta
                  </button>
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">Nombre</th>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Rendimiento</th>
                        <th className="p-2">Costo Total</th>
                        <th className="p-2">Precio Sugerido</th>
                        <th className="p-2">Margen</th>
                        <th className="p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipes.map((recipe) => (
                        <tr key={recipe.id} className="border-t border-slate-800">
                          <td className="p-2 font-medium">{recipe.nombre}</td>
                          <td className="p-2">{recipe.tipo}</td>
                          <td className="p-2">{Number(recipe.rendimiento).toFixed(2)} {recipe.unidadRendimiento}</td>
                          <td className="p-2">{Number(recipe.costoTotal).toFixed(2)}</td>
                          <td className="p-2">{Number(recipe.precioVentaSugerido).toFixed(2)}</td>
                          <td className="p-2">{(Number(recipe.margenDeseado) * 100).toFixed(0)}%</td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              <button className="rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600">
                                Ver
                              </button>
                              <button className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700" onClick={() => { setSelectedRecipe(recipe); setRecipeModalOpen(true); }}>
                                Editar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-3">
                  {recipes.map((recipe) => (
                    <div key={recipe.id} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-white">{recipe.nombre}</p>
                        <span className="text-xs px-2 py-1 rounded bg-blue-900/40 text-blue-300">
                          {recipe.tipo}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 mb-3">
                        <p><span className="text-slate-500">Rendimiento:</span> {Number(recipe.rendimiento).toFixed(2)} {recipe.unidadRendimiento}</p>
                        <p><span className="text-slate-500">Costo:</span> {Number(recipe.costoTotal).toFixed(2)}</p>
                        <p><span className="text-slate-500">Precio sugerido:</span> {Number(recipe.precioVentaSugerido).toFixed(2)}</p>
                        <p><span className="text-slate-500">Margen:</span> {(Number(recipe.margenDeseado) * 100).toFixed(0)}%</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600">
                          Ver
                        </button>
                        <button className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700" onClick={() => { setSelectedRecipe(recipe); setRecipeModalOpen(true); }}>
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Inventario */}
            {activeTab === "inventario" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Inventario</h3>
                  <input
                    type="month"
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">Insumo</th>
                        <th className="p-2">Inv. Inicial</th>
                        <th className="p-2">Entradas</th>
                        <th className="p-2">Salidas</th>
                        <th className="p-2">Inv. Final</th>
                        <th className="p-2">Costo Promedio</th>
                        <th className="p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((inv) => (
                        <tr key={inv.id} className="border-t border-slate-800">
                          <td className="p-2 font-medium">{getInsumoName(inv.insumoId)}</td>
                          <td className="p-2">{Number(inv.inventarioInicial).toFixed(2)}</td>
                          <td className="p-2">{Number(inv.entradas).toFixed(2)}</td>
                          <td className="p-2">{Number(inv.salidas).toFixed(2)}</td>
                          <td className="p-2">{Number(inv.inventarioFinal).toFixed(2)}</td>
                          <td className="p-2">{Number(inv.costoPromedio).toFixed(2)}</td>
                          <td className="p-2">
                            <button className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700">
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-3">
                  {inventory.map((inv) => (
                    <div key={inv.id} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                      <p className="font-semibold text-white mb-2">{getInsumoName(inv.insumoId)}</p>
                      <div className="text-xs text-slate-400 space-y-1 mb-3">
                        <p><span className="text-slate-500">Inv. Inicial:</span> {Number(inv.inventarioInicial).toFixed(2)}</p>
                        <p><span className="text-slate-500">Entradas:</span> {Number(inv.entradas).toFixed(2)}</p>
                        <p><span className="text-slate-500">Salidas:</span> {Number(inv.salidas).toFixed(2)}</p>
                        <p><span className="text-slate-500">Inv. Final:</span> {Number(inv.inventarioFinal).toFixed(2)}</p>
                        <p><span className="text-slate-500">Costo Promedio:</span> {Number(inv.costoPromedio).toFixed(2)}</p>
                      </div>
                      <button className="w-full rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700">
                        Editar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: Costo de Venta */}
            {activeTab === "costo-venta" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Costo de Venta</h3>
                  <div className="flex gap-2">
                    <input
                      type="month"
                      value={periodo}
                      onChange={(e) => setPeriodo(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    />
                    <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                      Exportar PDF
                    </button>
                  </div>
                </div>
                {costOfSales && (
                  <div>
                    <div className="mb-4 p-4 rounded-lg bg-slate-800">
                      <p className="text-sm text-slate-400">Período: {costOfSales.periodo}</p>
                      <p className="text-lg font-bold text-white">Total General: {Number(costOfSales.totalGeneral).toFixed(2)}</p>
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="text-slate-400">
                          <tr>
                            <th className="p-2">Insumo</th>
                            <th className="p-2">Inv. Inicial</th>
                            <th className="p-2">Compras</th>
                            <th className="p-2">Inv. Final</th>
                            <th className="p-2">Costo de Venta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {costOfSales.detalles.map((detalle: any, index: number) => (
                            <tr key={index} className="border-t border-slate-800">
                              <td className="p-2 font-medium">{getInsumoName(detalle.insumoId)}</td>
                              <td className="p-2">{Number(detalle.inventarioInicial).toFixed(2)}</td>
                              <td className="p-2">{Number(detalle.entradas).toFixed(2)}</td>
                              <td className="p-2">{Number(detalle.inventarioFinal).toFixed(2)}</td>
                              <td className="p-2 font-bold">{Number(detalle.costoVenta).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden space-y-3">
                      {costOfSales.detalles.map((detalle: any, index: number) => (
                        <div key={index} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                          <p className="font-semibold text-white mb-2">{getInsumoName(detalle.insumoId)}</p>
                          <div className="text-xs text-slate-400 space-y-1 mb-3">
                            <p><span className="text-slate-500">Inv. Inicial:</span> {Number(detalle.inventarioInicial).toFixed(2)}</p>
                            <p><span className="text-slate-500">Compras:</span> {Number(detalle.entradas).toFixed(2)}</p>
                            <p><span className="text-slate-500">Inv. Final:</span> {Number(detalle.inventarioFinal).toFixed(2)}</p>
                            <p><span className="text-slate-500">Costo de Venta:</span> <span className="font-bold text-white">{Number(detalle.costoVenta).toFixed(2)}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <CreateInsumoModal
          open={insumoModalOpen}
          onClose={() => setInsumoModalOpen(false)}
          onCreated={() => { loadInsumos(); setInsumoModalOpen(false); }}
          suppliers={suppliers}
          insumo={selectedInsumo}
        />

        <CreateRecipeModal
          open={recipeModalOpen}
          onClose={() => setRecipeModalOpen(false)}
          onCreated={() => { loadRecipes(); setRecipeModalOpen(false); }}
          insumos={insumos}
          recipe={selectedRecipe}
        />
      </div>
    </MainLayout>
  );
}
