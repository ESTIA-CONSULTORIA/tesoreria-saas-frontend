import { useEffect, useState } from "react";
import { api } from "../../core/api/api";

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

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [ticket, setTicket] = useState<TicketItem[]>([]);
  const [shift, setShift] = useState<Shift | null>(null);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [salesFilter, setSalesFilter] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState<string>("EFECTIVO");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [initialFund, setInitialFund] = useState<string>("");

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
          cajero: "current-user-id", // TODO: Get from auth
          sucursalId: "default-branch-id", // TODO: Get from context
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
        cajero: "current-user-id", // TODO: Get from auth
        sucursalId: "default-branch-id", // TODO: Get from context
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
    return getSubtotal() * 0.16; // 16% IVA
  }

  function getTotal() {
    return getSubtotal() - getTotalDiscount() + getTaxes();
  }

  function getChange() {
    const received = Number(amountReceived) || 0;
    return received - getTotal();
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

    try {
      const saleData = {
        items: ticket,
        subtotal: getSubtotal(),
        descuento: getTotalDiscount(),
        impuestos: getTaxes(),
        total: getTotal(),
        metodoPago: paymentMethod,
        cajero: "current-user-id", // TODO: Get from auth
        turnoId: shift.id,
        sucursalId: "default-branch-id", // TODO: Get from context
      };

      const response = await api.post("/pos/sales", saleData);
      const sale = response.data;

      await api.put(`/pos/sales/${sale.id}/pay`, {
        metodoPago: paymentMethod,
        montoRecibido: Number(amountReceived) || getTotal(),
        cambio: paymentMethod === "EFECTIVO" ? getChange() : 0,
      });

      setCurrentSale(sale);
      setShowReceipt(true);
      setTicket([]);
      setAmountReceived("");
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
    <div className="h-screen flex flex-col bg-slate-900 text-white">
      {/* HEADER */}
      <header className="h-16 border-b border-slate-700 flex items-center justify-between px-4 bg-slate-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">POS</h1>
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
          {/* Search and Filter */}
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

          {/* Products Grid */}
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

          {/* Ticket Items */}
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

          {/* Totals */}
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
            <button
              onClick={() => {
                if (ticket.length > 0) {
                  const discount = prompt("Descuento global (%):", "0");
                  if (discount !== null) {
                    const discountPercent = Number(discount);
                    setTicket(
                      ticket.map((item) => ({
                        ...item,
                        descuento: discountPercent,
                        subtotal: item.cantidad * item.precioUnitario * (1 - discountPercent / 100),
                      }))
                    );
                  }
                }
              }}
              className="w-full py-2 rounded bg-slate-700 text-sm hover:bg-slate-600"
            >
              Aplicar Descuento Global
            </button>
            <button
              onClick={() => {
                if (ticket.length > 0) {
                  const motivo = prompt("Motivo de cortesía:");
                  if (motivo) {
                    setTicket(
                      ticket.map((item) => ({
                        ...item,
                        descuento: 100,
                        subtotal: 0,
                      }))
                    );
                  }
                }
              }}
              className="w-full py-2 rounded bg-yellow-600 text-sm hover:bg-yellow-700"
            >
              Cortesía
            </button>
          </div>
        </div>

        {/* ZONA DERECHA - COBRO (25%) */}
        <div className="w-[25%] flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold">Cobro</h2>
          </div>

          <div className="flex-1 p-4 space-y-4">
            {/* Total a cobrar */}
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm mb-2">Total a Cobrar</p>
              <p className="text-5xl font-bold text-green-400">${getTotal().toFixed(2)}</p>
            </div>

            {/* Métodos de pago */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod("EFECTIVO")}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  paymentMethod === "EFECTIVO"
                    ? "border-green-500 bg-green-900/30"
                    : "border-slate-700 bg-slate-800 hover:bg-slate-700"
                }`}
              >
                <div className="text-2xl mb-1">💵</div>
                <p className="text-sm">Efectivo</p>
              </button>
              <button
                onClick={() => setPaymentMethod("TARJETA")}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  paymentMethod === "TARJETA"
                    ? "border-green-500 bg-green-900/30"
                    : "border-slate-700 bg-slate-800 hover:bg-slate-700"
                }`}
              >
                <div className="text-2xl mb-1">💳</div>
                <p className="text-sm">Tarjeta</p>
              </button>
              <button
                onClick={() => setPaymentMethod("TRANSFERENCIA")}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  paymentMethod === "TRANSFERENCIA"
                    ? "border-green-500 bg-green-900/30"
                    : "border-slate-700 bg-slate-800 hover:bg-slate-700"
                }`}
              >
                <div className="text-2xl mb-1">📱</div>
                <p className="text-sm">Transferencia</p>
              </button>
              <button
                onClick={() => setPaymentMethod("CORTESIA")}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  paymentMethod === "CORTESIA"
                    ? "border-green-500 bg-green-900/30"
                    : "border-slate-700 bg-slate-800 hover:bg-slate-700"
                }`}
              >
                <div className="text-2xl mb-1">🎁</div>
                <p className="text-sm">Cortesía</p>
              </button>
            </div>

            {/* Campo recibido (solo efectivo) */}
            {paymentMethod === "EFECTIVO" && (
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Recibido</label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-800 text-white text-xl font-bold"
                />
                {getChange() >= 0 && (
                  <div className="text-center py-2">
                    <p className="text-slate-400 text-sm">Cambio</p>
                    <p className="text-2xl font-bold text-green-400">${getChange().toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Botón cobrar */}
            <button
              onClick={processPayment}
              disabled={ticket.length === 0 || !shift}
              className="w-full py-4 rounded-lg bg-green-600 text-white font-bold text-xl hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500"
            >
              COBRAR
            </button>
          </div>
        </div>
      </div>

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
