import { useEffect, useState } from "react";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";

type TabType = "terminal" | "productos" | "categorias" | "areas" | "turnos" | "hardware" | "parametros";

interface TicketItem {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
}

interface Shift {
  id: string;
  fecha: string;
  horaApertura: string;
  fondoInicial: number;
  totalVentas: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  totalCortesia: number;
  totalDevoluciones: number;
  status: string;
}

interface Sale {
  id: string;
  folio: string;
  fecha: string;
  hora: string;
  items: TicketItem[];
  total: number;
  metodoPago: string;
  status: string;
}

interface PaymentMethod {
  id: string;
  tipo: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CORTESIA";
  monto: number;
  // Tarjeta
  tipoTarjeta?: "DEBITO" | "CREDITO";
  ultimos4Digitos?: string;
  folioVoucher?: string;
  // Transferencia
  claveRastreo?: string;
  bancoOrigen?: string;
  // Cortesía
  motivo?: string;
  autorizadoPor?: string;
}

export default function POSPage() {
  const [activeTab, setActiveTab] = useState<TabType>("terminal");
  const user = useAuthStore((state) => state.user);
  const isAdminOrSoporte = user?.roleCode === "ADMIN" || user?.roleCode === "SOPORTE";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [ticket, setTicket] = useState<TicketItem[]>([]);
  const [shift, setShift] = useState<Shift | null>(null);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [salesFilter, setSalesFilter] = useState<string>("all");
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [initialFund, setInitialFund] = useState<string>("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [discountPercent, setDiscountPercent] = useState<string>("");
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCourtesyModal, setShowCourtesyModal] = useState(false);
  const [courtesyReason, setCourtesyReason] = useState("");
  const [courtesyAuthorizedBy, setCourtesyAuthorizedBy] = useState("");
  const [cardValidationError, setCardValidationError] = useState("");
  
  // Productos tab state
  const [posProducts, setPosProducts] = useState<any[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    precio: "",
    categoria: "",
    imagenUrl: "",
    impuesto: "16",
    tipo: "SIMPLE",
    recipeId: "",
    insumoId: "",
    activo: true
  });

  // CSV Import state for POS products
  const [posProductImportModalOpen, setPosProductImportModalOpen] = useState(false);
  const [posCsvFile, setPosCsvFile] = useState<File | null>(null);
  const [posCsvPreview, setPosCsvPreview] = useState<any[]>([]);
  const [posCsvImportResult, setPosCsvImportResult] = useState<{ success: number; errors: any[] } | null>(null);
  const [isPosImporting, setIsPosImporting] = useState(false);

  // Categorías tab state
  const [posCategories, setPosCategories] = useState<any[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({
    nombre: "",
    color: "#3B82F6",
    descripcion: ""
  });

  // Áreas y Mesas tab state
  const [areas, setAreas] = useState<any[]>([]);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<any>(null);
  const [areaForm, setAreaForm] = useState({
    nombre: "",
    descripcion: ""
  });
  const [showMesaModal, setShowMesaModal] = useState(false);
  const [editingMesa, setEditingMesa] = useState<any>(null);
  const [mesaForm, setMesaForm] = useState({
    areaId: "",
    numero: "",
    capacidad: "",
    status: "DISPONIBLE"
  });
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  // Turnos tab state
  const [shiftConfigs, setShiftConfigs] = useState<any[]>([]);
  const [showShiftConfigModal, setShowShiftConfigModal] = useState(false);
  const [editingShiftConfig, setEditingShiftConfig] = useState<any>(null);
  const [shiftConfigForm, setShiftConfigForm] = useState({
    nombre: "",
    horaInicio: "",
    horaFin: "",
    diasActivos: ["L", "M", "X", "J", "V", "S", "D"]
  });

  // Hardware tab state
  const [hardwareConfig, setHardwareConfig] = useState({
    impresora: { ip: "", puerto: "9100", modelo: "" },
    terminal: { modelo: "", serie: "" },
    lector: { tipo: "USB" },
    cajon: { puerto: "" }
  });

  // Parámetros tab state
  const [posParams, setPosParams] = useState({
    nombreNegocio: "",
    rfc: "",
    mensajePie: "",
    ivaDefault: "16",
    propinaSugerida: { activo: false, tipo: "PORCENTAJE", valor: "10" },
    requerirTurno: true,
    imprimirAuto: true,
    copiasTicket: "1",
    moneda: "MXN"
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadOpenShift();
  }, []);

  async function loadProducts() {
    try {
      const response = await api.get("/pos/products");
      setProducts(Array.isArray(response.data) ? response.data.map((p: any) => ({
        ...p,
        price: Number(p.price) || 0
      })) : []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  }

  async function loadCategories() {
    try {
      const response = await api.get("/pos/categories");
      const cats = Array.isArray(response.data) ? response.data.map((c: any) => c.name) : [];
      setCategories(["all", ...cats]);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }

  async function loadOpenShift() {
    try {
      const response = await api.get("/pos/shifts/open", {
        params: {
          cajero: "current-user-id",
          sucursalId: "default-branch-id",
        },
      });
      setShift(response.data ? {
        ...response.data,
        totalVentas: Number(response.data.totalVentas) || 0,
        totalEfectivo: Number(response.data.totalEfectivo) || 0,
        totalTarjeta: Number(response.data.totalTarjeta) || 0,
        totalTransferencia: Number(response.data.totalTransferencia) || 0,
        totalCortesia: Number(response.data.totalCortesia) || 0,
        totalDevoluciones: Number(response.data.totalDevoluciones) || 0,
      } : null);
    } catch (error) {
      console.error("Error loading open shift:", error);
    }
  }

  async function loadSalesHistory() {
    try {
      const filters: any = {};
      if (salesFilter !== "all") {
        filters.status = salesFilter;
      }
      if (shift?.id) {
        filters.turnoId = shift.id;
      }
      const response = await api.get("/pos/sales", { params: filters });
      setSalesHistory(Array.isArray(response.data) ? response.data.map((s: any) => ({
        ...s,
        total: Number(s.total) || 0,
        subtotal: Number(s.subtotal) || 0,
        descuento: Number(s.descuento) || 0,
        impuestos: Number(s.impuestos) || 0,
        items: Array.isArray(s.items) ? s.items.map((item: any) => ({
          ...item,
          subtotal: Number(item.subtotal) || 0,
          precioUnitario: Number(item.precioUnitario) || 0,
          descuento: Number(item.descuento) || 0
        })) : []
      })) : []);
    } catch (error) {
      console.error("Error loading sales history:", error);
    }
  }

  async function openShift() {
    try {
      await api.post("/pos/shifts", {
        cajero: "current-user-id",
        sucursalId: "default-branch-id",
        fondoInicial: Number(initialFund) || 0,
      });
      setShowOpenShiftModal(false);
      loadOpenShift();
    } catch (error) {
      console.error("Error opening shift:", error);
      alert("Error al abrir turno");
    }
  }

  async function closeShift() {
    if (!shift) return;
    try {
      await api.put(`/pos/shifts/${shift.id}/close`, {
        totalVentas: shift.totalVentas,
        totalEfectivo: shift.totalEfectivo || 0,
        totalTarjeta: shift.totalTarjeta || 0,
        totalTransferencia: shift.totalTransferencia || 0,
        totalCortesia: shift.totalCortesia || 0,
        totalDevoluciones: shift.totalDevoluciones || 0,
      });
      setShift(null);
    } catch (error) {
      console.error("Error closing shift:", error);
      alert("Error al cerrar turno");
    }
  }

  function addToTicket(product: Product) {
    const existingItem = ticket.find((item) => item.productoId === product.id);
    if (existingItem) {
      updateQuantity(product.id, existingItem.cantidad + 1);
    } else {
      const price = Number(product.price) || 0;
      setTicket([
        ...ticket,
        {
          productoId: product.id,
          nombre: product.name,
          cantidad: 1,
          precioUnitario: price,
          descuento: 0,
          subtotal: price,
        },
      ]);
    }
  }

  function updateQuantity(productId: string, cantidad: number) {
    if (cantidad <= 0) {
      removeFromTicket(productId);
      return;
    }
    setTicket(
      ticket.map((item) =>
        item.productoId === productId
          ? { ...item, cantidad, subtotal: cantidad * Number(item.precioUnitario) * (1 - Number(item.descuento) / 100) }
          : item
      )
    );
  }

  function removeFromTicket(productId: string) {
    setTicket(ticket.filter((item) => item.productoId !== productId));
  }

  function updateItemDiscount(productId: string, descuento: number) {
    setTicket(
      ticket.map((item) =>
        item.productoId === productId
          ? { ...item, descuento, subtotal: item.cantidad * Number(item.precioUnitario) * (1 - descuento / 100) }
          : item
      )
    );
  }

  function getSubtotal() {
    return ticket.reduce((sum, item) => sum + item.cantidad * Number(item.precioUnitario), 0);
  }

  function getTotalDiscount() {
    return ticket.reduce((sum, item) => sum + (item.cantidad * Number(item.precioUnitario) * Number(item.descuento)) / 100, 0);
  }

  function getTaxes() {
    return getSubtotal() * 0.16;
  }

  function getTotal() {
    return getSubtotal() - getTotalDiscount() + getTaxes();
  }

  function getTotalCovered() {
    return paymentMethods.reduce((sum, pm) => sum + pm.monto, 0);
  }

  function getPending() {
    return getTotal() - getTotalCovered();
  }

  function getChange() {
    const cashPayment = paymentMethods.find(pm => pm.tipo === "EFECTIVO");
    if (!cashPayment) return 0;
    return cashPayment.monto - getTotal();
  }

  function addPaymentMethod(tipo: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CORTESIA") {
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      tipo,
      monto: tipo === "CORTESIA" ? getTotal() : getPending(),
    };
    setPaymentMethods([...paymentMethods, newMethod]);
  }

  function updatePaymentMethod(id: string, field: string, value: any) {
    setPaymentMethods(paymentMethods.map(pm => 
      pm.id === id ? { ...pm, [field]: value } : pm
    ));
  }

  function removePaymentMethod(id: string) {
    setPaymentMethods(paymentMethods.filter(pm => pm.id !== id));
  }

  function applyGlobalDiscount() {
    if (ticket.length > 0) {
      const discount = Number(discountPercent);
      setTicket(
        ticket.map((item) => ({
          ...item,
          descuento: discount,
          subtotal: item.cantidad * Number(item.precioUnitario) * (1 - discount / 100),
        }))
      );
      setShowDiscountModal(false);
      setDiscountPercent("");
    }
  }

  function applyCourtesy() {
    if (ticket.length > 0 && courtesyReason && courtesyAuthorizedBy) {
      setTicket(
        ticket.map((item) => ({
          ...item,
          descuento: 100,
          subtotal: 0,
        }))
      );
      setShowCourtesyModal(false);
      setCourtesyReason("");
      setCourtesyAuthorizedBy("");
    }
  }

  function validateCardPayments(): boolean {
    setCardValidationError("");
    const cardPayments = paymentMethods.filter(pm => pm.tipo === "TARJETA");
    for (const card of cardPayments) {
      if (!card.ultimos4Digitos && !card.folioVoucher) {
        setCardValidationError("Ingresa los últimos 4 dígitos o el folio del voucher");
        return false;
      }
    }
    return true;
  }

  async function processPayment() {
    if (ticket.length === 0) {
      alert("El ticket está vacío");
      return;
    }
    if (!shift) {
      alert("No hay turno abierto");
      return;
    }
    if (getTotalCovered() < getTotal()) {
      alert("El monto cubierto es insuficiente");
      return;
    }
    if (!validateCardPayments()) {
      return;
    }

    try {
      const saleData = {
        items: ticket,
        subtotal: getSubtotal(),
        descuento: getTotalDiscount(),
        impuestos: getTaxes(),
        total: getTotal(),
        metodosPago: paymentMethods,
        cajero: "current-user-id",
        turnoId: shift.id,
        sucursalId: "default-branch-id",
      };

      const response = await api.post("/pos/sales", saleData);
      const sale = response.data;

      setCurrentSale(sale);
      setShowReceipt(true);
      setShowPaymentModal(false);
      setTicket([]);
      setPaymentMethods([]);
      loadSalesHistory();
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Error al procesar pago");
    }
  }

  async function cancelSale(saleId: string) {
    const motivo = prompt("Motivo de cancelación:");
    if (!motivo) return;

    try {
      await api.put(`/pos/sales/${saleId}/cancel`, { motivo });
      loadSalesHistory();
    } catch (error) {
      console.error("Error canceling sale:", error);
      alert("Error al cancelar venta");
    }
  }

  // CSV Import functions for POS
  function parsePOSCSV(text: string): string[] {
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

  function downloadPOSCSVTemplate() {
    const content = "nombre,categoria,precio,impuesto,descripcion\n";
    const content2 = "Hamburguesa Clásica,Comida,85.00,16,Hamburguesa con carne de res\n";
    const content3 = "Refresco Cola,Bebidas,25.00,16,Refresco de cola 355ml\n";
    const fullContent = content + content2 + content3;
    
    const blob = new Blob([fullContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "plantilla_productos_pos.csv";
    link.click();
  }

  function handlePosFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setPosCsvFile(file);
    setPosCsvImportResult(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = parsePOSCSV(text);
      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((h, i) => obj[h] = values[i] || "");
        return obj;
      });
      setPosCsvPreview(data.slice(0, 5));
    };
    reader.readAsText(file);
  }

  async function importPosProductsFromCSV() {
    if (!posCsvFile) return;
    
    try {
      setIsPosImporting(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = parsePOSCSV(text);
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((h, i) => obj[h] = values[i] || "");
          return obj;
        });
        
        const response = await api.post("/pos/products/import", { productos: data });
        setPosCsvImportResult(response.data);
        loadProducts();
      };
      reader.readAsText(posCsvFile);
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al importar productos");
    } finally {
      setIsPosImporting(false);
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* HEADER - Tabs */}
      <div className="h-16 border-b border-slate-800 flex items-center px-4 bg-slate-900">
        <h1 className="text-xl font-bold mr-8">POS</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("terminal")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "terminal"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            Terminal
          </button>
          {isAdminOrSoporte && (
            <>
              <button
                onClick={() => setActiveTab("productos")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "productos"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Productos
              </button>
              <button
                onClick={() => setActiveTab("categorias")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "categorias"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Categorías
              </button>
              <button
                onClick={() => setActiveTab("areas")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "areas"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Áreas y Mesas
              </button>
              <button
                onClick={() => setActiveTab("turnos")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "turnos"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Turnos
              </button>
              <button
                onClick={() => setActiveTab("hardware")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "hardware"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Hardware
              </button>
              <button
                onClick={() => setActiveTab("parametros")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "parametros"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Parámetros
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === "terminal" && (
        <div className="h-[calc(100vh-64px)] flex flex-col">
          {/* TERMINAL HEADER */}
          <header className="h-16 border-b border-slate-700 flex items-center justify-between px-4 bg-slate-800">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-400">
                Cajero: <span className="text-white">Usuario Demo</span>
              </div>
              {shift && (
                <div className="text-sm text-slate-400">
                  Turno: <span className="text-green-400">Abierto</span> ({shift.horaApertura})
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!shift ? (
                <button
                  onClick={() => setShowOpenShiftModal(true)}
                  className="px-4 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                >
                  Abrir Turno
                </button>
              ) : (
                <button
                  onClick={closeShift}
                  className="px-4 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700"
                >
                  Cerrar Turno
                </button>
              )}
              <button
                onClick={() => {
                  loadSalesHistory();
                  setShowSalesHistory(true);
                }}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Historial de Ventas
              </button>
            </div>
          </header>

          {/* MAIN CONTENT - 2 ZONES */}
          <div className="flex-1 flex overflow-hidden">
            {/* ZONA IZQUIERDA - PRODUCTOS (75%) */}
            <div className="w-[75%] flex flex-col border-r border-slate-700">
              <div className="p-4 border-b border-slate-700 space-y-3">
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-white"
                />
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                        selectedCategory === category
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      {category === "all" ? "Todos" : category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToTicket(product)}
                      className="max-w-[120px] max-h-[120px] p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors flex flex-col"
                    >
                      <div className="w-full aspect-square bg-slate-700 rounded mb-2 flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl">🛒</span>
                        )}
                      </div>
                      <p className="font-medium text-xs line-clamp-2 h-8 overflow-hidden">{product.name}</p>
                      <p className="text-green-400 font-bold text-sm">${product.price.toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ZONA DERECHA - TICKET + COBRO (25%) */}
            <div className="w-[25%] flex flex-col">
              {/* TICKET */}
              <div className="flex-1 flex flex-col border-b border-slate-700">
                <div className="p-4 border-b border-slate-700">
                  <h2 className="text-lg font-semibold">Ticket Actual</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {ticket.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Ticket vacío</p>
                  ) : (
                    ticket.map((item) => (
                      <div key={item.productoId} className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium text-sm flex-1">{item.nombre}</p>
                          <button
                            onClick={() => removeFromTicket(item.productoId)}
                            className="text-red-400 hover:text-red-300 text-xs ml-2"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.productoId, item.cantidad - 1)}
                              className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-sm"
                            >
                              -
                            </button>
                            <span className="w-8 text-center">{item.cantidad}</span>
                            <button
                              onClick={() => updateQuantity(item.productoId, item.cantidad + 1)}
                              className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-sm"
                            >
                              +
                            </button>
                          </div>
                          <p className="font-semibold">${item.subtotal.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-400">Descuento %:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.descuento}
                            onChange={(e) => updateItemDiscount(item.productoId, Number(e.target.value))}
                            className="w-16 px-2 py-1 rounded bg-slate-700 text-xs text-white"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-slate-700 space-y-2 bg-slate-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal</span>
                    <span>${getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Descuento</span>
                    <span className="text-red-400">-${getTotalDiscount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Impuestos (16%)</span>
                    <span>${getTaxes().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-slate-700">
                    <span>TOTAL</span>
                    <span className="text-green-400">${getTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* COBRO */}
              <div className="p-4 space-y-3 bg-slate-900">
                <div className="text-center py-2">
                  <p className="text-slate-400 text-sm mb-1">Total a Cobrar</p>
                  <p className="text-4xl font-bold text-green-400">${getTotal().toFixed(2)}</p>
                </div>

                <button
                  onClick={() => setShowDiscountModal(true)}
                  disabled={!ticket || ticket.length === 0}
                  className="w-full py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500"
                >
                  Aplicar Descuento
                </button>

                <button
                  onClick={() => setShowCourtesyModal(true)}
                  disabled={!ticket || ticket.length === 0}
                  className="w-full py-2 rounded-lg bg-yellow-600 text-white font-medium hover:bg-yellow-700 disabled:bg-slate-800 disabled:text-slate-500"
                >
                  Cortesía
                </button>

                <button
                  onClick={() => {
                    if (ticket.length > 0 && shift) {
                      setShowPaymentModal(true);
                      setPaymentMethods([]);
                      setCardValidationError("");
                    }
                  }}
                  disabled={!ticket || ticket.length === 0}
                  className="w-full py-4 rounded-lg bg-green-600 text-white font-bold text-xl hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500"
                >
                  COBRAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURATION TABS */}
      {activeTab === "productos" && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Productos</h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({
                    codigo: "",
                    nombre: "",
                    descripcion: "",
                    precio: "",
                    categoria: "",
                    imagenUrl: "",
                    impuesto: "16",
                    tipo: "SIMPLE",
                    recipeId: "",
                    insumoId: "",
                    activo: true
                  });
                  setShowProductModal(true);
                }}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                + Nuevo Producto
              </button>
              <button
                onClick={() => setPosProductImportModalOpen(true)}
                className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
              >
                Importar Insumos
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm">Código</th>
                  <th className="px-4 py-3 text-left text-sm">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm">Categoría</th>
                  <th className="px-4 py-3 text-right text-sm">Precio</th>
                  <th className="px-4 py-3 text-center text-sm">Status</th>
                  <th className="px-4 py-3 text-center text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {posProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No hay productos registrados
                    </td>
                  </tr>
                ) : (
                  posProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3 text-sm">{product.codigo || "-"}</td>
                      <td className="px-4 py-3 text-sm font-medium">{product.nombre}</td>
                      <td className="px-4 py-3 text-sm">{product.categoria || "-"}</td>
                      <td className="px-4 py-3 text-sm text-right">${Number(product.precio).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          product.activo ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                        }`}>
                          {product.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setProductForm({
                              codigo: product.codigo || "",
                              nombre: product.nombre,
                              descripcion: product.descripcion || "",
                              precio: product.precio,
                              categoria: product.categoria || "",
                              imagenUrl: product.imagenUrl || "",
                              impuesto: product.impuesto || "16",
                              tipo: product.tipo || "SIMPLE",
                              recipeId: product.recipeId || "",
                              insumoId: product.insumoId || "",
                              activo: product.activo
                            });
                            setShowProductModal(true);
                          }}
                          className="px-2 py-1 rounded bg-blue-600 text-xs hover:bg-blue-700 mr-1"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("¿Eliminar este producto?")) {
                              setPosProducts(posProducts.filter(p => p.id !== product.id));
                            }
                          }}
                          className="px-2 py-1 rounded bg-red-600 text-xs hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "categorias" && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Categorías</h2>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ nombre: "", color: "#3B82F6", descripcion: "" });
                setShowCategoryModal(true);
              }}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              + Nueva Categoría
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {posCategories.length === 0 ? (
              <div className="col-span-3 p-8 text-center text-slate-400 rounded-xl bg-slate-900 border border-slate-800">
                No hay categorías registradas
              </div>
            ) : (
              posCategories.map((cat) => (
                <div key={cat.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }}></div>
                      <h3 className="font-semibold">{cat.nombre}</h3>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryForm({
                            nombre: cat.nombre,
                            color: cat.color,
                            descripcion: cat.descripcion || ""
                          });
                          setShowCategoryModal(true);
                        }}
                        className="px-2 py-1 rounded bg-blue-600 text-xs hover:bg-blue-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("¿Eliminar esta categoría?")) {
                            setPosCategories(posCategories.filter(c => c.id !== cat.id));
                          }
                        }}
                        className="px-2 py-1 rounded bg-red-600 text-xs hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">{cat.descripcion || "Sin descripción"}</p>
                  <p className="text-xs text-slate-500 mt-2">{cat.productCount || 0} productos</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "areas" && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Áreas y Mesas</h2>
            <button
              onClick={() => {
                setEditingArea(null);
                setAreaForm({ nombre: "", descripcion: "" });
                setShowAreaModal(true);
              }}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              + Nueva Área
            </button>
          </div>
          <div className="space-y-4">
            {areas.length === 0 ? (
              <div className="p-8 text-center text-slate-400 rounded-xl bg-slate-900 border border-slate-800">
                No hay áreas registradas
              </div>
            ) : (
              areas.map((area) => (
                <div key={area.id} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50" onClick={() => setExpandedArea(expandedArea === area.id ? null : area.id)}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{expandedArea === area.id ? "▼" : "▶"}</span>
                      <div>
                        <h3 className="font-semibold">{area.nombre}</h3>
                        <p className="text-sm text-slate-400">{area.descripcion || "Sin descripción"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">{area.mesas?.length || 0} mesas</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingArea(area);
                          setAreaForm({ nombre: area.nombre, descripcion: area.descripcion || "" });
                          setShowAreaModal(true);
                        }}
                        className="px-2 py-1 rounded bg-blue-600 text-xs hover:bg-blue-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("¿Eliminar esta área?")) {
                            setAreas(areas.filter(a => a.id !== area.id));
                          }
                        }}
                        className="px-2 py-1 rounded bg-red-600 text-xs hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {expandedArea === area.id && (
                    <div className="p-4 border-t border-slate-800 bg-slate-800/50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Mesas</h4>
                        <button
                          onClick={() => {
                            setEditingMesa(null);
                            setMesaForm({ areaId: area.id, numero: "", capacidad: "", status: "DISPONIBLE" });
                            setShowMesaModal(true);
                          }}
                          className="px-3 py-1 rounded bg-green-600 text-xs hover:bg-green-700"
                        >
                          + Nueva Mesa
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {area.mesas?.length === 0 ? (
                          <p className="col-span-4 text-sm text-slate-400">No hay mesas en esta área</p>
                        ) : (
                          area.mesas.map((mesa: any) => (
                            <div key={mesa.id} className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold">Mesa {mesa.numero}</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  mesa.status === "DISPONIBLE" ? "bg-green-900/40 text-green-300" :
                                  mesa.status === "OCUPADA" ? "bg-red-900/40 text-red-300" :
                                  "bg-yellow-900/40 text-yellow-300"
                                }`}>
                                  {mesa.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">Capacidad: {mesa.capacidad}</p>
                              <button
                                onClick={() => {
                                  if (confirm("¿Eliminar esta mesa?")) {
                                    setAreas(areas.map(a => 
                                      a.id === area.id 
                                        ? { ...a, mesas: a.mesas.filter((m: any) => m.id !== mesa.id) }
                                        : a
                                    ));
                                  }
                                }}
                                className="mt-2 text-xs text-red-400 hover:text-red-300"
                              >
                                Eliminar
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "turnos" && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Turnos</h2>
            <button
              onClick={() => {
                setEditingShiftConfig(null);
                setShiftConfigForm({
                  nombre: "",
                  horaInicio: "",
                  horaFin: "",
                  diasActivos: ["L", "M", "X", "J", "V", "S", "D"]
                });
                setShowShiftConfigModal(true);
              }}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              + Nuevo Turno
            </button>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Configuración de Turnos</h3>
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm">Nombre</th>
                    <th className="px-4 py-3 text-left text-sm">Hora Inicio</th>
                    <th className="px-4 py-3 text-left text-sm">Hora Fin</th>
                    <th className="px-4 py-3 text-left text-sm">Días Activos</th>
                    <th className="px-4 py-3 text-center text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {shiftConfigs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No hay turnos configurados
                      </td>
                    </tr>
                  ) : (
                    shiftConfigs.map((config) => (
                      <tr key={config.id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-sm font-medium">{config.nombre}</td>
                        <td className="px-4 py-3 text-sm">{config.horaInicio}</td>
                        <td className="px-4 py-3 text-sm">{config.horaFin}</td>
                        <td className="px-4 py-3 text-sm">{config.diasActivos?.join(", ") || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setEditingShiftConfig(config);
                              setShiftConfigForm({
                                nombre: config.nombre,
                                horaInicio: config.horaInicio,
                                horaFin: config.horaFin,
                                diasActivos: config.diasActivos || []
                              });
                              setShowShiftConfigModal(true);
                            }}
                            className="px-2 py-1 rounded bg-blue-600 text-xs hover:bg-blue-700 mr-1"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("¿Eliminar este turno?")) {
                                setShiftConfigs(shiftConfigs.filter(c => c.id !== config.id));
                              }
                            }}
                            className="px-2 py-1 rounded bg-red-600 text-xs hover:bg-red-700"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Historial de Turnos</h3>
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm">Fecha</th>
                    <th className="px-4 py-3 text-left text-sm">Cajero</th>
                    <th className="px-4 py-3 text-right text-sm">Ventas</th>
                    <th className="px-4 py-3 text-right text-sm">Total Cobrado</th>
                    <th className="px-4 py-3 text-center text-sm">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {salesHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No hay historial de turnos
                      </td>
                    </tr>
                  ) : (
                    salesHistory.slice(0, 10).map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-sm">{sale.fecha}</td>
                        <td className="px-4 py-3 text-sm">Usuario Demo</td>
                        <td className="px-4 py-3 text-sm text-right">{sale.items?.length || 0}</td>
                        <td className="px-4 py-3 text-sm text-right">${Number(sale.total).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            sale.status === "PAGADA" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                          }`}>
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "hardware" && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Hardware</h2>
          <div className="space-y-6">
            {/* Impresora Térmica */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-lg font-semibold mb-3">Impresora Térmica</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">IP</label>
                  <input
                    type="text"
                    value={hardwareConfig.impresora.ip}
                    onChange={(e) => setHardwareConfig({
                      ...hardwareConfig,
                      impresora: { ...hardwareConfig.impresora, ip: e.target.value }
                    })}
                    placeholder="192.168.1.100"
                    className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Puerto</label>
                  <input
                    type="text"
                    value={hardwareConfig.impresora.puerto}
                    onChange={(e) => setHardwareConfig({
                      ...hardwareConfig,
                      impresora: { ...hardwareConfig.impresora, puerto: e.target.value }
                    })}
                    placeholder="9100"
                    className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Modelo</label>
                  <input
                    type="text"
                    value={hardwareConfig.impresora.modelo}
                    onChange={(e) => setHardwareConfig({
                      ...hardwareConfig,
                      impresora: { ...hardwareConfig.impresora, modelo: e.target.value }
                    })}
                    placeholder="Ej: EPSON TM-T20"
                    className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                  />
                </div>
              </div>
              <button
                onClick={() => alert("Probando conexión con impresora...")}
                className="mt-3 px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Probar Conexión
              </button>
            </div>

            {/* Terminal Bancaria */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-lg font-semibold mb-3">Terminal Bancaria</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Modelo</label>
                  <input
                    type="text"
                    value={hardwareConfig.terminal.modelo}
                    onChange={(e) => setHardwareConfig({
                      ...hardwareConfig,
                      terminal: { ...hardwareConfig.terminal, modelo: e.target.value }
                    })}
                    placeholder="Ej: Verifone VX520"
                    className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Número de Serie</label>
                  <input
                    type="text"
                    value={hardwareConfig.terminal.serie}
                    onChange={(e) => setHardwareConfig({
                      ...hardwareConfig,
                      terminal: { ...hardwareConfig.terminal, serie: e.target.value }
                    })}
                    placeholder="Serie del equipo"
                    className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                  />
                </div>
              </div>
              <button
                onClick={() => alert("Probando conexión con terminal...")}
                className="mt-3 px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Probar Conexión
              </button>
            </div>

            {/* Lector Código de Barras */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-lg font-semibold mb-3">Lector Código de Barras</h3>
              <div className="w-1/2">
                <label className="block text-sm text-slate-400 mb-1">Tipo</label>
                <select
                  value={hardwareConfig.lector.tipo}
                  onChange={(e) => setHardwareConfig({
                    ...hardwareConfig,
                    lector: { ...hardwareConfig.lector, tipo: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                >
                  <option value="USB">USB</option>
                  <option value="BLUETOOTH">Bluetooth</option>
                </select>
              </div>
              <button
                onClick={() => alert("Probando conexión con lector...")}
                className="mt-3 px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Probar Conexión
              </button>
            </div>

            {/* Cajón de Dinero */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-lg font-semibold mb-3">Cajón de Dinero</h3>
              <div className="w-1/2">
                <label className="block text-sm text-slate-400 mb-1">Puerto</label>
                <input
                  type="text"
                  value={hardwareConfig.cajon.puerto}
                  onChange={(e) => setHardwareConfig({
                    ...hardwareConfig,
                    cajon: { ...hardwareConfig.cajon, puerto: e.target.value }
                  })}
                  placeholder="COM1, USB, etc."
                  className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                />
              </div>
              <button
                onClick={() => alert("Probando conexión con cajón...")}
                className="mt-3 px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Probar Conexión
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "parametros" && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Parámetros</h2>
          <div className="max-w-2xl space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-lg font-semibold mb-3">Información del Negocio</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nombre del Negocio</label>
                  <input
                    type="text"
                    value={posParams.nombreNegocio}
                    onChange={(e) => setPosParams({ ...posParams, nombreNegocio: e.target.value })}
                    placeholder="Mi Negocio"
                    className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">RFC</label>
                  <input
                    type="text"
                    value={posParams.rfc}
                    onChange={(e) => setPosParams({ ...posParams, rfc: e.target.value })}
                    placeholder="RFC del negocio"
                    className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Mensaje Pie de Ticket</label>
                  <input
                    type="text"
                    value={posParams.mensajePie}
                    onChange={(e) => setPosParams({ ...posParams, mensajePie: e.target.value })}
                    placeholder="¡Gracias por su compra!"
                    className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-lg font-semibold mb-3">Impuestos</h3>
              <div>
                <label className="block text-sm text-slate-400 mb-1">IVA por Defecto</label>
                <select
                  value={posParams.ivaDefault}
                  onChange={(e) => setPosParams({ ...posParams, ivaDefault: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                >
                  <option value="0">0%</option>
                  <option value="8">8%</option>
                  <option value="16">16%</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-lg font-semibold mb-3">Propina Sugerida</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={posParams.propinaSugerida.activo}
                    onChange={(e) => setPosParams({
                      ...posParams,
                      propinaSugerida: { ...posParams.propinaSugerida, activo: e.target.checked }
                    })}
                    className="rounded"
                  />
                  <label className="text-sm text-slate-400">Activar propina sugerida</label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Tipo</label>
                    <select
                      value={posParams.propinaSugerida.tipo}
                      onChange={(e) => setPosParams({
                        ...posParams,
                        propinaSugerida: { ...posParams.propinaSugerida, tipo: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                    >
                      <option value="PORCENTAJE">Porcentaje</option>
                      <option value="MONTO">Monto Fijo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Valor</label>
                    <input
                      type="text"
                      value={posParams.propinaSugerida.valor}
                      onChange={(e) => setPosParams({
                        ...posParams,
                        propinaSugerida: { ...posParams.propinaSugerida, valor: e.target.value }
                      })}
                      placeholder="10"
                      className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-lg font-semibold mb-3">Operación</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-400">Requerir apertura de turno para vender</label>
                  <input
                    type="checkbox"
                    checked={posParams.requerirTurno}
                    onChange={(e) => setPosParams({ ...posParams, requerirTurno: e.target.checked })}
                    className="rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-400">Imprimir ticket automáticamente al cobrar</label>
                  <input
                    type="checkbox"
                    checked={posParams.imprimirAuto}
                    onChange={(e) => setPosParams({ ...posParams, imprimirAuto: e.target.checked })}
                    className="rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Número de copias del ticket</label>
                  <input
                    type="number"
                    min="1"
                    value={posParams.copiasTicket}
                    onChange={(e) => setPosParams({ ...posParams, copiasTicket: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Moneda</label>
                  <select
                    value={posParams.moneda}
                    onChange={(e) => setPosParams({ ...posParams, moneda: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                  >
                    <option value="MXN">MXN - Peso Mexicano</option>
                    <option value="USD">USD - Dólar Americano</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={() => alert("Parámetros guardados")}
              className="w-full py-3 rounded bg-green-600 text-white font-medium hover:bg-green-700"
            >
              Guardar Parámetros
            </button>
          </div>
        </div>
      )}

      {/* MODAL ABRIR TURNO */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Abrir Turno</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Fondo Inicial</label>
                <input
                  type="number"
                  value={initialFund}
                  onChange={(e) => setInitialFund(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOpenShiftModal(false)}
                  className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={openShift}
                  className="flex-1 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                >
                  Abrir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL DE VENTAS */}
      {showSalesHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Historial de Ventas</h3>
              <button
                onClick={() => setShowSalesHistory(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSalesFilter("all")}
                className={`px-3 py-1 rounded text-sm ${
                  salesFilter === "all" ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setSalesFilter("PAGADA")}
                className={`px-3 py-1 rounded text-sm ${
                  salesFilter === "PAGADA" ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                Pagadas
              </button>
              <button
                onClick={() => setSalesFilter("CANCELADA")}
                className={`px-3 py-1 rounded text-sm ${
                  salesFilter === "CANCELADA" ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                Canceladas
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm">Folio</th>
                    <th className="px-4 py-2 text-left text-sm">Fecha</th>
                    <th className="px-4 py-2 text-right text-sm">Total</th>
                    <th className="px-4 py-2 text-center text-sm">Estado</th>
                    <th className="px-4 py-2 text-center text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {salesHistory.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-700/50">
                      <td className="px-4 py-2 text-sm">{sale.folio}</td>
                      <td className="px-4 py-2 text-sm">{sale.fecha}</td>
                      <td className="px-4 py-2 text-right text-sm font-semibold">
                        ${Number(sale.total).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            sale.status === "PAGADA"
                              ? "bg-green-900/40 text-green-300"
                              : "bg-red-900/40 text-red-300"
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {sale.status === "PAGADA" && (
                          <button
                            onClick={() => cancelSale(sale.id)}
                            className="px-2 py-1 rounded bg-red-600 text-xs hover:bg-red-700"
                          >
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DESCUENTO */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Aplicar Descuento Global</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Porcentaje de descuento</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={applyGlobalDiscount}
                  className="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CORTESÍA */}
      {showCourtesyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Cortesía</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Motivo (obligatorio)</label>
                <input
                  type="text"
                  value={courtesyReason}
                  onChange={(e) => setCourtesyReason(e.target.value)}
                  placeholder="Motivo de la cortesía"
                  className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Autorizado por</label>
                <select
                  value={courtesyAuthorizedBy}
                  onChange={(e) => setCourtesyAuthorizedBy(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
                >
                  <option value="">Seleccionar</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="SOPORTE">Soporte</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCourtesyModal(false)}
                  className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={applyCourtesy}
                  disabled={!courtesyReason || !courtesyAuthorizedBy}
                  className="flex-1 py-2 rounded bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-slate-700 disabled:text-slate-500"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COBRO */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold">Modal de Cobro</h3>
                <p className="text-slate-400">Total a pagar: ${getTotal().toFixed(2)}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Botones para agregar métodos de pago */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => addPaymentMethod("EFECTIVO")}
                  className="p-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-center"
                >
                  <div className="text-2xl mb-1">💵</div>
                  <p className="text-sm">+ Efectivo</p>
                </button>
                <button
                  onClick={() => addPaymentMethod("TARJETA")}
                  className="p-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-center"
                >
                  <div className="text-2xl mb-1">💳</div>
                  <p className="text-sm">+ Tarjeta</p>
                </button>
                <button
                  onClick={() => addPaymentMethod("TRANSFERENCIA")}
                  className="p-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-center"
                >
                  <div className="text-2xl mb-1">📱</div>
                  <p className="text-sm">+ Transferencia</p>
                </button>
                <button
                  onClick={() => addPaymentMethod("CORTESIA")}
                  className="p-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-center"
                >
                  <div className="text-2xl mb-1">🎁</div>
                  <p className="text-sm">+ Cortesía</p>
                </button>
              </div>

              {/* Lista de métodos de pago */}
              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className="p-4 rounded-lg bg-slate-900 border border-slate-700">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {pm.tipo === "EFECTIVO" ? "💵" : 
                           pm.tipo === "TARJETA" ? "💳" : 
                           pm.tipo === "TRANSFERENCIA" ? "📱" : "🎁"}
                        </span>
                        <span className="font-medium">{pm.tipo}</span>
                      </div>
                      <button
                        onClick={() => removePaymentMethod(pm.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-400">Monto</label>
                        <input
                          type="number"
                          step="0.01"
                          value={pm.monto}
                          onChange={(e) => updatePaymentMethod(pm.id, "monto", Number(e.target.value))}
                          className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                        />
                      </div>

                      {pm.tipo === "EFECTIVO" && (
                        <div className="text-sm text-green-400">
                          Cambio: ${(pm.monto - getTotal()).toFixed(2)}
                        </div>
                      )}

                      {pm.tipo === "TARJETA" && (
                        <>
                          <div>
                            <label className="text-xs text-slate-400">Tipo</label>
                            <select
                              value={pm.tipoTarjeta || "DEBITO"}
                              onChange={(e) => updatePaymentMethod(pm.id, "tipoTarjeta", e.target.value)}
                              className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                            >
                              <option value="DEBITO">Débito</option>
                              <option value="CREDITO">Crédito</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Últimos 4 dígitos</label>
                            <input
                              type="text"
                              maxLength={4}
                              value={pm.ultimos4Digitos || ""}
                              onChange={(e) => updatePaymentMethod(pm.id, "ultimos4Digitos", e.target.value)}
                              placeholder="****"
                              className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Folio voucher</label>
                            <input
                              type="text"
                              value={pm.folioVoucher || ""}
                              onChange={(e) => updatePaymentMethod(pm.id, "folioVoucher", e.target.value)}
                              placeholder="Folio"
                              className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                            />
                          </div>
                        </>
                      )}

                      {pm.tipo === "TRANSFERENCIA" && (
                        <>
                          <div>
                            <label className="text-xs text-slate-400">Clave de rastreo SPEI</label>
                            <input
                              type="text"
                              value={pm.claveRastreo || ""}
                              onChange={(e) => updatePaymentMethod(pm.id, "claveRastreo", e.target.value)}
                              placeholder="Clave de rastreo"
                              className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Banco origen</label>
                            <input
                              type="text"
                              value={pm.bancoOrigen || ""}
                              onChange={(e) => updatePaymentMethod(pm.id, "bancoOrigen", e.target.value)}
                              placeholder="Banco"
                              className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                            />
                          </div>
                          <button
                            onClick={() => window.open("https://www.banxico.org.mx/cep/", "_blank")}
                            className="w-full py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                          >
                            Verificar BANXICO
                          </button>
                        </>
                      )}

                      {pm.tipo === "CORTESIA" && (
                        <>
                          <div>
                            <label className="text-xs text-slate-400">Motivo (obligatorio)</label>
                            <input
                              type="text"
                              value={pm.motivo || ""}
                              onChange={(e) => updatePaymentMethod(pm.id, "motivo", e.target.value)}
                              placeholder="Motivo"
                              className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Autorizado por</label>
                            <select
                              value={pm.autorizadoPor || ""}
                              onChange={(e) => updatePaymentMethod(pm.id, "autorizadoPor", e.target.value)}
                              className="w-full px-3 py-2 rounded bg-slate-800 text-white"
                            >
                              <option value="">Seleccionar</option>
                              <option value="ADMIN">Administrador</option>
                              <option value="SOPORTE">Soporte</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {cardValidationError && (
                <div className="text-red-400 text-sm">{cardValidationError}</div>
              )}
            </div>

            {/* Resumen */}
            <div className="border-t border-slate-700 pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total a pagar</span>
                <span>${getTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total cubierto</span>
                <span>${getTotalCovered().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Pendiente</span>
                <span className={getPending() > 0 ? "text-red-400" : "text-green-400"}>
                  ${getPending().toFixed(2)}
                </span>
              </div>
              {getChange() > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Cambio</span>
                  <span className="text-green-400">${getChange().toFixed(2)}</span>
                </div>
              )}
            </div>

            <button
              onClick={processPayment}
              disabled={getTotalCovered() < getTotal()}
              className="w-full py-4 rounded-lg bg-green-600 text-white font-bold text-xl hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 mt-4"
            >
              CONFIRMAR COBRO
            </button>
          </div>
        </div>
      )}

      {/* MODAL TICKET DE VENTA */}
      {showReceipt && currentSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-black rounded-xl p-6 w-96">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold">Ticket de Venta</h3>
              <p className="text-sm text-slate-600">{currentSale.folio}</p>
            </div>
            <div className="space-y-2 mb-4">
              {currentSale.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.nombre} x{item.cantidad}</span>
                  <span>${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold">
                  <span>TOTAL</span>
                  <span>${Number(currentSale.total).toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t pt-2 mt-2">
                <p className="text-sm font-semibold mb-2">Métodos de Pago:</p>
                {Array.isArray(currentSale.metodoPago) ? currentSale.metodoPago.map((pm: any, idx: number) => (
                  <div key={idx} className="text-xs flex justify-between">
                    <span>{pm.tipo}</span>
                    <span>${pm.monto.toFixed(2)}</span>
                  </div>
                )) : (
                  <div className="text-xs flex justify-between">
                    <span>{currentSale.metodoPago}</span>
                    <span>${Number(currentSale.total).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 py-2 rounded bg-slate-200 text-black hover:bg-slate-300"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowReceipt(false);
                }}
                className="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUCTO */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-[500px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editingProduct ? "Editar Producto" : "Nuevo Producto"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Código</label>
                <input
                  type="text"
                  value={productForm.codigo}
                  onChange={(e) => setProductForm({ ...productForm, codigo: e.target.value })}
                  placeholder="Código del producto"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={productForm.nombre}
                  onChange={(e) => setProductForm({ ...productForm, nombre: e.target.value })}
                  placeholder="Nombre del producto"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Descripción</label>
                <textarea
                  value={productForm.descripcion}
                  onChange={(e) => setProductForm({ ...productForm, descripcion: e.target.value })}
                  placeholder="Descripción del producto"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Precio *</label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.precio}
                  onChange={(e) => setProductForm({ ...productForm, precio: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Categoría</label>
                <input
                  type="text"
                  value={productForm.categoria}
                  onChange={(e) => setProductForm({ ...productForm, categoria: e.target.value })}
                  placeholder="Categoría"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">URL Imagen</label>
                <input
                  type="text"
                  value={productForm.imagenUrl}
                  onChange={(e) => setProductForm({ ...productForm, imagenUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
                {productForm.imagenUrl && (
                  <div className="mt-2 w-24 h-24 rounded bg-slate-700 overflow-hidden">
                    <img 
                      src={productForm.imagenUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Tipo</label>
                <select
                  value={productForm.tipo}
                  onChange={(e) => setProductForm({ ...productForm, tipo: e.target.value, recipeId: "", insumoId: "" })}
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                >
                  <option value="SIMPLE">Simple (retail)</option>
                  <option value="PREPARADO">Preparado (receta)</option>
                </select>
              </div>
              {productForm.tipo === "PREPARADO" && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Receta</label>
                  <select
                    value={productForm.recipeId}
                    onChange={(e) => setProductForm({ ...productForm, recipeId: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                  >
                    <option value="">Seleccionar receta</option>
                    <option value="receta-1">Hamburguesa clásica</option>
                    <option value="receta-2">Hot Dog</option>
                    <option value="receta-3">Pizza personal</option>
                  </select>
                </div>
              )}
              {productForm.tipo === "SIMPLE" && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Insumo</label>
                  <select
                    value={productForm.insumoId}
                    onChange={(e) => setProductForm({ ...productForm, insumoId: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                  >
                    <option value="">Seleccionar insumo</option>
                    <option value="insumo-1">Refresco lata</option>
                    <option value="insumo-2">Agua embotellada</option>
                    <option value="insumo-3">Cerveza</option>
                    <option value="insumo-4">Jugo natural</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Impuesto (%)</label>
                <select
                  value={productForm.impuesto}
                  onChange={(e) => setProductForm({ ...productForm, impuesto: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                >
                  <option value="0">0%</option>
                  <option value="8">8%</option>
                  <option value="16">16%</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={productForm.activo}
                  onChange={(e) => setProductForm({ ...productForm, activo: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm text-slate-400">Activo</label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (editingProduct) {
                      setPosProducts(posProducts.map(p => p.id === editingProduct.id ? { ...editingProduct, ...productForm } : p));
                    } else {
                      setPosProducts([...posProducts, { id: Date.now().toString(), ...productForm }]);
                    }
                    setShowProductModal(false);
                  }}
                  className="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATEGORÍA */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={categoryForm.nombre}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nombre: e.target.value })}
                  placeholder="Nombre de la categoría"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Color</label>
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  className="w-full h-10 rounded bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Descripción</label>
                <textarea
                  value={categoryForm.descripcion}
                  onChange={(e) => setCategoryForm({ ...categoryForm, descripcion: e.target.value })}
                  placeholder="Descripción"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (editingCategory) {
                      setPosCategories(posCategories.map(c => c.id === editingCategory.id ? { ...editingCategory, ...categoryForm } : c));
                    } else {
                      setPosCategories([...posCategories, { id: Date.now().toString(), ...categoryForm, productCount: 0 }]);
                    }
                    setShowCategoryModal(false);
                  }}
                  className="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ÁREA */}
      {showAreaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">{editingArea ? "Editar Área" : "Nueva Área"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={areaForm.nombre}
                  onChange={(e) => setAreaForm({ ...areaForm, nombre: e.target.value })}
                  placeholder="Nombre del área"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Descripción</label>
                <textarea
                  value={areaForm.descripcion}
                  onChange={(e) => setAreaForm({ ...areaForm, descripcion: e.target.value })}
                  placeholder="Descripción"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAreaModal(false)}
                  className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (editingArea) {
                      setAreas(areas.map(a => a.id === editingArea.id ? { ...editingArea, ...areaForm } : a));
                    } else {
                      setAreas([...areas, { id: Date.now().toString(), ...areaForm, mesas: [] }]);
                    }
                    setShowAreaModal(false);
                  }}
                  className="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MESA */}
      {showMesaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">{editingMesa ? "Editar Mesa" : "Nueva Mesa"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Número *</label>
                <input
                  type="text"
                  value={mesaForm.numero}
                  onChange={(e) => setMesaForm({ ...mesaForm, numero: e.target.value })}
                  placeholder="Número de mesa"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Capacidad *</label>
                <input
                  type="number"
                  value={mesaForm.capacidad}
                  onChange={(e) => setMesaForm({ ...mesaForm, capacidad: e.target.value })}
                  placeholder="Capacidad de personas"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Status</label>
                <select
                  value={mesaForm.status}
                  onChange={(e) => setMesaForm({ ...mesaForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                >
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="OCUPADA">Ocupada</option>
                  <option value="RESERVADA">Reservada</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMesaModal(false)}
                  className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const newMesa = { id: Date.now().toString(), ...mesaForm };
                    setAreas(areas.map(a => 
                      a.id === mesaForm.areaId 
                        ? { ...a, mesas: [...(a.mesas || []), newMesa] }
                        : a
                    ));
                    setShowMesaModal(false);
                  }}
                  className="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN TURNO */}
      {showShiftConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">{editingShiftConfig ? "Editar Turno" : "Nuevo Turno"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={shiftConfigForm.nombre}
                  onChange={(e) => setShiftConfigForm({ ...shiftConfigForm, nombre: e.target.value })}
                  placeholder="Ej: Matutino"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Hora Inicio *</label>
                <input
                  type="time"
                  value={shiftConfigForm.horaInicio}
                  onChange={(e) => setShiftConfigForm({ ...shiftConfigForm, horaInicio: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Hora Fin *</label>
                <input
                  type="time"
                  value={shiftConfigForm.horaFin}
                  onChange={(e) => setShiftConfigForm({ ...shiftConfigForm, horaFin: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Días Activos</label>
                <div className="flex gap-2 flex-wrap">
                  {["L", "M", "X", "J", "V", "S", "D"].map((dia) => (
                    <button
                      key={dia}
                      onClick={() => {
                        const nuevosDias = shiftConfigForm.diasActivos.includes(dia)
                          ? shiftConfigForm.diasActivos.filter(d => d !== dia)
                          : [...shiftConfigForm.diasActivos, dia];
                        setShiftConfigForm({ ...shiftConfigForm, diasActivos: nuevosDias });
                      }}
                      className={`px-3 py-1 rounded text-sm ${
                        shiftConfigForm.diasActivos.includes(dia)
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {dia}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowShiftConfigModal(false)}
                  className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (editingShiftConfig) {
                      setShiftConfigs(shiftConfigs.map(s => s.id === editingShiftConfig.id ? { ...editingShiftConfig, ...shiftConfigForm } : s));
                    } else {
                      setShiftConfigs([...shiftConfigs, { id: Date.now().toString(), ...shiftConfigForm }]);
                    }
                    setShowShiftConfigModal(false);
                  }}
                  className="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTACIÓN CSV PRODUCTOS POS */}
      {posProductImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-[500px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Importar Productos desde CSV</h3>
            
            <div className="space-y-4">
              <button
                onClick={downloadPOSCSVTemplate}
                className="w-full px-4 py-3 rounded bg-slate-700 text-white hover:bg-slate-600 border border-slate-600"
              >
                📥 Descargar Plantilla CSV
              </button>

              <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handlePosFileUpload}
                  className="hidden"
                  id="pos-csv-upload"
                />
                <label
                  htmlFor="pos-csv-upload"
                  className="cursor-pointer"
                >
                  <div className="text-slate-400 mb-2">
                    Arrastra tu archivo CSV aquí o haz clic para seleccionar
                  </div>
                  <div className="text-sm text-slate-500">
                    Formato: nombre, categoria, precio, impuesto, descripcion
                  </div>
                </label>
              </div>

              {posCsvPreview.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Vista Previa (primeras 5 filas):</h4>
                  <div className="rounded-lg border border-slate-700 bg-slate-900 overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="text-slate-400">
                        <tr>
                          {Object.keys(posCsvPreview[0]).map(key => (
                            <th key={key} className="p-2 text-left">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {posCsvPreview.map((row, i) => (
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

              {posCsvImportResult && (
                <div className={`rounded-lg p-4 ${posCsvImportResult.success > 0 ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
                  <p className="text-white font-semibold">
                    {posCsvImportResult.success} productos importados correctamente
                  </p>
                  {posCsvImportResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-red-300 text-sm">{posCsvImportResult.errors.length} errores:</p>
                      <ul className="text-xs text-red-300 mt-1 space-y-1">
                        {posCsvImportResult.errors.map((err: any, i) => (
                          <li key={i}>Fila {err.row}: {err.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setPosProductImportModalOpen(false);
                  setPosCsvFile(null);
                  setPosCsvPreview([]);
                  setPosCsvImportResult(null);
                }}
                className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={importPosProductsFromCSV}
                disabled={!posCsvFile || isPosImporting}
                className="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {isPosImporting ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
