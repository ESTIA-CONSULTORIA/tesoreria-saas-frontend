import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateInsumoModal from "./CreateInsumoModal";
import CreateRecipeModal from "./CreateRecipeModal";

interface Insumo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  presentacion: string;
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

interface PhysicalCount {
  id: string;
  fecha: string;
  insumoId: string;
  existenciaTeorica: number;
  existenciaFisica: number;
  diferencia: number;
  motivo: string;
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
  const [physicalCounts, setPhysicalCounts] = useState<PhysicalCount[]>([]);
  const [costOfSales, setCostOfSales] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [insumoModalOpen, setInsumoModalOpen] = useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [viewInsumoModalOpen, setViewInsumoModalOpen] = useState(false);
  const [physicalCountModalOpen, setPhysicalCountModalOpen] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [physicalCountData, setPhysicalCountData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    insumoId: "",
    existenciaFisica: 0,
    motivo: "",
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (activeTab === "insumos") loadInsumos();
    if (activeTab === "recetas") loadRecipes();
    if (activeTab === "inventario") {
      loadInventory();
      loadPhysicalCounts();
    }
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

  async function loadPhysicalCounts() {
    try {
      const response = await api.get("/costs/physical-counts");
      setPhysicalCounts(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error("Error loading physical counts:", err);
      setPhysicalCounts([]);
    }
  }

  async function createPhysicalCount() {
    try {
      setLoading(true);
      setError("");
      await api.post("/costs/physical-counts", physicalCountData);
      setPhysicalCountModalOpen(false);
      setPhysicalCountData({
        fecha: new Date().toISOString().split('T')[0],
        insumoId: "",
        existenciaFisica: 0,
        motivo: "",
      });
      loadPhysicalCounts();
      loadInsumos();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar el conteo físico");
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

  function handleViewInsumo(insumo: Insumo) {
    setSelectedInsumo(insumo);
    setViewInsumoModalOpen(true);
  }

  function getRecipesUsingInsumo(insumoId: string): Recipe[] {
    return recipes.filter(recipe => 
      recipe.items?.some((item: any) => item.insumoId === insumoId)
    );
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
                              <button className="rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600" onClick={() => handleViewInsumo(insumo)}>
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
                        <button className="flex-1 rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600" onClick={() => handleViewInsumo(insumo)}>
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

                {/* Conteo Físico Section */}
                <div className="mt-8 border-t border-slate-800 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Conteo Físico</h3>
                    <button
                      onClick={() => setPhysicalCountModalOpen(true)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      + Nuevo Conteo
                    </button>
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="p-2">Fecha</th>
                          <th className="p-2">Insumo</th>
                          <th className="p-2">Existencia Teórica</th>
                          <th className="p-2">Existencia Física</th>
                          <th className="p-2">Diferencia</th>
                          <th className="p-2">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {physicalCounts.map((pc) => (
                          <tr key={pc.id} className="border-t border-slate-800">
                            <td className="p-2">{new Date(pc.fecha).toLocaleDateString()}</td>
                            <td className="p-2 font-medium">{getInsumoName(pc.insumoId)}</td>
                            <td className="p-2">{Number(pc.existenciaTeorica).toFixed(2)}</td>
                            <td className="p-2">{Number(pc.existenciaFisica).toFixed(2)}</td>
                            <td className={`p-2 font-bold ${pc.diferencia < 0 ? 'text-red-400' : pc.diferencia > 0 ? 'text-green-400' : ''}`}>
                              {pc.diferencia > 0 ? '+' : ''}{Number(pc.diferencia).toFixed(2)}
                            </td>
                            <td className="p-2">{pc.motivo || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-3">
                    {physicalCounts.map((pc) => (
                      <div key={pc.id} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-white">{getInsumoName(pc.insumoId)}</p>
                          <span className="text-xs text-slate-400">{new Date(pc.fecha).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1 mb-3">
                          <p><span className="text-slate-500">Teórica:</span> {Number(pc.existenciaTeorica).toFixed(2)}</p>
                          <p><span className="text-slate-500">Física:</span> {Number(pc.existenciaFisica).toFixed(2)}</p>
                          <p><span className="text-slate-500">Diferencia:</span> <span className={`font-bold ${pc.diferencia < 0 ? 'text-red-400' : pc.diferencia > 0 ? 'text-green-400' : ''}`}>
                            {pc.diferencia > 0 ? '+' : ''}{Number(pc.diferencia).toFixed(2)}
                          </span></p>
                          {pc.motivo && <p><span className="text-slate-500">Motivo:</span> {pc.motivo}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
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

        {/* Modal de Detalle de Insumo */}
        {viewInsumoModalOpen && selectedInsumo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
              <div className="flex-shrink-0 p-6 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedInsumo.nombre}</h3>
                    <p className="text-sm text-slate-400">{selectedInsumo.codigo || "Sin código"}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`rounded-full px-3 py-1 text-sm ${selectedInsumo.isActive ? "bg-green-900/40 text-green-300" : "bg-slate-700 text-slate-300"}`}>
                      {selectedInsumo.isActive ? "Activo" : "Inactivo"}
                    </span>
                    <button
                      onClick={() => { setViewInsumoModalOpen(false); setSelectedInsumo(null); }}
                      className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-slate-400">Código</p>
                    <p className="text-white">{selectedInsumo.codigo || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Presentación</p>
                    <p className="text-white">{selectedInsumo.presentacion || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Unidad de medida</p>
                    <p className="text-white">{selectedInsumo.unidadMedida}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Costo unitario</p>
                    <p className="text-white">{Number(selectedInsumo.costoUnitario).toFixed(2)} {selectedInsumo.moneda}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Proveedor</p>
                    <p className="text-white">{getSupplierName(selectedInsumo.proveedorId)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Stock actual</p>
                    <p className={`text-white font-bold ${isLowStock(selectedInsumo) ? "text-red-400" : ""}`}>
                      {Number(selectedInsumo.stockActual).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Stock mínimo</p>
                    <p className="text-white">{Number(selectedInsumo.stockMinimo).toFixed(2)}</p>
                  </div>
                </div>

                {selectedInsumo.descripcion && (
                  <div className="mb-6">
                    <p className="text-xs text-slate-400 mb-1">Descripción</p>
                    <p className="text-white">{selectedInsumo.descripcion}</p>
                  </div>
                )}

                {/* Indicador visual de stock */}
                <div className={`mb-6 p-4 rounded-lg ${isLowStock(selectedInsumo) ? "bg-red-900/30 border border-red-700" : "bg-green-900/30 border border-green-700"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isLowStock(selectedInsumo) ? "bg-red-500" : "bg-green-500"}`}></div>
                    <p className={`text-sm font-medium ${isLowStock(selectedInsumo) ? "text-red-300" : "text-green-300"}`}>
                      {isLowStock(selectedInsumo) ? "⚠️ Stock bajo - Requiere reabastecimiento" : "✓ Stock adecuado"}
                    </p>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${isLowStock(selectedInsumo) ? "bg-red-500" : "bg-green-500"}`}
                        style={{ width: `${Math.min(100, (Number(selectedInsumo.stockActual) / Number(selectedInsumo.stockMinimo)) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {((Number(selectedInsumo.stockActual) / Number(selectedInsumo.stockMinimo)) * 100).toFixed(0)}% del stock mínimo
                    </p>
                  </div>
                </div>

                {/* Recetas donde se usa este insumo */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-3">Recetas que usan este insumo</h4>
                  {(() => {
                    const recipesUsing = getRecipesUsingInsumo(selectedInsumo.id);
                    if (recipesUsing.length === 0) {
                      return <p className="text-slate-400 text-sm">Este insumo no se usa en ninguna receta</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {recipesUsing.map((recipe) => (
                          <div key={recipe.id} className="p-3 rounded-lg bg-slate-800">
                            <p className="text-white font-medium">{recipe.nombre}</p>
                            <p className="text-xs text-slate-400">{recipe.descripcion || "Sin descripción"}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Historial de movimientos (placeholder - requiere endpoint backend) */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Historial de movimientos</h4>
                  <p className="text-slate-400 text-sm">El historial de entradas y salidas estará disponible en una próxima versión.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Conteo Físico */}
        {physicalCountModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Nuevo Conteo Físico</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={physicalCountData.fecha}
                    onChange={(e) => setPhysicalCountData({ ...physicalCountData, fecha: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Insumo</label>
                  <select
                    value={physicalCountData.insumoId}
                    onChange={(e) => setPhysicalCountData({ ...physicalCountData, insumoId: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">Seleccionar insumo</option>
                    {insumos.map((i) => (
                      <option key={i.id} value={i.id}>{i.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Existencia Física</label>
                  <input
                    type="number"
                    value={physicalCountData.existenciaFisica}
                    onChange={(e) => setPhysicalCountData({ ...physicalCountData, existenciaFisica: Number(e.target.value) })}
                    step="0.01"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Motivo (opcional)</label>
                  <textarea
                    value={physicalCountData.motivo}
                    onChange={(e) => setPhysicalCountData({ ...physicalCountData, motivo: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    rows={2}
                  />
                </div>
              </div>
              {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setPhysicalCountModalOpen(false); setError(""); }}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={createPhysicalCount}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
