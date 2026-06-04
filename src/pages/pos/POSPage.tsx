import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  stock?: number | null;
  stockMinimo?: number;
  isActive?: boolean;
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
  totalRetiros?: number;
  totalDepositos?: number;
  efectivoContado?: number;
  precorteGuardado?: boolean;
  precorteDeclaracion?: any;
  status: string;
}

interface Sale {
  id: string;
  folio: string;
  fecha: string;
  hora: string;
  items: TicketItem[];
  total: number;
  formaPago: string;
  formasPago?: Array<{
    forma: string;
    monto: number;
    ultimos4Digitos?: string;
  }>;
  status: string;
}

interface PaymentForm {
  id: string;
  forma: "EFECTIVO" | "TARJETA" | "DEBITO" | "CREDITO" | "TRANSFERENCIA" | "CORTESIA";
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("terminal");
  const user = useAuthStore((state) => state.user);
  const isAdminOrSoporte = user?.roleCode === "ADMIN" || user?.roleCode === "SOPORTE";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
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
  const [paymentForms, setPaymentForms] = useState<PaymentForm[]>([]);
  const [discountPercent, setDiscountPercent] = useState<string>("");
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCourtesyModal, setShowCourtesyModal] = useState(false);
  const [courtesyReason, setCourtesyReason] = useState("");
  const [courtesyAuthorizedBy, setCourtesyAuthorizedBy] = useState("");
  const [cardValidationError, setCardValidationError] = useState("");
  
  // Enhanced discount modal state
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [customDiscountValue, setCustomDiscountValue] = useState<string>("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectAllProducts, setSelectAllProducts] = useState(true);
  const [discountReason, setDiscountReason] = useState<string>("");
  const [predefinedDiscounts, setPredefinedDiscounts] = useState<number[]>([5, 10, 15, 20, 25, 50]);
  
  // Enhanced courtesy modal state
  const [courtesyProductIds, setCourtesyProductIds] = useState<Set<string>>(new Set());
  const [selectAllCourtesy, setSelectAllCourtesy] = useState(true);
  const [courtesyAuthUser, setCourtesyAuthUser] = useState<string>("");
  const [courtesyAuthPin, setCourtesyAuthPin] = useState<string>("");
  
  // Retiro/Depósito modals
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("");
  const [withdrawalReason, setWithdrawalReason] = useState<string>("");
  const [withdrawalAuthorizedBy, setWithdrawalAuthorizedBy] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositOrigin, setDepositOrigin] = useState<string>("");
  const [depositAuthorizedBy, setDepositAuthorizedBy] = useState<string>("");
  
  // Login/Shift opening screens
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [cashierPin, setCashierPin] = useState<string>("");
  const [selectedCashier, setSelectedCashier] = useState<string>("");
  const [shiftNotes, setShiftNotes] = useState<string>("");
  
  // Precorte/Corte modals
  const [showPrecutModal, setShowPrecutModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [cashCounts, setCashCounts] = useState<Record<string, number>>({});
  const [efectivoContado, setEfectivoContado] = useState<string>("");
  
  // Precorte declaration state
  const [debitoDeclarado, setDebitoDeclarado] = useState<string>("");
  const [creditoDeclarado, setCreditoDeclarado] = useState<string>("");
  const [transferenciaDeclarada, setTransferenciaDeclarada] = useState<string>("");
  const [valesDeclarados, setValesDeclarados] = useState<string>("");
  
  // Premium payment modal state
  const [selectedPaymentForm, setSelectedPaymentForm] = useState<"EFECTIVO" | "TARJETA" | "DEBITO" | "CREDITO" | "TRANSFERENCIA" | "CORTESIA" | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [cardLast4, setCardLast4] = useState<string>("");
  const [cardBank, setCardBank] = useState<string>("");
  const [speiKey, setSpeiKey] = useState<string>("");
  const paymentInputRef = useRef<HTMLInputElement>(null);
  
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
    loadCategories().then(() => {
      loadProducts();
    });
    loadOpenShift();
  }, []);

  useEffect(() => {
    // Show login screen if no shift is open and cashier hasn't been selected
    if (!shift && !selectedCashier) {
      setShowLoginScreen(true);
    }
  }, [shift, selectedCashier]);

  // Auto-focus payment input when modal opens
  useEffect(() => {
    if (showPaymentModal && paymentInputRef.current) {
      paymentInputRef.current.focus();
    }
  }, [showPaymentModal]);

  async function loadProducts() {
    try {
      const response = await api.get("/pos/products");
      const mappedProducts = Array.isArray(response.data) ? response.data.map((p: any) => ({
        ...p,
        price: Number(p.price) || 0,
        category: categories.find(c => c.id === p.categoryId)?.name || 'Sin categoría'
      })) : [];
      console.log('productos cargados:', mappedProducts.length, mappedProducts);
      if (mappedProducts.length > 0) {
        console.log('primer producto mapeado:', mappedProducts[0]);
      }
      setProducts(mappedProducts);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  }

  async function loadCategories() {
    try {
      const response = await api.get("/pos/categories");
      console.log('categorías del backend:', response.data);
      const cats = Array.isArray(response.data) ? response.data : [];
      setCategories([{ id: "all", name: "Todos" }, ...cats]);
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
        totalRetiros: Number(response.data.totalRetiros) || 0,
        totalDepositos: Number(response.data.totalDepositos) || 0,
        precorteGuardado: response.data.precorteGuardado || false,
        precorteDeclaracion: response.data.precorteDeclaracion || null,
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
    if (!initialFund || Number(initialFund) <= 0) {
      alert("El fondo de caja es obligatorio");
      return;
    }
    try {
      const response = await api.post("/pos/shifts", {
        cajero: selectedCashier || "current-user-id",
        sucursalId: "default-branch-id",
        fondoInicial: Number(initialFund) || 0,
        notas: shiftNotes,
      });
      console.log('Turno creado:', response.data);
      setShowOpenShiftModal(false);
      setInitialFund("");
      setShiftNotes("");
      // Set shift directly from response instead of reloading
      setShift({
        ...response.data,
        totalVentas: Number(response.data.totalVentas) || 0,
        totalEfectivo: Number(response.data.totalEfectivo) || 0,
        totalTarjeta: Number(response.data.totalTarjeta) || 0,
        totalTransferencia: Number(response.data.totalTransferencia) || 0,
        totalCortesia: Number(response.data.totalCortesia) || 0,
        totalDevoluciones: Number(response.data.totalDevoluciones) || 0,
        totalRetiros: Number(response.data.totalRetiros) || 0,
        totalDepositos: Number(response.data.totalDepositos) || 0,
        precorteGuardado: response.data.precorteGuardado || false,
        precorteDeclaracion: response.data.precorteDeclaracion || null,
      });
    } catch (error) {
      console.error("Error opening shift:", error);
      alert("Error al abrir turno");
    }
  }

  function handleLogin() {
    // Simple PIN validation (in production, this would validate against backend)
    if (cashierPin.length >= 4) {
      setShowLoginScreen(false);
      setShowOpenShiftModal(true);
      setCashierPin("");
    } else {
      alert("PIN debe tener al menos 4 dígitos");
    }
  }

  async function closeShift() {
    if (!shift) return;
    try {
      const declaracion = shift.precorteDeclaracion || {};
      await api.put(`/pos/shifts/${shift.id}/close`, {
        totalVentas: shift.totalVentas,
        totalEfectivo: shift.totalEfectivo || 0,
        totalTarjeta: shift.totalTarjeta || 0,
        totalTransferencia: shift.totalTransferencia || 0,
        totalCortesia: shift.totalCortesia || 0,
        totalDevoluciones: shift.totalDevoluciones || 0,
        totalRetiros: shift.totalRetiros || 0,
        totalDepositos: shift.totalDepositos || 0,
        efectivoContado: Number(declaracion.efectivoContado) || 0,
      });
      setShift(null);
      setShowCloseShiftModal(false);
      alert("Turno cerrado exitosamente");
    } catch (error) {
      console.error("Error closing shift:", error);
      alert("Error al cerrar turno");
    }
  }

  async function handleWithdrawal() {
    if (!shift || !withdrawalAmount || !withdrawalReason || !withdrawalAuthorizedBy) {
      alert("Todos los campos son obligatorios");
      return;
    }
    try {
      await api.post(`/pos/shifts/${shift.id}/withdrawal`, {
        monto: Number(withdrawalAmount),
        motivo: withdrawalReason,
        autorizadoPor: withdrawalAuthorizedBy,
      });
      setShowWithdrawalModal(false);
      setWithdrawalAmount("");
      setWithdrawalReason("");
      setWithdrawalAuthorizedBy("");
      loadOpenShift();
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      alert("Error al procesar retiro");
    }
  }

  async function handleDeposit() {
    if (!shift || !depositAmount || !depositOrigin || !depositAuthorizedBy) {
      alert("Todos los campos son obligatorios");
      return;
    }
    try {
      await api.post(`/pos/shifts/${shift.id}/deposit`, {
        monto: Number(depositAmount),
        origen: depositOrigin,
        autorizadoPor: depositAuthorizedBy,
      });
      setShowDepositModal(false);
      setDepositAmount("");
      setDepositOrigin("");
      setDepositAuthorizedBy("");
      loadOpenShift();
    } catch (error) {
      console.error("Error processing deposit:", error);
      alert("Error al procesar depósito");
    }
  }

  async function handlePrecut() {
    if (!shift) return;
    try {
      await api.post(`/pos/shifts/${shift.id}/precut`, {
        efectivoContado: calculateTotalCash(),
        efectivoDenominaciones: cashCounts,
        debitoDeclarado: Number(debitoDeclarado) || 0,
        creditoDeclarado: Number(creditoDeclarado) || 0,
        transferenciaDeclarada: Number(transferenciaDeclarada) || 0,
        valesDeclarados: Number(valesDeclarados) || 0,
      });
      setShowPrecutModal(false);
      // Update local shift state to mark precorte as saved
      setShift(prev => prev ? {
        ...prev,
        precorteGuardado: true,
        precorteDeclaracion: {
          efectivoContado: calculateTotalCash(),
          efectivoDenominaciones: cashCounts,
          debitoDeclarado: Number(debitoDeclarado) || 0,
          creditoDeclarado: Number(creditoDeclarado) || 0,
          transferenciaDeclarada: Number(transferenciaDeclarada) || 0,
          valesDeclarados: Number(valesDeclarados) || 0,
        }
      } : prev);
      // Reset precorte form state
      setCashCounts({});
      setDebitoDeclarado("");
      setCreditoDeclarado("");
      setTransferenciaDeclarada("");
      setValesDeclarados("");
      alert("Precorte guardado correctamente");
    } catch (error) {
      console.error("Error saving precut:", error);
      alert("Error al guardar precorte");
    }
  }

  function calculateTotalCash() {
    const denominations = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
    return denominations.reduce((sum, denom) => sum + (cashCounts[denom] || 0) * denom, 0);
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
    return paymentForms.reduce((sum, pf) => sum + pf.monto, 0);
  }

  function getPending() {
    return getTotal() - getTotalCovered();
  }

  function getChange() {
    const cashPayment = paymentForms.find(pf => pf.forma === "EFECTIVO");
    if (!cashPayment) return 0;
    return cashPayment.monto - getTotal();
  }

  function addPaymentForm(forma: "EFECTIVO" | "TARJETA" | "DEBITO" | "CREDITO" | "TRANSFERENCIA" | "CORTESIA", monto?: number) {
    const newForm: PaymentForm = {
      id: Date.now().toString(),
      forma,
      monto: monto || (forma === "CORTESIA" ? getTotal() : getPending()),
    };
    setPaymentForms([...paymentForms, newForm]);
  }

  function updatePaymentForm(id: string, field: string, value: any) {
    setPaymentForms(paymentForms.map(pf => 
      pf.id === id ? { ...pf, [field]: value } : pf
    ));
  }

  function removePaymentForm(id: string) {
    setPaymentForms(paymentForms.filter(pf => pf.id !== id));
  }

  function applyGlobalDiscount() {
    if (ticket.length > 0 && discountReason) {
      const discount = Number(customDiscountValue) || Number(discountPercent);
      const targetIds = selectAllProducts ? new Set(ticket.map(t => t.productoId)) : selectedProductIds;
      
      setTicket(
        ticket.map((item) => {
          if (targetIds.has(item.productoId)) {
            if (discountType === 'percentage') {
              return {
                ...item,
                descuento: discount,
                subtotal: item.cantidad * Number(item.precioUnitario) * (1 - discount / 100),
              };
            } else {
              const discountAmount = discount;
              const newSubtotal = Math.max(0, item.cantidad * Number(item.precioUnitario) - discountAmount);
              return {
                ...item,
                descuento: (discountAmount / (item.cantidad * Number(item.precioUnitario))) * 100,
                subtotal: newSubtotal,
              };
            }
          }
          return item;
        })
      );
      setShowDiscountModal(false);
      setDiscountPercent("");
      setCustomDiscountValue("");
      setDiscountReason("");
      setSelectedProductIds(new Set());
      setSelectAllProducts(true);
    } else {
      alert("Debe ingresar un motivo para el descuento");
    }
  }

  function applyCourtesy() {
    if (ticket.length > 0 && courtesyReason && courtesyAuthUser && courtesyAuthPin) {
      // Simple PIN validation (in production, validate against backend)
      if (courtesyAuthPin.length < 4) {
        alert("El PIN debe tener al menos 4 dígitos");
        return;
      }
      
      const targetIds = selectAllCourtesy ? new Set(ticket.map(t => t.productoId)) : courtesyProductIds;
      
      setTicket(
        ticket.map((item) => {
          if (targetIds.has(item.productoId)) {
            return {
              ...item,
              descuento: 100,
              subtotal: 0,
              esCortesia: true,
            };
          }
          return item;
        })
      );
      setShowCourtesyModal(false);
      setCourtesyReason("");
      setCourtesyAuthUser("");
      setCourtesyAuthPin("");
      setCourtesyProductIds(new Set());
      setSelectAllCourtesy(true);
    } else {
      alert("Debe completar todos los campos obligatorios");
    }
  }

  function validateCardPayments(): boolean {
    setCardValidationError("");
    const cardPayments = paymentForms.filter(pf => pf.forma === "TARJETA");
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
        formasPago: paymentForms,
        cajero: "current-user-id",
        turnoId: shift.id,
        sucursalId: "default-branch-id",
      };
      console.log('turnoActivo:', shift);
      console.log('body venta:', saleData);

      const response = await api.post("/pos/sales", saleData);
      const sale = response.data;

      setCurrentSale(sale);
      setShowReceipt(true);
      setShowPaymentModal(false);
      setTicket([]);
      setPaymentForms([]);
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
    console.log('Filtrando producto:', product.name, 'category:', product.category, 'selectedCategory:', selectedCategory, 'matchesCategory:', matchesCategory);
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
              <button
                onClick={() => {
                  if (shift && salesHistory.length > 0) {
                    setShowExitConfirmModal(true);
                  } else {
                    navigate('/dashboard');
                  }
                }}
                className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
              >
                ← Salir
              </button>
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
                <>
                  <button
                    onClick={() => setShowWithdrawalModal(true)}
                    className="px-3 py-2 rounded bg-yellow-600 text-white text-sm hover:bg-yellow-700"
                  >
                    💰 Retiro
                  </button>
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                  >
                    💵 Depósito
                  </button>
                  <button
                    onClick={() => setShowPrecutModal(true)}
                    disabled={shift?.precorteGuardado}
                    className="px-3 py-2 rounded bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500"
                  >
                    {shift?.precorteGuardado ? '✓ Precorte realizado' : '📊 Precorte'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!shift) return;
                      try {
                        const response = await api.get(`/pos/shifts/${shift.id}/summary`);
                        setShiftSummary(response.data);
                        setShowCloseShiftModal(true);
                      } catch (error) {
                        console.error("Error loading shift summary:", error);
                        alert("Error al cargar resumen del turno");
                      }
                    }}
                    disabled={!shift?.precorteGuardado}
                    className="px-4 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500"
                  >
                    Cerrar Turno
                  </button>
                </>
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
                      key={category.id}
                      onClick={() => setSelectedCategory(category.name)}
                      className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                        selectedCategory === category.name
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      {category.name}
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
                      className="max-w-[120px] max-h-[120px] p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors flex flex-col relative"
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
                      {product.stock !== null && product.stock !== undefined && (
                        <div className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          product.stock === 0
                            ? 'bg-red-600 text-white'
                            : product.stock <= (product.stockMinimo || 0)
                            ? 'bg-yellow-600 text-white'
                            : 'bg-green-600 text-white'
                        }`}>
                          {product.stock}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ZONA DERECHA - TICKET + COBRO (25%) */}
            <div className="w-[25%] h-full flex flex-col">
              {/* TICKET */}
              <div className="flex-1 flex flex-col border-b border-slate-700 min-h-0">
                <div className="p-4 border-b border-slate-700 flex-shrink-0">
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
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-slate-700 space-y-2 bg-slate-800 flex-shrink-0">
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
              <div className="p-4 space-y-3 bg-slate-900 flex-shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDiscountModal(true)}
                    disabled={!ticket || ticket.length === 0}
                    className="flex-1 h-9 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    Descuento
                  </button>
                  <button
                    onClick={() => setShowCourtesyModal(true)}
                    disabled={!ticket || ticket.length === 0}
                    className="flex-1 h-9 rounded-lg bg-yellow-600 text-white font-medium hover:bg-yellow-700 disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    Cortesía
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (ticket.length > 0) {
                      setShowPaymentModal(true);
                      setPaymentForms([]);
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
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No hay productos registrados
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3 text-sm">{product.id || "-"}</td>
                      <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-sm">{product.category || "-"}</td>
                      <td className="px-4 py-3 text-sm text-right">${Number(product.price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          product.isActive ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                        }`}>
                          {product.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setProductForm({
                              codigo: product.id || "",
                              nombre: product.name,
                              descripcion: "",
                              precio: String(product.price),
                              categoria: product.category || "",
                              imagenUrl: product.imageUrl || "",
                              impuesto: "16",
                              tipo: "SIMPLE",
                              recipeId: "",
                              insumoId: "",
                              activo: product.isActive !== false
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
                              setProducts(products.filter(p => p.id !== product.id));
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
            <h3 className="text-lg font-semibold mb-4">Apertura de Turno</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Cajero</label>
                <div className="text-white font-medium">{selectedCashier || "Usuario Demo"}</div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Fecha y Hora</label>
                <div className="text-white">{new Date().toLocaleString()}</div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Fondo de Caja *</label>
                <input
                  type="number"
                  step="0.01"
                  value={initialFund}
                  onChange={(e) => setInitialFund(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Notas (opcional)</label>
                <textarea
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="Notas del turno..."
                  className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
                  rows={2}
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
                  Abrir Turno
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANTALLA LOGIN CAJERO */}
      {showLoginScreen && (
        <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 w-96">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🏪</div>
              <h2 className="text-2xl font-bold">POS Sistema</h2>
              <p className="text-slate-400">Inicio de Cajero</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Seleccionar Cajero</label>
                <select
                  value={selectedCashier}
                  onChange={(e) => setSelectedCashier(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
                >
                  <option value="">Seleccionar...</option>
                  <option value="cajero1">Juan Pérez</option>
                  <option value="cajero2">María García</option>
                  <option value="cajero3">Carlos López</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">PIN de Cajero</label>
                <input
                  type="password"
                  maxLength={6}
                  value={cashierPin}
                  onChange={(e) => setCashierPin(e.target.value)}
                  placeholder="****"
                  className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white text-center text-2xl tracking-widest"
                />
              </div>
              <button
                onClick={handleLogin}
                className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                Continuar
              </button>
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
          <div className="bg-slate-800 rounded-xl p-6 w-[500px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Aplicar Descuento</h3>
            <div className="space-y-4">
              {/* Sección 1: Descuentos predefinidos */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Descuentos predefinidos</label>
                <div className="flex flex-wrap gap-2">
                  {predefinedDiscounts.map((percent) => (
                    <button
                      key={percent}
                      onClick={() => {
                        setDiscountType('percentage');
                        setCustomDiscountValue(percent.toString());
                      }}
                      className="px-3 py-2 rounded bg-slate-700 text-white hover:bg-slate-600 text-sm"
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Sección 2: Descuento personalizado */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Descuento personalizado</label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setDiscountType('percentage')}
                    className={`flex-1 py-2 rounded ${discountType === 'percentage' ? 'bg-blue-600' : 'bg-slate-700'} text-white`}
                  >
                    Porcentaje
                  </button>
                  <button
                    onClick={() => setDiscountType('fixed')}
                    className={`flex-1 py-2 rounded ${discountType === 'fixed' ? 'bg-blue-600' : 'bg-slate-700'} text-white`}
                  >
                    Monto fijo
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  value={customDiscountValue || discountPercent}
                  onChange={(e) => setCustomDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? '0' : '0.00'}
                  className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
                />
              </div>

              {/* Sección 3: Selección de productos */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectAllProducts}
                    onChange={(e) => {
                      setSelectAllProducts(e.target.checked);
                      if (e.target.checked) {
                        setSelectedProductIds(new Set(ticket.map(t => t.productoId)));
                      } else {
                        setSelectedProductIds(new Set());
                      }
                    }}
                    className="rounded"
                  />
                  <label className="text-sm text-slate-400">Aplicar a todo el ticket</label>
                </div>
                {!selectAllProducts && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {ticket.map((item) => (
                      <div key={item.productoId} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.has(item.productoId)}
                          onChange={(e) => {
                            const newSet = new Set(selectedProductIds);
                            if (e.target.checked) {
                              newSet.add(item.productoId);
                            } else {
                              newSet.delete(item.productoId);
                            }
                            setSelectedProductIds(newSet);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-white">{item.nombre}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sección 4: Motivo */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Motivo *</label>
                <select
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
                >
                  <option value="">Seleccionar motivo...</option>
                  <option value="promocion">Promoción</option>
                  <option value="cliente_frecuente">Cliente frecuente</option>
                  <option value="error_cobro">Error de cobro</option>
                  <option value="autorizacion_gerencia">Autorización gerencia</option>
                  <option value="otro">Otro</option>
                </select>
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
                  Aplicar descuento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CORTESÍA */}
      {showCourtesyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-[500px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Cortesía</h3>
            <div className="space-y-4">
              {/* Sección 1: Selección de productos */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectAllCourtesy}
                    onChange={(e) => {
                      setSelectAllCourtesy(e.target.checked);
                      if (e.target.checked) {
                        setCourtesyProductIds(new Set(ticket.map(t => t.productoId)));
                      } else {
                        setCourtesyProductIds(new Set());
                      }
                    }}
                    className="rounded"
                  />
                  <label className="text-sm text-slate-400">Cortesía total del ticket</label>
                </div>
                {!selectAllCourtesy && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {ticket.map((item) => (
                      <div key={item.productoId} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={courtesyProductIds.has(item.productoId)}
                          onChange={(e) => {
                            const newSet = new Set(courtesyProductIds);
                            if (e.target.checked) {
                              newSet.add(item.productoId);
                            } else {
                              newSet.delete(item.productoId);
                            }
                            setCourtesyProductIds(newSet);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-white">{item.nombre}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sección 2: Motivo */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Motivo *</label>
                <select
                  value={courtesyReason}
                  onChange={(e) => setCourtesyReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
                >
                  <option value="">Seleccionar motivo...</option>
                  <option value="cortesia_ejecutiva">Cortesía ejecutiva</option>
                  <option value="error_pedido">Error en pedido</option>
                  <option value="cliente_vip">Cliente VIP</option>
                  <option value="cumpleanos">Cumpleaños</option>
                  <option value="compensacion_queja">Compensación por queja</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {/* Sección 3: Autorización */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Autorización *</label>
                <select
                  value={courtesyAuthUser}
                  onChange={(e) => setCourtesyAuthUser(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white mb-2"
                >
                  <option value="">Seleccionar autorizador...</option>
                  <option value="admin">Administrador</option>
                  <option value="soporte">Soporte</option>
                </select>
                <input
                  type="password"
                  maxLength={4}
                  value={courtesyAuthPin}
                  onChange={(e) => setCourtesyAuthPin(e.target.value)}
                  placeholder="PIN de autorización (4 dígitos)"
                  className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white text-center"
                />
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
                  disabled={!courtesyReason || !courtesyAuthUser || !courtesyAuthPin}
                  className="flex-1 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500"
                >
                  Aplicar cortesía
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COBRO PREMIUM */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-[800px] max-h-[90vh] overflow-hidden flex">
            {/* COLUMNA IZQUIERDA (40%) */}
            <div className="w-[40%] pr-4 flex flex-col border-r border-slate-700">
              {/* Header */}
              <div className="mb-4">
                <p className="text-xs text-slate-400 mb-1">TOTAL</p>
                <p className="text-4xl font-bold text-green-400">${getTotal().toFixed(2)}</p>
                {paymentForms.length > 0 && (
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="text-green-400">Pagado: ${getTotalCovered().toFixed(2)}</div>
                    {getPending() > 0 && (
                      <div className="text-red-400">Pendiente: ${getPending().toFixed(2)}</div>
                    )}
                    {getChange() > 0 && (
                      <div className="text-green-400">Cambio: ${getChange().toFixed(2)}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Botones de forma de pago */}
              <div className="space-y-2 mb-4">
                <button
                  onClick={() => {
                    setSelectedPaymentForm("EFECTIVO");
                    setPaymentAmount("");
                    setTimeout(() => paymentInputRef.current?.focus(), 0);
                  }}
                  className={`w-full h-12 rounded-lg flex items-center gap-3 px-4 transition-colors ${
                    selectedPaymentForm === "EFECTIVO" 
                      ? "bg-blue-600 border-2 border-blue-400" 
                      : "bg-slate-700 border border-slate-600 hover:bg-slate-600"
                  }`}
                >
                  <span className="text-xl">◈</span>
                  <span className="font-medium">Efectivo</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedPaymentForm("DEBITO");
                    setPaymentAmount("");
                    setTimeout(() => paymentInputRef.current?.focus(), 0);
                  }}
                  className={`w-full h-12 rounded-lg flex items-center gap-3 px-4 transition-colors ${
                    selectedPaymentForm === "DEBITO" 
                      ? "bg-blue-600 border-2 border-blue-400" 
                      : "bg-slate-700 border border-slate-600 hover:bg-slate-600"
                  }`}
                >
                  <span className="text-xl">▣</span>
                  <span className="font-medium">Tarjeta Débito</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedPaymentForm("CREDITO");
                    setPaymentAmount("");
                    setTimeout(() => paymentInputRef.current?.focus(), 0);
                  }}
                  className={`w-full h-12 rounded-lg flex items-center gap-3 px-4 transition-colors ${
                    selectedPaymentForm === "CREDITO" 
                      ? "bg-blue-600 border-2 border-blue-400" 
                      : "bg-slate-700 border border-slate-600 hover:bg-slate-600"
                  }`}
                >
                  <span className="text-xl">◉</span>
                  <span className="font-medium">Tarjeta Crédito</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedPaymentForm("TRANSFERENCIA");
                    setPaymentAmount("");
                    setTimeout(() => paymentInputRef.current?.focus(), 0);
                  }}
                  className={`w-full h-12 rounded-lg flex items-center gap-3 px-4 transition-colors ${
                    selectedPaymentForm === "TRANSFERENCIA" 
                      ? "bg-blue-600 border-2 border-blue-400" 
                      : "bg-slate-700 border border-slate-600 hover:bg-slate-600"
                  }`}
                >
                  <span className="text-xl">⇄</span>
                  <span className="font-medium">SPEI</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedPaymentForm("CORTESIA");
                    setPaymentAmount("");
                    setTimeout(() => paymentInputRef.current?.focus(), 0);
                  }}
                  className={`w-full h-12 rounded-lg flex items-center gap-3 px-4 transition-colors ${
                    selectedPaymentForm === "CORTESIA" 
                      ? "bg-blue-600 border-2 border-blue-400" 
                      : "bg-slate-700 border border-slate-600 hover:bg-slate-600"
                  }`}
                >
                  <span className="text-xl">✦</span>
                  <span className="font-medium">Cortesía</span>
                </button>
              </div>

              {/* Lista de pagos agregados */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {paymentForms.map((pf) => (
                  <div key={pf.id} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {pf.forma === "EFECTIVO" ? "◈" : 
                         pf.forma === "DEBITO" ? "▣" : 
                         pf.forma === "CREDITO" ? "◉" : 
                         pf.forma === "TRANSFERENCIA" ? "⇄" : "✦"}
                      </span>
                      <span className="text-sm">${pf.monto.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => removePaymentForm(pf.id)}
                      className="text-red-400 hover:text-red-300 text-lg"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Botón confirmar */}
              <button
                onClick={processPayment}
                disabled={getTotalCovered() < getTotal()}
                className="w-full py-3 rounded-lg bg-green-700 text-white font-bold hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-500"
              >
                CONFIRMAR COBRO →
              </button>
            </div>

            {/* COLUMNA DERECHA (60%) */}
            <div className="w-[60%] pl-4 flex flex-col">
              {/* Campo monto activo */}
              <div className="mb-4">
                <p className="text-sm text-slate-400 mb-2">
                  {selectedPaymentForm || "Seleccionar forma de pago"}
                </p>
                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <input
                    ref={paymentInputRef}
                    type="text"
                    value={paymentAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Solo permitir dígitos y un punto decimal
                      if (/^\d*\.?\d*$/.test(value)) {
                        setPaymentAmount(value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (selectedPaymentForm && Number(paymentAmount) > 0) {
                          addPaymentForm(selectedPaymentForm, Number(paymentAmount));
                          setPaymentAmount("");
                          setTimeout(() => paymentInputRef.current?.focus(), 0);
                        }
                      } else if (e.key === 'Backspace') {
                        setPaymentAmount(paymentAmount.slice(0, -1));
                      }
                    }}
                    placeholder="0.00"
                    className="w-full bg-transparent text-4xl font-bold text-white text-right outline-none"
                  />
                </div>
              </div>

              {/* Teclado numérico */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "⌫"].map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key === "⌫") {
                        setPaymentAmount(paymentAmount.slice(0, -1));
                      } else {
                        setPaymentAmount(paymentAmount + key);
                      }
                    }}
                    className="h-16 rounded-lg bg-slate-700 hover:bg-slate-600 text-2xl font-medium transition-colors"
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Botón agregar pago */}
              <button
                onClick={() => {
                  if (selectedPaymentForm && Number(paymentAmount) > 0) {
                    addPaymentForm(selectedPaymentForm, Number(paymentAmount));
                    setPaymentAmount("");
                  }
                }}
                disabled={!selectedPaymentForm || Number(paymentAmount) <= 0}
                className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 mb-4"
              >
                + Agregar pago
              </button>

              {/* Campos adicionales según forma de pago */}
              {selectedPaymentForm === "DEBITO" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Últimos 4 dígitos o folio voucher *</label>
                    <input
                      type="text"
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value)}
                      placeholder="****"
                      className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Banco emisor</label>
                    <input
                      type="text"
                      value={cardBank}
                      onChange={(e) => setCardBank(e.target.value)}
                      placeholder="Banco"
                      className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-700"
                    />
                  </div>
                </div>
              )}

              {selectedPaymentForm === "CREDITO" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Últimos 4 dígitos o folio voucher *</label>
                    <input
                      type="text"
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value)}
                      placeholder="****"
                      className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Banco emisor</label>
                    <input
                      type="text"
                      value={cardBank}
                      onChange={(e) => setCardBank(e.target.value)}
                      placeholder="Banco"
                      className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-700"
                    />
                  </div>
                </div>
              )}

              {selectedPaymentForm === "TRANSFERENCIA" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Clave de rastreo SPEI *</label>
                    <input
                      type="text"
                      value={speiKey}
                      onChange={(e) => setSpeiKey(e.target.value)}
                      placeholder="Clave de rastreo"
                      className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-700"
                    />
                  </div>
                  <button
                    onClick={() => window.open("https://www.banxico.org.mx/cep/", "_blank")}
                    className="w-full py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                  >
                    Verificar en BANXICO →
                  </button>
                </div>
              )}

              {selectedPaymentForm === "CORTESIA" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Motivo *</label>
                    <select
                      value={courtesyReason}
                      onChange={(e) => setCourtesyReason(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-700"
                    >
                      <option value="">Seleccionar motivo...</option>
                      <option value="cortesia_ejecutiva">Cortesía ejecutiva</option>
                      <option value="error_pedido">Error en pedido</option>
                      <option value="cliente_vip">Cliente VIP</option>
                      <option value="cumpleanos">Cumpleaños</option>
                      <option value="compensacion_queja">Compensación por queja</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Autorizado por *</label>
                    <select
                      value={courtesyAuthUser}
                      onChange={(e) => setCourtesyAuthUser(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-700"
                    >
                      <option value="">Seleccionar autorizador...</option>
                      <option value="admin">Administrador</option>
                      <option value="soporte">Soporte</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Botón cerrar */}
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPaymentForm(null);
                  setPaymentAmount("");
                  setCardLast4("");
                  setCardBank("");
                  setSpeiKey("");
                  setCourtesyReason("");
                  setCourtesyAuthUser("");
                }}
                className="mt-auto py-2 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
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
              <div className="border-t pt-2 mt-2">
                <p className="text-sm font-semibold mb-2">Formas de Pago:</p>
                {Array.isArray(currentSale.formasPago) ? currentSale.formasPago.map((pf: any, idx: number) => (
                  <div key={idx} className="text-xs flex justify-between">
                    <span>{pf.forma}{pf.ultimos4Digitos ? ` ****${pf.ultimos4Digitos}` : ''}</span>
                    <span>${pf.monto.toFixed(2)}</span>
                  </div>
                )) : (
                  <div className="text-xs flex justify-between">
                    <span>{currentSale.formaPago}</span>
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

      {/* MODAL RETIRO */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">💰 Retiro de Efectivo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Monto *</label>
                <input
                  type="number"
                  step="0.01"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Motivo *</label>
                <input
                  type="text"
                  value={withdrawalReason}
                  onChange={(e) => setWithdrawalReason(e.target.value)}
                  placeholder="Motivo del retiro"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Autorizado por *</label>
                <select
                  value={withdrawalAuthorizedBy}
                  onChange={(e) => setWithdrawalAuthorizedBy(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                >
                  <option value="">Seleccionar autorizador</option>
                  <option value="admin">Administrador</option>
                  <option value="soporte">Soporte</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowWithdrawalModal(false)}
                  className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleWithdrawal}
                  className="flex-1 py-2 rounded bg-yellow-600 text-white hover:bg-yellow-700"
                >
                  Retirar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DEPÓSITO */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">💵 Depósito de Efectivo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Monto *</label>
                <input
                  type="number"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Origen *</label>
                <input
                  type="text"
                  value={depositOrigin}
                  onChange={(e) => setDepositOrigin(e.target.value)}
                  placeholder="Origen del depósito"
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Autorizado por *</label>
                <select
                  value={depositAuthorizedBy}
                  onChange={(e) => setDepositAuthorizedBy(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white"
                >
                  <option value="">Seleccionar autorizador</option>
                  <option value="admin">Administrador</option>
                  <option value="soporte">Soporte</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeposit}
                  className="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Depositar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRECORTE X */}
      {showPrecutModal && shift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-[600px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">📊 Precorte X — Turno #{shift.id.slice(0, 8)}</h3>
            <div className="space-y-4">
              {/* Resumen de ventas (solo lectura) */}
              <div className="bg-slate-900 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Resumen de Ventas</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total Ventas: ${Number(shift.totalVentas).toFixed(2)}</div>
                  <div>Tickets: {salesHistory.length}</div>
                  <div>Efectivo: ${Number(shift.totalEfectivo).toFixed(2)}</div>
                  <div>Tarjeta (Débito/Crédito): ${Number(shift.totalTarjeta).toFixed(2)}</div>
                  <div>Transferencia SPEI: ${Number(shift.totalTransferencia).toFixed(2)}</div>
                  <div>Cortesía: ${Number(shift.totalCortesia).toFixed(2)}</div>
                </div>
              </div>

              {/* Conteo de efectivo */}
              <div className="bg-slate-900 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Conteo de Efectivo</h4>
                {[1000, 500, 200, 100, 50, 20, 10, 5, 2, 1].map(denom => (
                  <div key={denom} className="flex items-center gap-2 mb-2">
                    <span className="w-20 text-sm">${denom} ×</span>
                    <input
                      type="number"
                      value={cashCounts[denom] || 0}
                      onChange={(e) => setCashCounts({ ...cashCounts, [denom]: Number(e.target.value) })}
                      className="w-20 px-2 py-1 rounded bg-slate-700 text-white text-sm"
                    />
                    <span className="text-sm text-slate-400">= ${(cashCounts[denom] || 0) * denom}</span>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-slate-700 font-semibold">
                  TOTAL EFECTIVO: ${calculateTotalCash().toFixed(2)}
                </div>
              </div>

              {/* Otras formas de pago (declaración) */}
              <div className="bg-slate-900 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Otras Formas de Pago (Declaración)</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-32 text-sm">Terminal débito:</span>
                    <input
                      type="number"
                      value={debitoDeclarado}
                      onChange={(e) => setDebitoDeclarado(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-2 py-1 rounded bg-slate-700 text-white text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-32 text-sm">Terminal crédito:</span>
                    <input
                      type="number"
                      value={creditoDeclarado}
                      onChange={(e) => setCreditoDeclarado(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-2 py-1 rounded bg-slate-700 text-white text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-32 text-sm">Transferencias:</span>
                    <input
                      type="number"
                      value={transferenciaDeclarada}
                      onChange={(e) => setTransferenciaDeclarada(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-2 py-1 rounded bg-slate-700 text-white text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-32 text-sm">Vales/Cupones:</span>
                    <input
                      type="number"
                      value={valesDeclarados}
                      onChange={(e) => setValesDeclarados(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-2 py-1 rounded bg-slate-700 text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowPrecutModal(false)}
                  className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePrecut}
                  className="flex-1 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
                >
                  Guardar Precorte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CORTE Z */}
      {showCloseShiftModal && shift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-[700px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">🔒 Corte de Caja — Turno #{shift.id.slice(0, 8)}</h3>
            <div className="space-y-4">
              {/* Resumen del turno (solo lectura) */}
              <div className="bg-slate-900 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Resumen del Turno</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Hora Apertura: {shift.horaApertura}</div>
                  <div>Hora Cierre: {new Date().toLocaleTimeString()}</div>
                  <div>Fondo Inicial: ${Number(shift.fondoInicial).toFixed(2)}</div>
                  <div>Total Ventas: ${Number(shift.totalVentas).toFixed(2)}</div>
                  <div>Total Retiros: ${Number(shift.totalRetiros || 0).toFixed(2)}</div>
                  <div>Total Depósitos: ${Number(shift.totalDepositos || 0).toFixed(2)}</div>
                </div>
              </div>

              {/* Tabla de conciliación */}
              <div className="bg-slate-900 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Conciliación — Sistema vs Declarado</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2">Forma de Pago</th>
                      <th className="text-right py-2">Sistema</th>
                      <th className="text-right py-2">Declarado</th>
                      <th className="text-right py-2">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const declaracion = shift.precorteDeclaracion || {};
                      const totals = shiftSummary?.calculatedTotals || {};
                      
                      const efectivoSistema = totals.efectivoEsperado || (Number(shift.fondoInicial) + Number(shift.totalEfectivo) + Number(shift.totalDepositos || 0) - Number(shift.totalRetiros || 0));
                      const efectivoDeclarado = Number(declaracion.efectivoContado) || 0;
                      const efectivoDif = efectivoSistema - efectivoDeclarado;
                      
                      const debitoSistema = totals.totalVentasDebito || 0;
                      const debitoDeclarado = Number(declaracion.debitoDeclarado) || 0;
                      const debitoDif = debitoSistema - debitoDeclarado;
                      
                      const creditoSistema = totals.totalVentasCredito || 0;
                      const creditoDeclarado = Number(declaracion.creditoDeclarado) || 0;
                      const creditoDif = creditoSistema - creditoDeclarado;
                      
                      const transferenciaSistema = totals.totalVentasSPEI || Number(shift.totalTransferencia);
                      const transferenciaDeclarada = Number(declaracion.transferenciaDeclarada) || 0;
                      const transferenciaDif = transferenciaSistema - transferenciaDeclarada;
                      
                      const cortesiaSistema = totals.totalVentasCortesia || Number(shift.totalCortesia);
                      
                      const rows = [
                        { name: 'Efectivo', sistema: efectivoSistema, declarado: efectivoDeclarado, dif: efectivoDif },
                        { name: 'Tarjeta Débito', sistema: debitoSistema, declarado: debitoDeclarado, dif: debitoDif },
                        { name: 'Tarjeta Crédito', sistema: creditoSistema, declarado: creditoDeclarado, dif: creditoDif },
                        { name: 'SPEI', sistema: transferenciaSistema, declarado: transferenciaDeclarada, dif: transferenciaDif },
                        { name: 'Cortesía', sistema: cortesiaSistema, declarado: 0, dif: 0, noDeclarado: true },
                      ];
                      
                      return rows.map((row, i) => (
                        <tr key={i} className="border-b border-slate-800">
                          <td className="py-2">{row.name}</td>
                          <td className="text-right py-2">${row.sistema.toFixed(2)}</td>
                          <td className="text-right py-2">{row.noDeclarado ? '-' : `$${row.declarado.toFixed(2)}`}</td>
                          <td className={`text-right py-2 font-semibold ${
                            row.dif === 0 ? '' : row.dif < 0 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {row.noDeclarado ? '-' : `$${row.dif.toFixed(2)}`}
                          </td>
                        </tr>
                      ));
                    })()}
                    <tr className="border-t border-slate-700 font-bold">
                      <td className="py-2">TOTAL</td>
                      <td className="text-right py-2">${(() => {
                        const totals = shiftSummary?.calculatedTotals || {};
                        const efectivoSistema = totals.efectivoEsperado || (Number(shift.fondoInicial) + Number(shift.totalEfectivo) + Number(shift.totalDepositos || 0) - Number(shift.totalRetiros || 0));
                        const debitoSistema = totals.totalVentasDebito || 0;
                        const creditoSistema = totals.totalVentasCredito || 0;
                        const transferenciaSistema = totals.totalVentasSPEI || Number(shift.totalTransferencia);
                        const cortesiaSistema = totals.totalVentasCortesia || Number(shift.totalCortesia);
                        return (efectivoSistema + debitoSistema + creditoSistema + transferenciaSistema + cortesiaSistema).toFixed(2);
                      })()}</td>
                      <td className="text-right py-2">${(() => {
                        const declaracion = shift.precorteDeclaracion || {};
                        const efectivoDeclarado = Number(declaracion.efectivoContado) || 0;
                        const debitoDeclarado = Number(declaracion.debitoDeclarado) || 0;
                        const creditoDeclarado = Number(declaracion.creditoDeclarado) || 0;
                        const transferenciaDeclarada = Number(declaracion.transferenciaDeclarada) || 0;
                        return (efectivoDeclarado + debitoDeclarado + creditoDeclarado + transferenciaDeclarada).toFixed(2);
                      })()}</td>
                      <td className={`text-right py-2 ${
                        (() => {
                          const totals = shiftSummary?.calculatedTotals || {};
                          const efectivoSistema = totals.efectivoEsperado || (Number(shift.fondoInicial) + Number(shift.totalEfectivo) + Number(shift.totalDepositos || 0) - Number(shift.totalRetiros || 0));
                          const debitoSistema = totals.totalVentasDebito || 0;
                          const creditoSistema = totals.totalVentasCredito || 0;
                          const transferenciaSistema = totals.totalVentasSPEI || Number(shift.totalTransferencia);
                          const cortesiaSistema = totals.totalVentasCortesia || Number(shift.totalCortesia);
                          const totalSistema = efectivoSistema + debitoSistema + creditoSistema + transferenciaSistema + cortesiaSistema;
                          
                          const declaracion = shift.precorteDeclaracion || {};
                          const efectivoDeclarado = Number(declaracion.efectivoContado) || 0;
                          const debitoDeclarado = Number(declaracion.debitoDeclarado) || 0;
                          const creditoDeclarado = Number(declaracion.creditoDeclarado) || 0;
                          const transferenciaDeclarada = Number(declaracion.transferenciaDeclarada) || 0;
                          const totalDeclarado = efectivoDeclarado + debitoDeclarado + creditoDeclarado + transferenciaDeclarada;
                          const totalDif = totalSistema - totalDeclarado;
                          
                          return totalDif === 0 ? '' : totalDif < 0 ? 'text-red-400' : 'text-green-400';
                        })()
                      }`}>
                        ${(() => {
                          const totals = shiftSummary?.calculatedTotals || {};
                          const efectivoSistema = totals.efectivoEsperado || (Number(shift.fondoInicial) + Number(shift.totalEfectivo) + Number(shift.totalDepositos || 0) - Number(shift.totalRetiros || 0));
                          const debitoSistema = totals.totalVentasDebito || 0;
                          const creditoSistema = totals.totalVentasCredito || 0;
                          const transferenciaSistema = totals.totalVentasSPEI || Number(shift.totalTransferencia);
                          const cortesiaSistema = totals.totalVentasCortesia || Number(shift.totalCortesia);
                          const totalSistema = efectivoSistema + debitoSistema + creditoSistema + transferenciaSistema + cortesiaSistema;
                          
                          const declaracion = shift.precorteDeclaracion || {};
                          const efectivoDeclarado = Number(declaracion.efectivoContado) || 0;
                          const debitoDeclarado = Number(declaracion.debitoDeclarado) || 0;
                          const creditoDeclarado = Number(declaracion.creditoDeclarado) || 0;
                          const transferenciaDeclarada = Number(declaracion.transferenciaDeclarada) || 0;
                          const totalDeclarado = efectivoDeclarado + debitoDeclarado + creditoDeclarado + transferenciaDeclarada;
                          const totalDif = totalSistema - totalDeclarado;
                          
                          return totalDif.toFixed(2);
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCloseShiftModal(false)}
                  className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={closeShift}
                  className="flex-1 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Cerrar Turno Definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN SALIR */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">¿Salir del POS?</h3>
            <p className="text-sm text-slate-400 mb-6">
              ¿Seguro que deseas salir? El turno quedará activo y podrás continuar después.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="flex-1 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Salir
              </button>
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
