import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateInsumoModal from "./CreateInsumoModal";
import CreateRecipeModal from "./CreateRecipeModal";
import { useCompanyStore } from "../../core/store/useCompanyStore";

interface Insumo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  familia: string;
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

interface Justifiable {
  id: string;
  periodo: string;
  categoria: string;
  descripcion: string;
  monto: number;
  detalles: any;
}

interface Supplier {
  id: string;
  nombre: string;
}

interface Almacen {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  sucursalId: string;
  tipo: string;
  responsable: string;
  isActive: boolean;
}

interface FamiliaInsumo {
  id: string;
  nombre: string;
  prefijo: string;
  descripcion: string;
  color: string;
  isActive: boolean;
}

export default function CostsPage() {
  const { activeCompany } = useCompanyStore();
  const [activeTab, setActiveTab] = useState("insumos");
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [physicalCounts, setPhysicalCounts] = useState<PhysicalCount[]>([]);
  const [justificables, setJustificables] = useState<Justifiable[]>([]);
  const [justifiableTotals, setJustifiableTotals] = useState<any>(null);
  const [costOfSales, setCostOfSales] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [familias, setFamilias] = useState<FamiliaInsumo[]>([]);
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [insumoModalOpen, setInsumoModalOpen] = useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [viewInsumoModalOpen, setViewInsumoModalOpen] = useState(false);
  const [almacenModalOpen, setAlmacenModalOpen] = useState(false);
  const [familiaModalOpen, setFamiliaModalOpen] = useState(false);
  const [physicalCountConfigOpen, setPhysicalCountConfigOpen] = useState(false);
  const [physicalCountSessionOpen, setPhysicalCountSessionOpen] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedAlmacen, setSelectedAlmacen] = useState<Almacen | null>(null);
  const [selectedFamilia, setSelectedFamilia] = useState<FamiliaInsumo | null>(null);
  const [physicalCountConfig, setPhysicalCountConfig] = useState({
    fecha: new Date().toISOString().split('T')[0],
    almacen: "",
    responsable: "",
  });
  const [physicalCountItems, setPhysicalCountItems] = useState<any[]>([]);

  // CSV Import states
  const [insumoImportModalOpen, setInsumoImportModalOpen] = useState(false);
  const [recipeImportModalOpen, setRecipeImportModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvImportResult, setCsvImportResult] = useState<{ success: number; errors: any[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadSuppliers();
    loadAlmacenes();
    loadFamilias();
  }, []);

  useEffect(() => {
    if (activeTab === "insumos") loadInsumos();
    if (activeTab === "recetas") loadRecipes();
    if (activeTab === "inventario") {
      loadInventory();
      loadPhysicalCounts();
    }
    if (activeTab === "costo-venta") {
      loadCostOfSales();
      loadJustificables();
    }
    if (activeTab === "almacenes") loadAlmacenes();
    if (activeTab === "familias") loadFamilias();
  }, [activeTab, periodo, activeCompany?.id]);

  async function loadSuppliers() {
    try {
      const response = await api.get("/suppliers");
      setSuppliers(Array.isArray(response.data) ? response.data : []);
    } catch {
      setSuppliers([]);
    }
  }

  async function loadAlmacenes() {
    try {
      const response = await api.get("/costs/almacenes");
      setAlmacenes(Array.isArray(response.data) ? response.data : []);
    } catch {
      setAlmacenes([]);
    }
  }

  async function loadFamilias() {
    try {
      const response = await api.get("/costs/familias");
      setFamilias(Array.isArray(response.data) ? response.data : []);
    } catch {
      setFamilias([]);
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

  async function startPhysicalCountSession() {
    try {
      setLoading(true);
      setError("");
      // Load all insumos for the selected almacen
      const response = await api.get("/costs/insumos");
      const allInsumos = Array.isArray(response.data) ? response.data : [];
      
      // Initialize physical count items with theoretical stock
      const items = allInsumos.map((insumo: Insumo) => ({
        insumoId: insumo.id,
        codigo: insumo.codigo,
        nombre: insumo.nombre,
        familia: insumo.familia,
        unidadMedida: insumo.unidadMedida,
        existenciaTeorica: insumo.stockActual,
        conteoFisico: "",
        diferencia: 0,
      }));
      
      setPhysicalCountItems(items);
      setPhysicalCountConfigOpen(false);
      setPhysicalCountSessionOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible iniciar el conteo físico");
    } finally {
      setLoading(false);
    }
  }

  async function savePhysicalCountSession() {
    try {
      setLoading(true);
      setError("");
      
      // Only save items with physical count values
      const itemsToSave = physicalCountItems.filter(item => item.conteoFisico !== "");
      
      if (itemsToSave.length === 0) {
        setError("No hay insumos contados");
        return;
      }
      
      // Create physical count records for each counted item
      for (const item of itemsToSave) {
        await api.post("/costs/physical-counts", {
          fecha: physicalCountConfig.fecha,
          insumoId: item.insumoId,
          existenciaFisica: Number(item.conteoFisico),
          motivo: `Conteo: ${physicalCountConfig.almacen} - ${physicalCountConfig.responsable}`,
        });
      }
      
      setPhysicalCountSessionOpen(false);
      setPhysicalCountConfig({
        fecha: new Date().toISOString().split('T')[0],
        almacen: "",
        responsable: "",
      });
      setPhysicalCountItems([]);
      loadPhysicalCounts();
      loadInsumos();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar el conteo físico");
    } finally {
      setLoading(false);
    }
  }

  function updatePhysicalCountItem(index: number, conteoFisico: string) {
    const newItems = [...physicalCountItems];
    const item = newItems[index];
    item.conteoFisico = conteoFisico;
    const fisico = Number(conteoFisico) || 0;
    item.diferencia = item.existenciaTeorica - fisico;
    setPhysicalCountItems(newItems);
  }

  // Almacenes CRUD
  async function createAlmacen(data: any) {
    try {
      setLoading(true);
      setError("");
      await api.post("/costs/almacenes", data);
      setAlmacenModalOpen(false);
      setSelectedAlmacen(null);
      loadAlmacenes();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar el almacén");
    } finally {
      setLoading(false);
    }
  }

  async function updateAlmacen(id: string, data: any) {
    try {
      setLoading(true);
      setError("");
      await api.put(`/costs/almacenes/${id}`, data);
      setAlmacenModalOpen(false);
      setSelectedAlmacen(null);
      loadAlmacenes();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible actualizar el almacén");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAlmacen(id: string) {
    if (!confirm("¿Estás seguro de eliminar este almacén?")) return;
    try {
      setLoading(true);
      setError("");
      await api.delete(`/costs/almacenes/${id}`);
      loadAlmacenes();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible eliminar el almacén");
    } finally {
      setLoading(false);
    }
  }

  // Familias CRUD
  async function createFamilia(data: any) {
    try {
      setLoading(true);
      setError("");
      await api.post("/costs/familias", data);
      setFamiliaModalOpen(false);
      setSelectedFamilia(null);
      loadFamilias();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible guardar la familia");
    } finally {
      setLoading(false);
    }
  }

  async function updateFamilia(id: string, data: any) {
    try {
      setLoading(true);
      setError("");
      await api.put(`/costs/familias/${id}`, data);
      setFamiliaModalOpen(false);
      setSelectedFamilia(null);
      loadFamilias();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible actualizar la familia");
    } finally {
      setLoading(false);
    }
  }

  async function deleteFamilia(id: string) {
    if (!confirm("¿Estás seguro de eliminar esta familia?")) return;
    try {
      setLoading(true);
      setError("");
      await api.delete(`/costs/familias/${id}`);
      loadFamilias();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible eliminar la familia");
    } finally {
      setLoading(false);
    }
  }

  async function loadJustificables() {
    try {
      const [justificablesRes, totalsRes] = await Promise.all([
        api.get("/costs/justificables", { params: { periodo } }),
        api.get("/costs/justificables/totals", { params: { periodo } }),
      ]);
      setJustificables(Array.isArray(justificablesRes.data) ? justificablesRes.data : []);
      setJustifiableTotals(totalsRes.data);
    } catch (err: any) {
      console.error("Error loading justificables:", err);
      setJustificables([]);
      setJustifiableTotals(null);
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

  function getCategoriaLabel(categoria: string): string {
    const labels: Record<string, string> = {
      'ENERGETICOS': 'Energéticos',
      'INSUMOS_SERVICIO': 'Insumos Servicio',
      'CORTESIAS_DESCUENTOS': 'Cortesías/Descuentos',
      'MERMAS_FALTANTES': 'Mermas/Faltantes',
    };
    return labels[categoria] || categoria;
  }

  // CSV Import functions
  function parseCSV(text: string): string[] {
    const lines: string[] = [];
    let currentLine = "";
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        lines.push(currentLine);
        currentLine = "";
      } else if (char === '\n' && !inQuotes) {
        lines.push(currentLine);
        currentLine = "";
      } else {
        currentLine += char;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    return lines;
  }

  function downloadCSVTemplate(type: "insumos" | "recetas" | "productos") {
    let content = "";
    let filename = "";
    
    if (type === "insumos") {
      content = "nombre,familia,presentacion,presentacionCompra,unidadMedida,costoUnitario,stockMinimo,proveedorNombre\n";
      content += "Harina de trigo,ALI,1 kg,50 kg,kg,25.50,10,Proveedor A\n";
      content += "Azúcar,ALI,1 kg,50 kg,kg,18.00,15,Proveedor B\n";
      filename = "plantilla_insumos.csv";
    } else if (type === "recetas") {
      content = "nombreReceta,porciones,nombreInsumo,cantidad,unidadMedida\n";
      content += "Pastel de Chocolate,8,Harina de trigo,500,g\n";
      content += "Pastel de Chocolate,8,Azúcar,300,g\n";
      content += "Pastel de Chocolate,8,Huevos,4,pieza\n";
      content += "Pastel de Chocolate,8,Chocolate,200,g\n";
      filename = "plantilla_recetas.csv";
    } else if (type === "productos") {
      content = "nombre,categoria,precio,impuesto,descripcion\n";
      content += "Hamburguesa Clásica,Comida,85.00,16,Hamburguesa con carne de res\n";
      content += "Refresco Cola,Bebidas,25.00,16,Refresco de cola 355ml\n";
      filename = "plantilla_productos.csv";
    }
    
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    setCsvImportResult(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = parseCSV(text);
      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((h, i) => obj[h] = values[i] || "");
        return obj;
      });
      setCsvPreview(data.slice(0, 5));
    };
    reader.readAsText(file);
  }

  async function importInsumosFromCSV() {
    if (!csvFile) return;
    
    try {
      setIsImporting(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = parseCSV(text);
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((h, i) => obj[h] = values[i] || "");
          return obj;
        });
        
        const response = await api.post("/costs/insumos/import", { insumos: data });
        setCsvImportResult(response.data);
        loadInsumos();
      };
      reader.readAsText(csvFile);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al importar insumos");
    } finally {
      setIsImporting(false);
    }
  }

  async function importRecipesFromCSV() {
    if (!csvFile) return;
    
    try {
      setIsImporting(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = parseCSV(text);
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((h, i) => obj[h] = values[i] || "");
          return obj;
        });
        
        const response = await api.post("/costs/recipes/import", { recetas: data });
        setCsvImportResult(response.data);
        loadRecipes();
      };
      reader.readAsText(csvFile);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al importar recetas");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <MainLayout>
      {!activeCompany ? (
        <div style={{ padding: '24px', backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', color: '#8A6A3A', textAlign: 'center' }}>
          Selecciona una empresa para ver los datos
        </div>
      ) : (
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
            onClick={() => setActiveTab("almacenes")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "almacenes"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Almacenes
          </button>
          <button
            onClick={() => setActiveTab("familias")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "familias"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Familias
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
                  <div className="flex gap-2">
                    <button className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600" onClick={() => { setInsumoImportModalOpen(true); }}>
                      Importar CSV
                    </button>
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={() => { setSelectedInsumo(null); setInsumoModalOpen(true); }}>
                      + Nuevo Insumo
                    </button>
                  </div>
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
                  <div className="flex gap-2">
                    <button className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600" onClick={() => { setRecipeImportModalOpen(true); }}>
                      Importar CSV
                    </button>
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={() => { setSelectedRecipe(null); setRecipeModalOpen(true); }}>
                      + Nueva Receta
                    </button>
                  </div>
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
                      onClick={() => setPhysicalCountConfigOpen(true)}
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

            {/* TAB 4: Almacenes */}
            {activeTab === "almacenes" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Almacenes</h3>
                  <button
                    onClick={() => { setSelectedAlmacen(null); setAlmacenModalOpen(true); }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    + Nuevo Almacén
                  </button>
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">Código</th>
                        <th className="p-2">Nombre</th>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Responsable</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {almacenes.map((alm) => (
                        <tr key={alm.id} className="border-t border-slate-800">
                          <td className="p-2">{alm.codigo}</td>
                          <td className="p-2 font-medium">{alm.nombre}</td>
                          <td className="p-2">{alm.tipo}</td>
                          <td className="p-2">{alm.responsable || '-'}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${alm.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                              {alm.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => { setSelectedAlmacen(alm); setAlmacenModalOpen(true); }}
                              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 mr-2"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => deleteAlmacen(alm.id)}
                              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-3">
                  {almacenes.map((alm) => (
                    <div key={alm.id} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-white">{alm.nombre}</p>
                        <span className={`px-2 py-1 rounded text-xs ${alm.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                          {alm.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 mb-3">
                        <p><span className="text-slate-500">Código:</span> {alm.codigo}</p>
                        <p><span className="text-slate-500">Tipo:</span> {alm.tipo}</p>
                        <p><span className="text-slate-500">Responsable:</span> {alm.responsable || '-'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelectedAlmacen(alm); setAlmacenModalOpen(true); }}
                          className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteAlmacen(alm.id)}
                          className="flex-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: Familias */}
            {activeTab === "familias" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Familias de Insumos</h3>
                  <button
                    onClick={() => { setSelectedFamilia(null); setFamiliaModalOpen(true); }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    + Nueva Familia
                  </button>
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">Prefijo</th>
                        <th className="p-2">Nombre</th>
                        <th className="p-2">Descripción</th>
                        <th className="p-2">Color</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {familias.map((fam) => (
                        <tr key={fam.id} className="border-t border-slate-800">
                          <td className="p-2 font-mono">{fam.prefijo}</td>
                          <td className="p-2 font-medium">{fam.nombre}</td>
                          <td className="p-2">{fam.descripcion || '-'}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: fam.color }}></div>
                              <span className="text-xs">{fam.color}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${fam.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                              {fam.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => { setSelectedFamilia(fam); setFamiliaModalOpen(true); }}
                              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 mr-2"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => deleteFamilia(fam.id)}
                              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-3">
                  {familias.map((fam) => (
                    <div key={fam.id} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: fam.color }}></div>
                          <p className="font-semibold text-white">{fam.nombre}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${fam.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                          {fam.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 mb-3">
                        <p><span className="text-slate-500">Prefijo:</span> <span className="font-mono">{fam.prefijo}</span></p>
                        <p><span className="text-slate-500">Descripción:</span> {fam.descripcion || '-'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelectedFamilia(fam); setFamiliaModalOpen(true); }}
                          className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteFamilia(fam.id)}
                          className="flex-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: Costo de Venta */}
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

                {/* Justificables Section */}
                <div className="mt-8 border-t border-slate-800 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Justificables</h3>
                  </div>
                  {justifiableTotals && (
                    <div className="mb-4 p-4 rounded-lg bg-slate-800">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-xs text-slate-400">Energéticos</p>
                          <p className="text-white">{Number(justifiableTotals.ENERGETICOS).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Insumos Servicio</p>
                          <p className="text-white">{Number(justifiableTotals.INSUMOS_SERVICIO).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Cortesías/Descuentos</p>
                          <p className="text-white">{Number(justifiableTotals.CORTESIAS_DESCUENTOS).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Mermas/Faltantes</p>
                          <p className="text-white">{Number(justifiableTotals.MERMAS_FALTANTES).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Total Justificables</p>
                          <p className="text-white font-bold">{Number(justifiableTotals.TOTAL).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="p-2">Categoría</th>
                          <th className="p-2">Descripción</th>
                          <th className="p-2">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {justificables.map((j) => (
                          <tr key={j.id} className="border-t border-slate-800">
                            <td className="p-2">{getCategoriaLabel(j.categoria)}</td>
                            <td className="p-2">{j.descripcion || '-'}</td>
                            <td className="p-2">{Number(j.monto).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-3">
                    {justificables.map((j) => (
                      <div key={j.id} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-white">{getCategoriaLabel(j.categoria)}</p>
                          <span className="text-white font-bold">{Number(j.monto).toFixed(2)}</span>
                        </div>
                        {j.descripcion && <p className="text-xs text-slate-400">{j.descripcion}</p>}
                      </div>
                    ))}
                  </div>
                </div>
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

        {/* Modal de Configuración de Conteo Físico */}
        {physicalCountConfigOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Configurar Conteo Físico</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Fecha y Hora</label>
                  <input
                    type="datetime-local"
                    value={physicalCountConfig.fecha}
                    onChange={(e) => setPhysicalCountConfig({ ...physicalCountConfig, fecha: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Almacén/Sucursal</label>
                  <select
                    value={physicalCountConfig.almacen}
                    onChange={(e) => setPhysicalCountConfig({ ...physicalCountConfig, almacen: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">Seleccionar almacén</option>
                    {almacenes.map((alm) => (
                      <option key={alm.id} value={alm.id}>{alm.nombre} ({alm.codigo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Responsable</label>
                  <input
                    type="text"
                    value={physicalCountConfig.responsable}
                    onChange={(e) => setPhysicalCountConfig({ ...physicalCountConfig, responsable: e.target.value })}
                    placeholder="Nombre del responsable"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setPhysicalCountConfigOpen(false); setError(""); }}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={startPhysicalCountSession}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {loading ? "Cargando..." : "Iniciar Conteo"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Sesión de Conteo Físico */}
        {physicalCountSessionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-6xl max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
              <div className="flex-shrink-0 p-6 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Conteo Físico</h3>
                    <p className="text-sm text-slate-400">
                      {physicalCountConfig.almacen} - {physicalCountConfig.responsable}
                    </p>
                  </div>
                  <button
                    onClick={() => setPhysicalCountSessionOpen(false)}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {error && (
                  <div className="mb-4 rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
                    {error}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-sm">
                    <thead className="text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2 w-16">Código</th>
                        <th className="p-2">Nombre</th>
                        <th className="p-2 w-20">Familia</th>
                        <th className="p-2 w-16">Unidad</th>
                        <th className="p-2 w-20 text-right">Teórica</th>
                        <th className="p-2 w-20">Físico</th>
                        <th className="p-2 w-20 text-right">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {physicalCountItems.map((item, index) => (
                        <tr key={item.insumoId} className="border-t border-slate-800">
                          <td className="p-2 text-xs">{item.codigo}</td>
                          <td className="p-2">{item.nombre}</td>
                          <td className="p-2 text-xs">{item.familia || '-'}</td>
                          <td className="p-2 text-xs">{item.unidadMedida}</td>
                          <td className="p-2 text-right">{item.existenciaTeorica.toFixed(2)}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.conteoFisico}
                              onChange={(e) => updatePhysicalCountItem(index, e.target.value)}
                              step="0.01"
                              placeholder="0"
                              className="w-full rounded border border-slate-700 bg-slate-800 p-1 text-white text-xs outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className={`p-2 text-right text-xs ${
                            item.diferencia === 0 ? 'text-green-400' :
                            Math.abs(item.diferencia) < 5 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {item.conteoFisico !== "" ? item.diferencia.toFixed(2) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex-shrink-0 p-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  onClick={() => setPhysicalCountSessionOpen(false)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={savePhysicalCountSession}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {loading ? "Guardando..." : "Guardar Conteo"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Almacen */}
        {almacenModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-xl font-bold text-white mb-4">
                {selectedAlmacen ? 'Editar Almacén' : 'Nuevo Almacén'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Código</label>
                  <input
                    type="text"
                    defaultValue={selectedAlmacen?.codigo || ''}
                    id="almacen-codigo"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nombre</label>
                  <input
                    type="text"
                    defaultValue={selectedAlmacen?.nombre || ''}
                    id="almacen-nombre"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Descripción</label>
                  <textarea
                    defaultValue={selectedAlmacen?.descripcion || ''}
                    id="almacen-descripcion"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Tipo</label>
                  <select
                    defaultValue={selectedAlmacen?.tipo || 'GENERAL'}
                    id="almacen-tipo"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="GENERAL">General</option>
                    <option value="REFRIGERADO">Refrigerado</option>
                    <option value="SECO">Seco</option>
                    <option value="CONGELADO">Congelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Responsable</label>
                  <input
                    type="text"
                    defaultValue={selectedAlmacen?.responsable || ''}
                    id="almacen-responsable"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      defaultChecked={selectedAlmacen?.isActive ?? true}
                      id="almacen-isActive"
                      className="rounded border-slate-700 bg-slate-800"
                    />
                    Activo
                  </label>
                </div>
              </div>
              {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setAlmacenModalOpen(false); setSelectedAlmacen(null); setError(""); }}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const codigo = (document.getElementById('almacen-codigo') as HTMLInputElement).value;
                    const nombre = (document.getElementById('almacen-nombre') as HTMLInputElement).value;
                    const descripcion = (document.getElementById('almacen-descripcion') as HTMLTextAreaElement).value;
                    const tipo = (document.getElementById('almacen-tipo') as HTMLSelectElement).value;
                    const responsable = (document.getElementById('almacen-responsable') as HTMLInputElement).value;
                    const isActive = (document.getElementById('almacen-isActive') as HTMLInputElement).checked;
                    const data = { codigo, nombre, descripcion, tipo, responsable, isActive };
                    if (selectedAlmacen) {
                      updateAlmacen(selectedAlmacen.id, data);
                    } else {
                      createAlmacen(data);
                    }
                  }}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Familia */}
        {familiaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-xl font-bold text-white mb-4">
                {selectedFamilia ? 'Editar Familia' : 'Nueva Familia'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Prefijo (3-4 letras)</label>
                  <input
                    type="text"
                    defaultValue={selectedFamilia?.prefijo || ''}
                    id="familia-prefijo"
                    maxLength={4}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nombre</label>
                  <input
                    type="text"
                    defaultValue={selectedFamilia?.nombre || ''}
                    id="familia-nombre"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Descripción</label>
                  <textarea
                    defaultValue={selectedFamilia?.descripcion || ''}
                    id="familia-descripcion"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      defaultValue={selectedFamilia?.color || '#64748B'}
                      id="familia-color"
                      className="w-12 h-10 rounded border border-slate-700 bg-slate-800"
                    />
                    <input
                      type="text"
                      defaultValue={selectedFamilia?.color || '#64748B'}
                      id="familia-color-text"
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      defaultChecked={selectedFamilia?.isActive ?? true}
                      id="familia-isActive"
                      className="rounded border-slate-700 bg-slate-800"
                    />
                    Activo
                  </label>
                </div>
              </div>
              {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setFamiliaModalOpen(false); setSelectedFamilia(null); setError(""); }}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const prefijo = (document.getElementById('familia-prefijo') as HTMLInputElement).value.toUpperCase();
                    const nombre = (document.getElementById('familia-nombre') as HTMLInputElement).value;
                    const descripcion = (document.getElementById('familia-descripcion') as HTMLTextAreaElement).value;
                    const color = (document.getElementById('familia-color') as HTMLInputElement).value;
                    const isActive = (document.getElementById('familia-isActive') as HTMLInputElement).checked;
                    const data = { prefijo, nombre, descripcion, color, isActive };
                    if (selectedFamilia) {
                      updateFamilia(selectedFamilia.id, data);
                    } else {
                      createFamilia(data);
                    }
                  }}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Importación CSV Insumos */}
        {insumoImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-4">Importar Insumos desde CSV</h3>
              
              <div className="space-y-4">
                <button
                  onClick={() => downloadCSVTemplate("insumos")}
                  className="w-full rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700 border border-slate-700"
                >
                  📥 Descargar Plantilla CSV
                </button>

                <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer"
                  >
                    <div className="text-slate-400 mb-2">
                      Arrastra tu archivo CSV aquí o haz clic para seleccionar
                    </div>
                    <div className="text-sm text-slate-500">
                      Formato: nombre, familia, presentacion, presentacionCompra, unidadMedida, costoUnitario, stockMinimo, proveedorNombre
                    </div>
                  </label>
                </div>

                {csvPreview.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Vista Previa (primeras 5 filas):</h4>
                    <div className="rounded-lg border border-slate-800 bg-slate-800 overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="text-slate-400">
                          <tr>
                            {Object.keys(csvPreview[0]).map(key => (
                              <th key={key} className="p-2 text-left">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.map((row, i) => (
                            <tr key={i} className="border-t border-slate-700">
                              {Object.values(row).map((val: any, j) => (
                                <td key={j} className="p-2">{val}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {csvImportResult && (
                  <div className={`rounded-lg p-4 ${csvImportResult.success > 0 ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
                    <p className="text-white font-semibold">
                      {csvImportResult.success} insumos importados correctamente
                    </p>
                    {csvImportResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-red-300 text-sm">{csvImportResult.errors.length} errores:</p>
                        <ul className="text-xs text-red-300 mt-1 space-y-1">
                          {csvImportResult.errors.map((err: any, i) => (
                            <li key={i}>Fila {err.row}: {err.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setInsumoImportModalOpen(false);
                    setCsvFile(null);
                    setCsvPreview([]);
                    setCsvImportResult(null);
                  }}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={importInsumosFromCSV}
                  disabled={!csvFile || isImporting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {isImporting ? "Importando..." : "Importar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Importación CSV Recetas */}
        {recipeImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-4">Importar Recetas desde CSV</h3>
              
              <div className="space-y-4">
                <button
                  onClick={() => downloadCSVTemplate("recetas")}
                  className="w-full rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700 border border-slate-700"
                >
                  📥 Descargar Plantilla CSV
                </button>

                <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload-recipes"
                  />
                  <label
                    htmlFor="csv-upload-recipes"
                    className="cursor-pointer"
                  >
                    <div className="text-slate-400 mb-2">
                      Arrastra tu archivo CSV aquí o haz clic para seleccionar
                    </div>
                    <div className="text-sm text-slate-500">
                      Formato: nombreReceta, porciones, nombreInsumo, cantidad, unidadMedida
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Una fila por insumo de la receta. El sistema agrupa por nombreReceta.
                    </div>
                  </label>
                </div>

                {csvPreview.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Vista Previa (primeras 5 filas):</h4>
                    <div className="rounded-lg border border-slate-800 bg-slate-800 overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="text-slate-400">
                          <tr>
                            {Object.keys(csvPreview[0]).map(key => (
                              <th key={key} className="p-2 text-left">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.map((row, i) => (
                            <tr key={i} className="border-t border-slate-700">
                              {Object.values(row).map((val: any, j) => (
                                <td key={j} className="p-2">{val}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {csvImportResult && (
                  <div className={`rounded-lg p-4 ${csvImportResult.success > 0 ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
                    <p className="text-white font-semibold">
                      {csvImportResult.success} recetas importadas correctamente
                    </p>
                    {csvImportResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-red-300 text-sm">{csvImportResult.errors.length} errores:</p>
                        <ul className="text-xs text-red-300 mt-1 space-y-1">
                          {csvImportResult.errors.map((err: any, i) => (
                            <li key={i}>Fila {err.row}: {err.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setRecipeImportModalOpen(false);
                    setCsvFile(null);
                    setCsvPreview([]);
                    setCsvImportResult(null);
                  }}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={importRecipesFromCSV}
                  disabled={!csvFile || isImporting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {isImporting ? "Importando..." : "Importar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </MainLayout>
  );
}
