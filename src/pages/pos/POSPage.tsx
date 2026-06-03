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
  image?: string;
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

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadOpenShift();
  }, []);

  async function loadProducts() {
    try {
      const response = await api.get("/pos/products");
      setProducts(Array.isArray(response.data) ? response.data : []);
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
      setShift(response.data || null);
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
      setSalesHistory(Array.isArray(response.data) ? response.data : []);
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
      setTicket([
        ...ticket,
        {
          productoId: product.id,
          nombre: product.name,
          cantidad: 1,
          precioUnitario: product.price,
          descuento: 0,
          subtotal: product.price,
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
          ? { ...item, cantidad, subtotal: cantidad * item.precioUnitario * (1 - item.descuento / 100) }
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
          ? { ...item, descuento, subtotal: item.cantidad * item.precioUnitario * (1 - descuento / 100) }
          : item
      )
    );
  }

  function getSubtotal() {
    return ticket.reduce((sum, item) => sum + item.cantidad * item.precioUnitario, 0);
  }

  function getTotalDiscount() {
    return ticket.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario * item.descuento) / 100, 0);
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
          subtotal: item.cantidad * item.precioUnitario * (1 - discount / 100),
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

          {/* MAIN CONTENT - 3 ZONES */}
          <div className="flex-1 flex overflow-hidden">
            {/* ZONA IZQUIERDA - PRODUCTOS (40%) */}
            <div className="w-[40%] flex flex-col border-r border-slate-700">
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
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToTicket(product)}
                      className="p-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
                    >
                      <div className="aspect-square bg-slate-700 rounded mb-2 flex items-center justify-center text-3xl">
                        📦
                      </div>
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-green-400 font-bold">${product.price.toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ZONA CENTRAL - TICKET (35%) */}
            <div className="w-[35%] flex flex-col border-r border-slate-700">
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

            {/* ZONA DERECHA - COBRO (25%) */}
            <div className="w-[25%] flex flex-col">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-lg font-semibold">Cobro</h2>
              </div>

              <div className="flex-1 p-4 space-y-4 flex flex-col">
                <div className="text-center py-4">
                  <p className="text-slate-400 text-sm mb-2">Total a Cobrar</p>
                  <p className="text-5xl font-bold text-green-400">${getTotal().toFixed(2)}</p>
                </div>

                <button
                  onClick={() => setShowDiscountModal(true)}
                  className="w-full py-3 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600"
                >
                  Aplicar Descuento
                </button>

                <button
                  onClick={() => setShowCourtesyModal(true)}
                  className="w-full py-3 rounded-lg bg-yellow-600 text-white font-medium hover:bg-yellow-700"
                >
                  Cortesía
                </button>

                <div className="flex-1"></div>

                <button
                  onClick={() => {
                    if (ticket.length > 0 && shift) {
                      setShowPaymentModal(true);
                      setPaymentMethods([]);
                      setCardValidationError("");
                    }
                  }}
                  disabled={ticket.length === 0 || !shift}
                  className="w-full py-6 rounded-lg bg-green-600 text-white font-bold text-2xl hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500"
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
          <h2 className="text-2xl font-bold mb-4">Productos</h2>
          <p className="text-slate-400">Gestión de productos del POS</p>
          <div className="mt-4 p-4 rounded-lg bg-slate-800">
            <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
          </div>
        </div>
      )}

      {activeTab === "categorias" && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Categorías</h2>
          <p className="text-slate-400">Gestión de categorías de productos</p>
          <div className="mt-4 p-4 rounded-lg bg-slate-800">
            <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
          </div>
        </div>
      )}

      {activeTab === "areas" && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Áreas y Mesas</h2>
          <p className="text-slate-400">Configuración de áreas y mesas por sucursal</p>
          <div className="mt-4 p-4 rounded-lg bg-slate-800">
            <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
          </div>
        </div>
      )}

      {activeTab === "turnos" && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Turnos</h2>
          <p className="text-slate-400">Gestión de turnos y cajeros</p>
          <div className="mt-4 p-4 rounded-lg bg-slate-800">
            <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
          </div>
        </div>
      )}

      {activeTab === "hardware" && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Hardware</h2>
          <p className="text-slate-400">Configuración de impresoras, terminales y cajones</p>
          <div className="mt-4 p-4 rounded-lg bg-slate-800">
            <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
          </div>
        </div>
      )}

      {activeTab === "parametros" && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Parámetros</h2>
          <p className="text-slate-400">Configuración de parámetros de operación del POS</p>
          <div className="mt-4 p-4 rounded-lg bg-slate-800">
            <p className="text-sm text-slate-300">Funcionalidad en desarrollo...</p>
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
    </div>
  );
}
