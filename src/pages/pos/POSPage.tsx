import { COLOR_CATEGORIA_POR_DEFECTO } from "./coloresDatos";
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";
import { useLoginConfigStore } from "../../core/store/useLoginConfigStore";
import { useCompanyStore } from "../../core/store/useCompanyStore";
import { useBrandingStore } from "../../core/store/useBrandingStore";
import { getDeviceId } from "../../core/device/deviceId";
import { useDirectorioUsuarios } from "../../core/hooks/useDirectorioUsuarios";
import { nombreUsuario } from "../../core/utils/nombreUsuario";
import {
  offlineDb, replaceLocalCache, readLocalCache, isNetworkOrTimeoutError,
  enqueueOperation, getPendingSalesForShift, countPendingOperations,
  countFailedOperations, generateLocalId, generateOfflineSaleFolio,
} from "../../core/offline/db";
import { OFFLINE_SYNC_COMPLETED_EVENT } from "../../core/offline/syncEngine";
import PosChatPanel from "./PosChatPanel";
import TableLayout from "./TableLayout";
import { desgloseTicket, esTasaIva, etiquetaTasa, lineasDeIva, tasaEfectiva, TASAS_IVA, type IvaConfig, type TasaIva, etiquetaIvaUnica } from "../../core/utils/iva";
import { propsTextoLibre } from "../../core/utils/inputBusqueda";
import { esFormaTarjeta, ultimos4Validos } from '../../core/utils/tarjeta';
import { esReintentable } from '../../core/utils/monto';
import { motivoDeRechazo } from '../../core/offline/saleDuplicate';
import { ModalPOS } from "../../core/components/ModalPOS";
import { useAviso, useConfirm } from "../../core/components/confirmContext";
import { AlertaModal } from "../../core/components/AlertaModal";
import { Boton } from "../../core/components/Boton";
import { AutorizacionGerente, type Autorizador } from "./AutorizacionGerente";
import ModalTema from "./ModalTema";
import { descuentoPedidoPct as calcularDescuentoPct, firmaTicket, ticketRequiereAutorizacion, topeDescuento } from "./reglasAutorizacion";
import { ModalFooter } from "../../core/components/ModalFooter";
import { AperturaTurnoModal, CierreTurnoModal, CobroPOS, MovimientoEfectivoModal, PrecorteModal, efectivoEsperado } from "./ModalesCaja";
import { totalContado } from "./cajaTurno";
import { InputBusqueda } from "../../core/components/InputBusqueda";
import { OPCIONES_POLITICA_COBRO, OPCIONES_POLITICA_DIVISION, type PoliticaCobro, type PoliticaDivision } from "../mesas/mesasLogic";

type TabType = "terminal" | "productos" | "categorias" | "areas" | "turnos" | "parametros";

interface TicketItem {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  // IVA: tasa propia del producto (null = la del negocio) y, en una venta ya guardada, la tasa con que se vendió.
  tasaIva?: string | null;
  ivaIncluido?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  tasaIva?: string | null;
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

// Forma mínima del error de axios que usamos para mostrar el mensaje real del backend.
type ApiErrorLike = { response?: { data?: { message?: string | string[] } } };

interface Sale {
  id: string;
  folio: string;
  fecha: string;
  hora: string;
  items: TicketItem[];
  total: number;
  subtotal?: number;
  descuento?: number;
  impuestos?: number;
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

// INVARIANTE: esta pantalla NUNCA debe envolverse en <MainLayout> (el wrapper que
// pone <TopBar/> — el menú lateral del ERP: Dashboard, RH, Tesorería, etc.). Es la
// terminal de venta, para ADMIN/SOPORTE re-identificado por PIN o para un CAJERO
// autenticado directo desde el tab "Punto de Venta" de LoginPage.tsx — en ambos
// casos debe verse a pantalla completa, sin navegación del ERP alrededor. Si en el
// futuro esta pantalla necesita algún tipo de navegación propia, debe ser un
// componente propio de POS, no MainLayout — confirmado con evidencia real que hoy
// POSPage no lo importa (grep: cero matches de MainLayout/TopBar/sidebar en este
// archivo) y así debe seguir.
export default function POSPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("terminal");
  const user = useAuthStore((state) => state.user);
  // Nombre del cajero para mostrar (solo presentación: el id sigue guardándose y enviándose igual). Sale del directorio del
  // propio negocio; el usuario de la sesión y el cajero que entró por NIP tienen su nombre de respaldo.
  const directorioUsuarios = useDirectorioUsuarios();
  const [cajeroNip, setCajeroNip] = useState<{ id: string; nombre: string } | null>(null);
  const nombreCajero = (id?: string | null) =>
    nombreUsuario(
      id,
      directorioUsuarios,
      id && cajeroNip && cajeroNip.id === id ? cajeroNip.nombre : id && id === user?.id ? user?.name || user?.email || "Usuario" : "Usuario",
    );
  const logout = useAuthStore((state) => state.logout);
  const authChecked = useAuthStore((state) => state.authChecked);
  const branchId = useAuthStore((state) => state.branchId);
  const tenantId = useAuthStore((state) => state.tenantId);
  const { config } = useLoginConfigStore();
  const { activeCompany } = useCompanyStore();
  const isAdminOrSoporte = user?.roleCode === "ADMIN" || user?.roleCode === "SOPORTE";
  // Su propia sesión ya es la identidad en caja (CAJERO y, en gimnasio, RECEPCION): no piden NIP aparte.
  const esCajeroDeSesion = user?.roleCode === "CAJERO" || user?.roleCode === "RECEPCION";
  // La cortesía (venta sin cobro) solo la registran GERENTE y ADMIN; el servidor responde 403 a cualquier otro rol.
  const puedeCortesia = user?.roleCode === "GERENTE" || user?.roleCode === "ADMIN";
  // Auditoría de producto (GoodsHabits, Punto 1): mismo store que ya carga branding —
  // App.tsx lo dispara en cuanto hay `user` (ERP normal o cajero por NIP, ambos lo pueblan).
  const stockPolicy = useBrandingStore((state) => state.stockPolicy);
  // IVA del negocio (Parámetros del POS): tasa por defecto y si los precios del catálogo ya lo incluyen.
  const ivaTasaDefault = useBrandingStore((state) => state.ivaTasaDefault);
  const preciosIncluyenIva = useBrandingStore((state) => state.preciosIncluyenIva);
  const ivaCfg: IvaConfig = useMemo(() => ({ ivaTasaDefault, preciosIncluyenIva }), [ivaTasaDefault, preciosIncluyenIva]);
  // Gimnasio (capacidad membresias): socio al que se le aplica su beneficio en esta venta. El descuento lo vuelve a decidir
  // el servidor, con los mismos topes por rol que cualquier descuento.
  const membresiasOn = useBrandingStore((state) => state.membresiasOn);
  const [socioPOS, setSocioPOS] = useState<{ id: string; numeroSocio: string; nombre: string; descuentoPct: number } | null>(null);
  const [socioNumero, setSocioNumero] = useState("");
  const [socioError, setSocioError] = useState("");

  // Giro detection
  const [giro, setGiro] = useState<string>("");
  const [selectedTableForPOS, setSelectedTableForPOS] = useState<{ id: string; numero: number } | null>(null);
  const [showTableSelect, setShowTableSelect] = useState(false);

  const isRestaurant = /restaurante|food|bar|cocina|cafeteria|cafe|bistro/i.test(giro);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  // Fase C1: true cuando ese dato de referencia vino de la copia local (Dexie) porque
  // el GET falló por red/timeout — no por otra razón (permisos, servidor, etc.).
  const [usingCachedCategories, setUsingCachedCategories] = useState(false);
  const [usingCachedProducts, setUsingCachedProducts] = useState(false);
  const [usingCachedAreas, setUsingCachedAreas] = useState(false);
  // Fase D: contadores reactivos vía useLiveQuery — se actualizan solos, tanto cuando
  // este componente encola algo como cuando el motor de sincronización (corriendo en
  // segundo plano, arrancado en App.tsx) cambia la cola. Sin esto, el contador se
  // quedaría desactualizado mientras el motor trabaja fuera de cualquier acción del cajero.
  const pendingOpsCount = useLiveQuery(() => countPendingOperations(), [], 0);
  const failedOpsCount = useLiveQuery(() => countFailedOperations(), [], 0);

  // Confirmación breve de "todo sincronizado" — señal aparte del contador persistente,
  // porque useLiveQuery solo da el valor actual, no si acaba de bajar a 0 recién.
  const [showSyncedToast, setShowSyncedToast] = useState(false);
  useEffect(() => {
    function onSyncCompleted() {
      setShowSyncedToast(true);
      setTimeout(() => setShowSyncedToast(false), 3000);
    }
    window.addEventListener(OFFLINE_SYNC_COMPLETED_EVENT, onSyncCompleted);
    return () => window.removeEventListener(OFFLINE_SYNC_COMPLETED_EVENT, onSyncCompleted);
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [ticket, setTicket] = useState<TicketItem[]>([]);
  const [shift, setShift] = useState<Shift | null>(null);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [showTema, setShowTema] = useState(false);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [salesFilter, setSalesFilter] = useState<string>("all");
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [ticketMessage, setTicketMessage] = useState("");
  const [requireInvoice, setRequireInvoice] = useState(false);
  const [invoiceRfc, setInvoiceRfc] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [initialFund, setInitialFund] = useState<string>("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForms, setPaymentForms] = useState<PaymentForm[]>([]);
  const [discountPercent, setDiscountPercent] = useState<string>("");
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCourtesyModal, setShowCourtesyModal] = useState(false);
  const [courtesyReason, setCourtesyReason] = useState("");
  const [cardValidationError, setCardValidationError] = useState("");
  const [showReturnSaleModal, setShowReturnSaleModal] = useState(false);
  const [returnSaleId, setReturnSaleId] = useState<string | null>(null);
  const [returnSaleReason, setReturnSaleReason] = useState("");
  const [returnSaleError, setReturnSaleError] = useState("");
  const [returningSale, setReturningSale] = useState(false);
  // Política de devoluciones del negocio (SOLO_GERENTE | CAJERO_LIBRE) y si ESTE usuario puede
  // devolver. Solo decide si se muestra el botón: el backend vuelve a validar al devolver.
  const [politicaDevoluciones, setPoliticaDevoluciones] = useState<"SOLO_GERENTE" | "CAJERO_LIBRE">("SOLO_GERENTE");
  const [puedeDevolver, setPuedeDevolver] = useState(false);
  const [savingPolitica, setSavingPolitica] = useState(false);
  const [politicaGuardada, setPoliticaGuardada] = useState(false);
  const [politicaError, setPoliticaError] = useState("");
  // Políticas de cuentas de mesa (solo ADMIN y solo con la capacidad mesas_cuenta_abierta).
  const [mesasHabilitado, setMesasHabilitado] = useState(false);
  const [politicaCobro, setPoliticaCobro] = useState<PoliticaCobro>("SOLO_CAJA");
  const [politicaDivision, setPoliticaDivision] = useState<PoliticaDivision>("GERENTE_CAPITAN_CAJERO");
  const [savingMesasPol, setSavingMesasPol] = useState(false);
  const [mesasPolMsg, setMesasPolMsg] = useState<{ ok: boolean; texto: string } | null>(null);

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
  // Autorización de un gerente/admin (cortesía, o descuento sobre el límite del rol): token de un solo uso ligado a las líneas del ticket.
  const [autorizadores, setAutorizadores] = useState<Autorizador[] | null>(null);
  const [autorizadorId, setAutorizadorId] = useState<string>("");
  const [autorizadorClave, setAutorizadorClave] = useState<string>("");
  const [autorizando, setAutorizando] = useState(false);
  const [autorizacionPOS, setAutorizacionPOS] = useState<{ tipo: "CORTESIA" | "DESCUENTO"; motivo: string; token?: string; firma: string; vence?: number; autorizadoPor?: string } | null>(null);
  
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
  // Cajeros activos del negocio para el login (GET /pos/cashiers/lista); null = cargando.
  const [cajerosLista, setCajerosLista] = useState<Array<{ id: string; nombre: string | null; rol: string }> | null>(null);
  // Auditoría de seguridad (GoodsHabits, cookies httpOnly, Pendiente 1): true solo cuando
  // un cajero se identificó por NIP (handleLogin) — NO cuando el usuario ERP ya ES el
  // cajero (ver el useEffect de "salvaguarda" más abajo, que nunca pasa por handleLogin).
  // Mientras esté activo, el interceptor de abajo agrega x-session-scope: pos-lite a las
  // llamadas de turnos/ventas, para que se autentiquen con pos_access_token (la identidad
  // del cajero) en vez de con la cookie de quien abrió el terminal. Se apaga al cerrar el
  // turno (closeShift) — mismo momento en que ya se limpia selectedCashier.
  const [nipSessionActive, setNipSessionActive] = useState(false);
  const nipSessionActiveRef = useRef(false);
  useEffect(() => { nipSessionActiveRef.current = nipSessionActive; }, [nipSessionActive]);

  // Interceptor con ámbito al ciclo de vida de esta pantalla (se registra al montar, se
  // quita al desmontar) — nunca afecta llamadas de otras páginas que compartan el cliente
  // `api`. Whitelist explícita de URL (solo turnos y ventas, lo que realmente identifica al
  // cajero) en vez de aplicarlo a ciegas a todo mientras nipSessionActiveRef sea true.
  // Verificado con curl real que la exclusión de /pos/products (catálogo) NO era necesaria
  // por 403: PlanModuloGuard resuelve el módulo contra tenant_modules por tenantId, no
  // contra el modulosActivos del JWT — el catálogo respondió 200 igual con la cookie del
  // cajero. Se excluye igual, a propósito: /pos/products, /pos/categories, /pos/areas y
  // /tenant-settings son config de tienda (no una acción del cajero), y no hay ninguna
  // ganancia real en atribuirlas a su identidad. Se usa un ref, no el state directo, porque
  // el interceptor se registra una sola vez al montar y debe leer el valor más reciente en
  // cada request, no el capturado en ese momento.
  useEffect(() => {
    const interceptorId = api.interceptors.request.use((config) => {
      if (nipSessionActiveRef.current) {
        const url = config.url || '';
        const isCashierScoped = url.includes('/pos/shifts') || url.includes('/pos/sales');
        if (isCashierScoped) {
          // config.headers es una instancia de AxiosHeaders, no un objeto plano —
          // reemplazarla con un spread pierde sus métodos de clase (set/get/has/delete...)
          // y no compila. Setea la propiedad directo en la instancia existente.
          config.headers['x-session-scope'] = 'pos-lite';
        }
      }
      return config;
    });
    return () => { api.interceptors.request.eject(interceptorId); };
  }, []);
  const [shiftNotes, setShiftNotes] = useState<string>("");
  const [showChatPanel, setShowChatPanel] = useState(false);
  
  // Precorte/Corte modals
  const [showPrecutModal, setShowPrecutModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  // Errores dentro de las ventanas de caja (antes alert()): de validación por campo y de la operación (servidor). Se limpian al cerrar la ventana.
  const avisar = useAviso();
  const confirmar = useConfirm();
  const [errProducto, setErrProducto] = useState<string | null>(null);
  const [errLogin, setErrLogin] = useState<string | null>(null);
  const [errDescuento, setErrDescuento] = useState<string | null>(null);
  const [errCortesia, setErrCortesia] = useState<string | null>(null);
  const [errApertura, setErrApertura] = useState<string | null>(null);
  const [errAperturaFondo, setErrAperturaFondo] = useState<string | null>(null);
  const [errMovimiento, setErrMovimiento] = useState<string | null>(null);
  const [errMovimientoCampos, setErrMovimientoCampos] = useState<{ monto?: string; autorizadoPor?: string; concepto?: string }>({});
  const [errPrecorte, setErrPrecorte] = useState<string | null>(null);
  const [errCierre, setErrCierre] = useState<string | null>(null);
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
  const [selectedPaymentForm, setSelectedPaymentForm] = useState<"EFECTIVO" | "TARJETA" | "DEBITO" | "CREDITO" | "TRANSFERENCIA" | "CORTESIA" | null>("EFECTIVO");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [cardLast4, setCardLast4] = useState<string>("");
  const [cardBank, setCardBank] = useState<string>("");
  const [speiKey, setSpeiKey] = useState<string>("");
  const paymentInputRef = useRef<HTMLInputElement>(null);
  // Cuenta fallos consecutivos de POST /pos/sales para el cobro actual. Se resetea al
  // cobrar con éxito. No sobrevive a un refresh de página (es intencional: es solo para
  // distinguir "primer intento" de "ya reintentó y sigue fallando" dentro de la misma sesión de cobro).
  const paymentFailureCountRef = useRef<number>(0);
  
  // Productos tab state
  const [posProducts, setPosProducts] = useState<any[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  // Insumos y recetas REALES del negocio para los selectores del modal de producto (GET /pos/products/opciones-stock).
  // Nunca valores de prueba: el servidor rechaza con 400 un insumoId o recipeId que no sea un UUID del tenant.
  const [opcionesStock, setOpcionesStock] = useState<{ insumos: { id: string; nombre: string }[]; recetas: { id: string; nombre: string }[] }>({ insumos: [], recetas: [] });
  const [opcionesStockCargadas, setOpcionesStockCargadas] = useState(false);
  useEffect(() => {
    if (!showProductModal) return;
    let cancelado = false;
    setOpcionesStockCargadas(false);
    api
      .get("/pos/products/opciones-stock")
      .then((res) => {
        if (cancelado) return;
        const d = res.data || {};
        setOpcionesStock({ insumos: Array.isArray(d.insumos) ? d.insumos : [], recetas: Array.isArray(d.recetas) ? d.recetas : [] });
      })
      .catch(() => {
        if (!cancelado) setOpcionesStock({ insumos: [], recetas: [] });
      })
      .finally(() => {
        if (!cancelado) setOpcionesStockCargadas(true);
      });
    return () => {
      cancelado = true;
    };
  }, [showProductModal]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    precio: "",
    categoria: "",
    imagenUrl: "",
    tasaIva: "",
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
    color: COLOR_CATEGORIA_POR_DEFECTO,
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
    status: "AVAILABLE"
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

  // Auditoría de producto (GoodsHabits, Hallazgo 0): stockPolicy se movió aquí desde
  // PosConfigPage.tsx (huérfano, sin ruta en App.tsx — la pantalla real de Parámetros del
  // POS siempre fue esta). El valor mostrado se lee directo de useBrandingStore (línea
  // ~118, ya usado por el bloqueo de botones de producto) — no hace falta duplicarlo en
  // estado local, solo el feedback visual del guardado.
  const [savingStockPolicy, setSavingStockPolicy] = useState(false);
  const [stockPolicySaved, setStockPolicySaved] = useState(false);

  // Guarda el producto en el servidor. El precio y la tasa de IVA que cobra el POS salen siempre de aquí, no del cliente.
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  async function guardarProducto() {
    setErrProducto(null);
    const nombre = productForm.nombre.trim();
    const precio = Number(productForm.precio);
    if (!nombre || !Number.isFinite(precio) || precio < 0) {
      setErrProducto("Escribe el nombre y un precio válido.");
      return;
    }
    const categoria = categories.find((c: any) => c.name === productForm.categoria.trim());
    const cuerpo: Record<string, unknown> = {
      name: nombre,
      price: precio,
      imageUrl: productForm.imagenUrl || null,
      isActive: productForm.activo,
      tasaIva: productForm.tasaIva === "" ? null : productForm.tasaIva,
      ...(categoria ? { categoryId: categoria.id } : {}),
    };
    setGuardandoProducto(true);
    try {
      if (editingProduct) {
        await api.put(`/pos/products/${editingProduct.id}`, cuerpo);
      } else {
        await api.post("/pos/products", {
          ...cuerpo,
          type: productForm.tipo,
          ...(productForm.tipo === "PREPARADO" && productForm.recipeId ? { recipeId: productForm.recipeId } : {}),
          ...(productForm.tipo === "SIMPLE" && productForm.insumoId ? { insumoId: productForm.insumoId } : {}),
          branchId: user?.branchId || branchId || undefined,
        });
      }
      setShowProductModal(false);
      await loadProducts(categories);
    } catch (error) {
      const e = error as ApiErrorLike;
      const msg = e?.response?.data?.message;
      setErrProducto(Array.isArray(msg) ? msg.join(". ") : msg || "No se pudo guardar el producto.");
    } finally {
      setGuardandoProducto(false);
    }
  }

  // IVA del negocio (solo ADMIN). Aplica a las ventas nuevas: lo ya vendido conserva la tasa con que se vendió.
  const [guardandoIva, setGuardandoIva] = useState(false);
  const [ivaMsg, setIvaMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  async function guardarIva(cambio: Partial<IvaConfig>) {
    const tid = localStorage.getItem("tenant_id");
    if (!tid) return;
    setGuardandoIva(true);
    setIvaMsg(null);
    try {
      await api.put(`/tenant-settings/${tid}`, cambio);
      await useBrandingStore.getState().load();
      setIvaMsg({ ok: true, texto: "IVA guardado. Aplica a las ventas nuevas; las ya hechas conservan su tasa." });
    } catch (error) {
      const e = error as ApiErrorLike;
      const msg = e?.response?.data?.message;
      setIvaMsg({ ok: false, texto: Array.isArray(msg) ? msg.join(". ") : msg || "No se pudo guardar el IVA." });
    } finally {
      setGuardandoIva(false);
    }
  }

  async function saveStockPolicy(value: 'BLOQUEAR' | 'PERMITIR_NEGATIVO') {
    const tenantId = localStorage.getItem('tenant_id');
    if (!tenantId) return;
    setSavingStockPolicy(true);
    setStockPolicySaved(false);
    try {
      await api.put(`/tenant-settings/${tenantId}`, { stockPolicy: value });
      await useBrandingStore.getState().load();
      setStockPolicySaved(true);
    } finally {
      setSavingStockPolicy(false);
    }
  }

  useEffect(() => {
    // Asegura la identidad del dispositivo desde el arranque del POS, antes de que
    // exista cualquier necesidad de armar un folio con ella (Fase A1, modo offline).
    getDeviceId();
  }, []);

  useEffect(() => {
    if (!activeCompany?.id) return;
    api.get(`/companies/${activeCompany.id}`)
      .then((res) => setGiro(res.data?.giro || res.data?.businessType || ""))
      .catch(() => {});
  }, [activeCompany?.id]);

  useEffect(() => {
    // Auditoría de seguridad (GoodsHabits, cookies httpOnly, Pendiente 2): antes esperaba
    // `token` (state.token de useAuthStore) — un residuo que ya nadie escribe desde la
    // migración a cookies httpOnly (confirmado: ningún caller pasa token a login()). Para
    // una sesión nueva sin ese residuo en localStorage, este efecto nunca corría. La señal
    // real de sesión resuelta es `authChecked` (se vuelve true una sola vez, cuando el
    // bootstrap GET /auth/me de App.tsx confirma o descarta la cookie) combinada con
    // `user` (solo se puebla en éxito) — ambos vienen de useAuthStore.
    if (!authChecked || !user) return; // esperar a que el bootstrap de sesión resuelva
    loadCategories().then((cats) => {
      loadProducts(cats);
    });
    loadPosCategories();
    loadAreas();

    if (esCajeroDeSesion) {
      // El usuario ERP autenticado ya ES el cajero — no requiere PIN adicional.
      setShowLoginScreen(false);
      setSelectedCashier(user?.id || '');
      loadOpenShift(user?.id || '').then((openShift) => {
        if (!openShift) setShowOpenShiftModal(true);
      });
    } else {
      // ADMIN/SOPORTE: pedir PIN siempre al cargar la página, sin excepción —
      // nunca se asume identidad de una sesión anterior.
      setSelectedCashier('');
      setShowLoginScreen(true);
    }
  }, [authChecked, user?.id]);

  useEffect(() => {
    // Salvaguarda: si el usuario ERP es CAJERO, su propia sesión ya es la identidad.
    if (esCajeroDeSesion && shift) {
      setSelectedCashier(user?.id || '');
    }
  }, [shift]);

  // Teclado de la Terminal (mouse + teclado + lector): F2 buscar producto, F4 cobrar, Esc limpia la búsqueda. Con cualquier
  // ventana abierta no actúa (cada ventana atiende su propio teclado). Los overlays propios (historial, recibo, devolución)
  // se cierran con Escape; en la devolución, Ctrl+Enter confirma.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showSalesHistory || showReceipt || showReturnSaleModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (showReturnSaleModal) { setShowReturnSaleModal(false); setReturnSaleId(null); setReturnSaleReason(""); setReturnSaleError(""); }
          else if (showReceipt) setShowReceipt(false);
          else setShowSalesHistory(false);
        } else if (e.key === 'Enter' && e.ctrlKey && showReturnSaleModal) {
          e.preventDefault();
          void confirmReturnSale();
        }
        return;
      }
      if (activeTab !== 'terminal' || !shift || document.querySelector('[role="dialog"]')) return;
      const buscador = document.querySelector<HTMLInputElement>('input[name="pos-buscar-producto"]');
      if (e.key === 'F2') {
        e.preventDefault();
        buscador?.focus();
        buscador?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        abrirCobro();
      } else if (e.key === 'Escape' && searchTerm) {
        e.preventDefault();
        setSearchTerm("");
        buscador?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Foco inicial de la Terminal: el buscador (para teclear o para que un lector escriba ahí).
  useEffect(() => {
    if (activeTab !== 'terminal' || !shift) return;
    const t = setTimeout(() => {
      if (document.querySelector('[role="dialog"]')) return;
      document.querySelector<HTMLInputElement>('input[name="pos-buscar-producto"]')?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [activeTab, !!shift]);

  // Auto-focus payment input when modal opens
  useEffect(() => {
    if (showPaymentModal && paymentInputRef.current) {
      paymentInputRef.current.focus();
    }
  }, [showPaymentModal]);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'categorias') loadPosCategories();
    if (activeTab === 'areas') loadAreas();
  }, [activeTab]);

  async function loadProducts(cats: any[]) {
    const mapProducts = (raw: any[]) => raw.map((p: any) => ({
      ...p,
      price: Number(p.price) || 0,
      category: cats.find(c => c.id === p.categoryId)?.name || 'Sin categoría'
    }));
    try {
      const response = await api.get("/pos/products");
      const rawProducts = Array.isArray(response.data) ? response.data : [];
      await replaceLocalCache(offlineDb.products, rawProducts);
      setProducts(mapProducts(rawProducts));
      setUsingCachedProducts(false);
    } catch (error) {
      console.error("Error loading products:", error);
      if (isNetworkOrTimeoutError(error)) {
        const cached = await readLocalCache(offlineDb.products);
        setProducts(mapProducts(cached));
        setUsingCachedProducts(true);
      }
    }
  }

  async function loadCategories() {
    try {
      const response = await api.get("/pos/categories");
      const cats = Array.isArray(response.data) ? response.data : [];
      await replaceLocalCache(offlineDb.categories, cats);
      setCategories(cats);
      setUsingCachedCategories(false);
      return cats;
    } catch (error) {
      console.error("Error loading categories:", error);
      if (isNetworkOrTimeoutError(error)) {
        const cached = await readLocalCache(offlineDb.categories);
        setCategories(cached);
        setUsingCachedCategories(true);
        return cached;
      }
      return [];
    }
  }

  async function loadPosCategories() {
    try {
      const response = await api.get('/pos/categories');
      setPosCategories(response.data || []);
    } catch (error) {
      console.error('Error loading pos categories:', error);
    }
  }

  async function loadAreas() {
    try {
      const response = await api.get('/pos/areas');
      const areasData = response.data || [];
      await replaceLocalCache(offlineDb.areas, areasData);
      setAreas(areasData);
      setUsingCachedAreas(false);
    } catch (error) {
      console.error('Error loading areas:', error);
      if (isNetworkOrTimeoutError(error)) {
        const cached = await readLocalCache(offlineDb.areas);
        setAreas(cached);
        setUsingCachedAreas(true);
      }
    }
  }

  async function loadOpenShift(cajeroId: string) {
    try {
      const response = await api.get("/pos/shifts/open", {
        params: {
          cajero: cajeroId,
          sucursalId: user?.branchId || branchId,
        },
      });
      // Verificación redundante de dueño del turno — el backend (findOpenShift) ya filtra
      // por cajero desde julio 2026, pero se agrega la misma comprobación que ya tiene
      // CorteCajaLite.tsx como red de seguridad ante cualquier caso futuro donde cajeroId
      // llegue vacío o incorrecto a esta función.
      const isOwnShift = response.data && response.data.id && response.data.cajero === cajeroId;
      const shiftData = isOwnShift ? {
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
      } : null;
      setShift(shiftData);
      return shiftData;
    } catch (error) {
      console.error("Error loading open shift:", error);
      return null;
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

  // Al cerrar una ventana de caja se descartan sus errores (no deben reaparecer al volver a abrirla).
  useEffect(() => { if (!showOpenShiftModal) { setErrApertura(null); setErrAperturaFondo(null); } }, [showOpenShiftModal]);
  useEffect(() => { if (!showWithdrawalModal && !showDepositModal) { setErrMovimiento(null); setErrMovimientoCampos({}); } }, [showWithdrawalModal, showDepositModal]);
  useEffect(() => { if (!showPrecutModal) setErrPrecorte(null); }, [showPrecutModal]);
  useEffect(() => { if (!showCloseShiftModal) setErrCierre(null); }, [showCloseShiftModal]);

  useEffect(() => {
    if (!(showCourtesyModal || showDiscountModal) || puedeCortesia) return;
    let vivo = true;
    api.get("/pos/autorizaciones/autorizadores").then((r) => { if (vivo) setAutorizadores(Array.isArray(r.data) ? r.data : []); }).catch(() => { if (vivo) setAutorizadores([]); });
    return () => { vivo = false; };
  }, [showCourtesyModal, showDiscountModal, puedeCortesia]);
  useEffect(() => { if (!showProductModal) setErrProducto(null); }, [showProductModal]);
  useEffect(() => { if (!showDiscountModal) { setErrDescuento(null); setAutorizadorClave(""); } }, [showDiscountModal]);
  useEffect(() => { if (!showCourtesyModal) { setErrCortesia(null); setAutorizadorClave(""); } }, [showCourtesyModal]);
  useEffect(() => { if (!showLoginScreen) setErrLogin(null); }, [showLoginScreen]);
  useEffect(() => {
    if (!showLoginScreen) return;
    let vivo = true;
    setCajerosLista(null);
    api.get("/pos/cashiers/lista").then((r) => { if (vivo) setCajerosLista(Array.isArray(r.data) ? r.data : []); }).catch(() => { if (vivo) setCajerosLista([]); });
    return () => { vivo = false; };
  }, [showLoginScreen]);

  async function openShift() {
    setErrApertura(null);
    if (!initialFund || Number(initialFund) <= 0) {
      setErrAperturaFondo("El fondo de caja es obligatorio");
      return;
    }
    setErrAperturaFondo(null);
    const body = {
      cajero: selectedCashier || user?.id,
      sucursalId: user?.branchId || branchId,
      fondoInicial: Number(initialFund) || 0,
      notas: shiftNotes,
    };
    try {
      const response = await api.post("/pos/shifts", body);
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
      if (!isNetworkOrTimeoutError(error)) {
        setErrApertura("No se pudo abrir el turno. Revisa los datos e inténtalo de nuevo.");
        return;
      }
      // Fase C2: sin red/timeout — encolar y abrir el turno de forma optimista con un
      // id local. Fase D (localId dentro del payload) lo reemplaza por el id real del
      // servidor al sincronizar — por eso se genera UNA sola vez y se reutiliza en
      // ambos lados (el payload encolado y el shift optimista en pantalla).
      const clientTimestamp = new Date().toISOString();
      const localId = generateLocalId();
      await enqueueOperation('OPEN_SHIFT', { ...body, clientTimestamp, localId }, clientTimestamp);
      setShowOpenShiftModal(false);
      setInitialFund("");
      setShiftNotes("");
      setShift({
        id: localId,
        fondoInicial: body.fondoInicial,
        fecha: clientTimestamp,
        horaApertura: new Date(clientTimestamp).toTimeString().slice(0, 8),
        totalVentas: 0,
        totalEfectivo: 0,
        totalTarjeta: 0,
        totalTransferencia: 0,
        totalCortesia: 0,
        totalDevoluciones: 0,
        totalRetiros: 0,
        totalDepositos: 0,
        status: 'ABIERTO',
        precorteGuardado: false,
        precorteDeclaracion: null,
      });
    }
  }

  async function handleLogin() {
    setErrLogin(null);
    if (cashierPin.length < 4) {
      setErrLogin("PIN debe tener al menos 4 dígitos");
      return;
    }
    try {
      // Auditoría de seguridad (GoodsHabits, diagnóstico sesión POS): tenantId en el body
      // como respaldo — el backend ya prioriza req.user?.tenantId (la cookie de sesión que
      // ya existe en este punto, server-verificada), pero mandarlo explícito no cuesta nada
      // y cubre el caso borde de que esa resolución fallara. Confirmado con curl real que
      // sin ninguno de los dos, loginWithNip() buscaba el NIP entre todos los tenants.
      // Con un cajero elegido de la lista, el NIP se verifica SOLO contra él (y los intentos fallidos se cuentan por usuario).
      const elegido = cajerosLista?.some((c) => c.id === selectedCashier) ? selectedCashier : undefined;
      const response = await api.post("/pos/cashiers/nip", { nip: cashierPin, tenantId, ...(elegido ? { userId: elegido } : {}) });
      const cajeroId = response.data?.user?.id || '';
      setSelectedCashier(cajeroId);
      setCajeroNip({ id: cajeroId, nombre: response.data?.user?.name || response.data?.user?.email || "Usuario" });
      setNipSessionActive(true);
      setShowLoginScreen(false);
      setCashierPin("");
      const openShift = await loadOpenShift(cajeroId);
      if (!openShift) {
        setShowOpenShiftModal(true);
      }
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setErrLogin(status === 400 ? motivoDeRechazo(e) : status === 429 ? motivoDeRechazo(e) : "PIN incorrecto o cajero no autorizado");
    }
  }

  async function closeShift() {
    if (!shift) return;

    // Fase C2: bloqueo 100% local — si hay ventas de este turno todavía sin
    // sincronizar, ni siquiera se intenta la petición. closeShift recalcula los
    // totales desde las ventas ya guardadas en el servidor; cerrar con ventas
    // pendientes dejaría el corte con datos incompletos, sin ningún error visible.
    setErrCierre(null);
    const pendingSales = await getPendingSalesForShift(shift.id);
    if (pendingSales.length > 0) {
      setErrCierre(`Tienes ${pendingSales.length} venta(s) pendientes de guardar. Espera a tener señal para cerrar el turno.`);
      return;
    }

    const declaracion = shift.precorteDeclaracion || {};
    const body = {
      totalVentas: shift.totalVentas,
      totalEfectivo: shift.totalEfectivo || 0,
      totalTarjeta: shift.totalTarjeta || 0,
      totalTransferencia: shift.totalTransferencia || 0,
      totalCortesia: shift.totalCortesia || 0,
      totalDevoluciones: shift.totalDevoluciones || 0,
      totalRetiros: shift.totalRetiros || 0,
      totalDepositos: shift.totalDepositos || 0,
      efectivoContado: Number(declaracion.efectivoContado) || 0,
    };
    try {
      await api.put(`/pos/shifts/${shift.id}/close`, body);
      setShift(null);
      setSelectedCashier('');
      setNipSessionActive(false);
      setShowCloseShiftModal(false);
      setShowLoginScreen(true);
      void avisar({ tipo: "ok", mensaje: "Turno cerrado exitosamente" });
    } catch (error) {
      console.error("Error closing shift:", error);
      if (!isNetworkOrTimeoutError(error)) {
        setErrCierre("No se pudo cerrar el turno. Inténtalo de nuevo; si persiste, avisa a soporte.");
        return;
      }
      const clientTimestamp = new Date().toISOString();
      await enqueueOperation('CLOSE_SHIFT', { shiftId: shift.id, ...body, clientTimestamp }, clientTimestamp);
      setShift(null);
      setSelectedCashier('');
      setNipSessionActive(false);
      setShowCloseShiftModal(false);
      setShowLoginScreen(true);
      void avisar({ tipo: "aviso", mensaje: "Turno cerrado (pendiente de sincronizar) — se completará cuando haya conexión." });
    }
  }

  async function handleWithdrawal() {
    setErrMovimiento(null);
    const faltan = {
      monto: withdrawalAmount ? undefined : "Escribe el monto",
      autorizadoPor: withdrawalAuthorizedBy ? undefined : "Elige quién autoriza",
      concepto: withdrawalReason ? undefined : "Escribe el motivo",
    };
    if (!shift || faltan.monto || faltan.autorizadoPor || faltan.concepto) {
      setErrMovimientoCampos(faltan);
      return;
    }
    setErrMovimientoCampos({});
    const body = {
      monto: Number(withdrawalAmount),
      motivo: withdrawalReason,
      autorizadoPor: withdrawalAuthorizedBy,
    };
    try {
      await api.post(`/pos/shifts/${shift.id}/withdrawal`, body);
      setShowWithdrawalModal(false);
      setWithdrawalAmount("");
      setWithdrawalReason("");
      setWithdrawalAuthorizedBy("");
      loadOpenShift(selectedCashier);
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      if (!isNetworkOrTimeoutError(error)) {
        setErrMovimiento("No se pudo registrar el retiro. Revisa los datos e inténtalo de nuevo.");
        return;
      }
      // Fase C2: totales del turno quedan congelados hasta que sincronice de verdad
      // (mismo criterio que stock/ventas) — no se recalcula ni se estima localmente.
      const clientTimestamp = new Date().toISOString();
      await enqueueOperation('WITHDRAWAL', { shiftId: shift.id, ...body, clientTimestamp }, clientTimestamp);
      setShowWithdrawalModal(false);
      setWithdrawalAmount("");
      setWithdrawalReason("");
      setWithdrawalAuthorizedBy("");
    }
  }

  async function handleDeposit() {
    setErrMovimiento(null);
    const faltan = {
      monto: depositAmount ? undefined : "Escribe el monto",
      autorizadoPor: depositAuthorizedBy ? undefined : "Elige quién autoriza",
      concepto: depositOrigin ? undefined : "Escribe el origen",
    };
    if (!shift || faltan.monto || faltan.autorizadoPor || faltan.concepto) {
      setErrMovimientoCampos(faltan);
      return;
    }
    setErrMovimientoCampos({});
    const body = {
      monto: Number(depositAmount),
      origen: depositOrigin,
      autorizadoPor: depositAuthorizedBy,
    };
    try {
      await api.post(`/pos/shifts/${shift.id}/deposit`, body);
      setShowDepositModal(false);
      setDepositAmount("");
      setDepositOrigin("");
      setDepositAuthorizedBy("");
      loadOpenShift(selectedCashier);
    } catch (error) {
      console.error("Error processing deposit:", error);
      if (!isNetworkOrTimeoutError(error)) {
        setErrMovimiento("No se pudo registrar el depósito. Revisa los datos e inténtalo de nuevo.");
        return;
      }
      // Fase C2: mismo criterio — totales congelados hasta sincronización real.
      const clientTimestamp = new Date().toISOString();
      await enqueueOperation('DEPOSIT', { shiftId: shift.id, ...body, clientTimestamp }, clientTimestamp);
      setShowDepositModal(false);
      setDepositAmount("");
      setDepositOrigin("");
      setDepositAuthorizedBy("");
    }
  }

  async function handlePrecut() {
    if (!shift) return;
    setErrPrecorte(null);
    const body = {
      efectivoContado: calculateTotalCash(),
      efectivoDenominaciones: cashCounts,
      debitoDeclarado: Number(debitoDeclarado) || 0,
      creditoDeclarado: Number(creditoDeclarado) || 0,
      transferenciaDeclarada: Number(transferenciaDeclarada) || 0,
      valesDeclarados: Number(valesDeclarados) || 0,
    };
    try {
      await api.post(`/pos/shifts/${shift.id}/precut`, body);
      setShowPrecutModal(false);
      // Update local shift state to mark precorte as saved
      setShift(prev => prev ? {
        ...prev,
        precorteGuardado: true,
        precorteDeclaracion: { ...body },
      } : prev);
      // Reset precorte form state
      setCashCounts({});
      setDebitoDeclarado("");
      setCreditoDeclarado("");
      setTransferenciaDeclarada("");
      setValesDeclarados("");
      void avisar({ tipo: "ok", mensaje: "Precorte guardado correctamente" });
    } catch (error) {
      console.error("Error saving precut:", error);
      if (!isNetworkOrTimeoutError(error)) {
        setErrPrecorte("No se pudo guardar el precorte. Revisa los montos e inténtalo de nuevo.");
        return;
      }
      // Fase C2: NO marcamos precorteGuardado=true localmente (decisión (a) — congelado
      // hasta sync real). El botón "Cerrar turno" seguirá deshabilitado hasta entonces,
      // mismo comportamiento que ya existe hoy para "todavía no hice precorte".
      const clientTimestamp = new Date().toISOString();
      await enqueueOperation('PRECUT', { shiftId: shift.id, ...body, clientTimestamp }, clientTimestamp);
      setShowPrecutModal(false);
      setCashCounts({});
      setDebitoDeclarado("");
      setCreditoDeclarado("");
      setTransferenciaDeclarada("");
      setValesDeclarados("");
      void avisar({ tipo: "aviso", mensaje: "Precorte guardado (pendiente de sincronizar) — se completará cuando haya conexión." });
    }
  }

  function cerrarCobro() {
    setShowPaymentModal(false);
    setSelectedPaymentForm(null);
    setPaymentAmount("");
    setCardLast4("");
    setCardBank("");
    setSpeiKey("");
    setCourtesyReason("");
    setAutorizadorId("");
  }

  function calculateTotalCash() {
    return totalContado(cashCounts);
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
          descuento: socioPOS?.descuentoPct ?? 0,
          subtotal: price * (1 - (socioPOS?.descuentoPct ?? 0) / 100),
          tasaIva: product.tasaIva ?? null,
        },
      ]);
    }
  }

  async function buscarSocioPOS() {
    const n = socioNumero.trim();
    if (!n) return;
    setSocioError("");
    try {
      const r = await api.get(`/membresias/socios/numero/${encodeURIComponent(n)}`);
      const d = r.data;
      if (d.estado !== "ACTIVO") {
        setSocioError("El socio está dado de baja.");
        return;
      }
      const pct = Number(d.descuentoPct) || 0;
      setSocioPOS({ id: d.id, numeroSocio: d.numeroSocio, nombre: `${d.nombre} ${d.apellidos ?? ""}`.trim(), descuentoPct: pct });
      if (pct > 0) {
        setTicket((t) => t.map((it) => ({ ...it, descuento: Math.max(Number(it.descuento) || 0, pct) })));
      }
    } catch (error) {
      const e = error as ApiErrorLike;
      const msg = e?.response?.data?.message;
      setSocioError(Array.isArray(msg) ? msg.join(". ") : msg || "No se encontró al socio.");
    }
  }

  function quitarSocioPOS() {
    setSocioPOS(null);
    setSocioNumero("");
    setSocioError("");
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

  // Desglose del ticket con la tasa de cada producto (o la del negocio) y con precios con IVA incluido o sin él. Es la misma
  // cuenta del servidor (config/iva.config.ts); el servidor vuelve a calcularla al cobrar y es el que manda.
  const ivaTicket = useMemo(() => desgloseTicket(ticket, ivaCfg), [ticket, ivaCfg]);
  const subtotalMemo = ivaTicket.subtotal;
  const totalDiscountMemo = ivaTicket.descuento;
  const taxesMemo = ivaTicket.impuestos;
  const totalMemo = ivaTicket.total;
  // Desglose del recibo: con la tasa con que se vendió cada línea (el servidor la guarda en la venta).
  const reciboIva = useMemo(() => desgloseTicket(currentSale?.items ?? [], ivaCfg), [currentSale, ivaCfg]);

  const totalCoveredMemo = useMemo(() => paymentForms.reduce((sum, pf) => sum + pf.monto, 0), [paymentForms]);

  const pendingMemo = useMemo(() => totalMemo - totalCoveredMemo, [totalMemo, totalCoveredMemo]);

  const changeMemo = useMemo(() => {
    const cashPayment = paymentForms.find(pf => pf.forma === "EFECTIVO");
    if (!cashPayment) return 0;
    return cashPayment.monto - totalMemo;
  }, [paymentForms, totalMemo]);

  function getSubtotal() { return subtotalMemo; }
  function getTotalDiscount() { return totalDiscountMemo; }
  function getTaxes() { return taxesMemo; }
  function getTotal() { return totalMemo; }
  function getTotalCovered() { return totalCoveredMemo; }
  function getPending() { return pendingMemo; }
  function getChange() { return changeMemo; }

  function abrirCobro() {
    if (ticket.length > 0) {
      setCardValidationError("");
      setShowPaymentModal(true);
      setPaymentForms([]);
    }
  }

  function addPaymentForm(forma: "EFECTIVO" | "TARJETA" | "DEBITO" | "CREDITO" | "TRANSFERENCIA" | "CORTESIA", monto?: number, ultimos4Digitos?: string) {
    const newForm: PaymentForm = {
      id: Date.now().toString(),
      forma,
      monto: monto || (forma === "CORTESIA" ? getTotal() : getPending()),
      ...(esFormaTarjeta(forma) && ultimos4Digitos ? { ultimos4Digitos } : {}),
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

  // Autorización de un gerente/admin para la cortesía y para el descuento que pasa del límite del rol. El servidor decide todo (rol,
  // tope, motivo, contraseña, vigencia, un solo uso); aquí solo se pide y se manda el token junto con la venta.
  // Descuento por ítem, en %, que produciría el descuento que se está pidiendo (mismo cálculo que applyGlobalDiscount).
  function descuentoPedidoPct(): number {
    const objetivo = selectAllProducts ? ticket : ticket.filter((t) => selectedProductIds.has(t.productoId));
    return calcularDescuentoPct(discountType, Number(customDiscountValue) || Number(discountPercent), objetivo);
  }
  const topeDescuentoRol = topeDescuento(user?.roleCode);
  const descuentoRequiereAutorizacion = descuentoPedidoPct() > topeDescuentoRol;

  async function pedirAutorizacion(
    nuevoTicket: TicketItem[],
    tipo: "CORTESIA" | "DESCUENTO",
    motivo: string,
    mostrarError: (m: string) => void,
    idBase: "cortesia" | "descuento",
  ): Promise<boolean> {
    if (!autorizadorId || !autorizadorClave) {
      mostrarError("Elige quién autoriza y escribe su contraseña.");
      return false;
    }
    setAutorizando(true);
    try {
      const r = await api.post("/pos/autorizaciones", {
        tipo,
        motivo,
        autorizadorId,
        contrasena: autorizadorClave,
        items: nuevoTicket.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad, descuento: i.descuento })),
      });
      setAutorizacionPOS({
        tipo,
        motivo,
        token: r.data.token,
        firma: firmaTicket(nuevoTicket),
        vence: new Date(r.data.expiraEn).getTime(),
        autorizadoPor: r.data.autorizadoPor?.nombre || r.data.autorizadoPor?.email,
      });
      return true;
    } catch (e) {
      mostrarError(motivoDeRechazo(e));
      // La contraseña se borra tras cada intento: el foco vuelve a su campo para reintentar sin tocar el ratón.
      setTimeout(() => document.getElementById(idBase + "-contrasena")?.focus(), 0);
      return false;
    } finally {
      setAutorizando(false);
      setAutorizadorClave("");
    }
  }

  async function applyGlobalDiscount() {
    setErrDescuento(null);
    if (ticket.length > 0 && discountReason) {
      const discount = Number(customDiscountValue) || Number(discountPercent);
      const targetIds = selectAllProducts ? new Set(ticket.map(t => t.productoId)) : selectedProductIds;

      const nuevoTicket = ticket.map((item) => {
        if (targetIds.has(item.productoId)) {
          if (discountType === 'percentage') {
            return {
              ...item,
              descuento: discount,
              subtotal: item.cantidad * Number(item.precioUnitario) * (1 - discount / 100),
            };
          }
          const discountAmount = discount;
          const newSubtotal = Math.max(0, item.cantidad * Number(item.precioUnitario) - discountAmount);
          return {
            ...item,
            descuento: (discountAmount / (item.cantidad * Number(item.precioUnitario))) * 100,
            subtotal: newSubtotal,
          };
        }
        return item;
      });

      // Por encima del límite del rol hace falta un gerente o administrador (el servidor lo vuelve a exigir). Si el ticket ya tiene una
      // cortesía, la autorización nueva sigue siendo de cortesía (cubre también el descuento) y conserva su motivo.
      if (descuentoRequiereAutorizacion) {
        const hayCortesia = nuevoTicket.some((i) => Number(i.descuento) >= 100);
        const ok = hayCortesia
          ? await pedirAutorizacion(nuevoTicket, "CORTESIA", autorizacionPOS?.motivo ?? "otro", setErrDescuento, "descuento")
          : await pedirAutorizacion(nuevoTicket, "DESCUENTO", discountReason, setErrDescuento, "descuento");
        if (!ok) return;
      }
      setTicket(nuevoTicket);
      setShowDiscountModal(false);
      setDiscountPercent("");
      setCustomDiscountValue("");
      setDiscountReason("");
      setSelectedProductIds(new Set());
      setSelectAllProducts(true);
      setAutorizadorId("");
    } else {
      setErrDescuento("Debe ingresar un motivo para el descuento");
    }
  }

  async function applyCourtesy() {
    setErrCortesia(null);
    if (ticket.length > 0 && courtesyReason) {
      const targetIds = selectAllCourtesy ? new Set(ticket.map(t => t.productoId)) : courtesyProductIds;
      const nuevoTicket = ticket.map((item) =>
        targetIds.has(item.productoId) ? { ...item, descuento: 100, subtotal: 0, esCortesia: true } : item,
      );
      if (puedeCortesia) {
        // Gerente o administrador: autoriza con su propia sesión; el motivo queda para la venta y la bitácora.
        setAutorizacionPOS({ tipo: "CORTESIA", motivo: courtesyReason, firma: firmaTicket(nuevoTicket) });
      } else if (!(await pedirAutorizacion(nuevoTicket, "CORTESIA", courtesyReason, setErrCortesia, "cortesia"))) {
        return;
      }
      setTicket(nuevoTicket);
      setShowCourtesyModal(false);
      setCourtesyReason("");
      setAutorizadorId("");
      setCourtesyProductIds(new Set());
      setSelectAllCourtesy(true);
    } else {
      setErrCortesia("Elige el motivo de la cortesía.");
    }
  }

  function validateCardPayments(): boolean {
    setCardValidationError("");
    // El servidor exige exactamente 4 dígitos en DEBITO, CREDITO y TARJETA: el cobro no sale sin ellos.
    for (const card of paymentForms.filter(pf => esFormaTarjeta(pf.forma))) {
      if (!ultimos4Validos(card.ultimos4Digitos)) {
        setCardValidationError("Ingresa los 4 últimos dígitos de la tarjeta");
        return false;
      }
    }
    return true;
  }

  async function processPayment() {
    if (ticket.length === 0) {
      setCardValidationError("El ticket está vacío");
      return;
    }
    if (!shift) {
      setCardValidationError("No hay turno abierto");
      return;
    }
    if (getTotalCovered() < getTotal()) {
      setCardValidationError("El monto cubierto es insuficiente");
      return;
    }
    if (!validateCardPayments()) {
      return;
    }

    // Cortesías y descuentos sobre el límite del rol: el servidor pide la autorización de un gerente/admin (token de un solo uso, 2 min,
    // ligado a estas líneas). Un gerente o administrador no la necesita: autoriza con su sesión, pero la cortesía lleva siempre su motivo.
    const hayCortesiaEnTicket = ticket.some((i) => Number(i.descuento) >= 100);
    let formasPagoVenta: PaymentForm[] = paymentForms;
    if (formasPagoVenta.length === 0 && getTotal() === 0 && hayCortesiaEnTicket) {
      // Un ticket todo en cortesía no tiene nada que cobrar: se registra como forma CORTESIA por $0 (si no, el servidor lo dejaría abierto).
      formasPagoVenta = [{ id: "cortesia-total", forma: "CORTESIA", monto: 0 }];
    }
    const motivoCortesia = courtesyReason || autorizacionPOS?.motivo || "";
    if (formasPagoVenta.some((pf) => pf.forma === "CORTESIA") && !motivoCortesia) {
      setCardValidationError("Elige el motivo de la cortesía.");
      return;
    }
    formasPagoVenta = formasPagoVenta.map((pf) => (pf.forma === "CORTESIA" ? { ...pf, motivo: pf.motivo || motivoCortesia } : pf));
    const necesitaToken = ticketRequiereAutorizacion({ puedeCortesia, hayFormaCortesia: formasPagoVenta.some((pf) => pf.forma === "CORTESIA"), items: ticket, rol: user?.roleCode });
    if (necesitaToken) {
      const aut = autorizacionPOS;
      if (!aut?.token || aut.firma !== firmaTicket(ticket)) {
        setCardValidationError("El ticket cambió después de la autorización. Vuelve a aplicar el descuento o la cortesía con la autorización de un gerente.");
        return;
      }
      if (aut.vence && aut.vence <= Date.now()) {
        setCardValidationError("La autorización venció (dura 2 minutos). Vuelve a aplicar el descuento o la cortesía con la autorización de un gerente.");
        return;
      }
    }

    const saleData = {
      items: ticket,
      subtotal: getSubtotal(),
      descuento: getTotalDiscount(),
      impuestos: getTaxes(),
      total: getTotal(),
      formasPago: formasPagoVenta,
      cajero: selectedCashier || user?.id,
      turnoId: shift.id,
      sucursalId: user?.branchId || branchId,
      tableId: selectedTableForPOS?.id || undefined,
      ...(socioPOS ? { socioId: socioPOS.id } : {}),
      ...(necesitaToken && autorizacionPOS?.token ? { autorizacion: { token: autorizacionPOS.token } } : {}),
    };

    try {
      const response = await api.post("/pos/sales", saleData);
      const sale = response.data;

      paymentFailureCountRef.current = 0;
      setAutorizacionPOS(null);
      setCurrentSale(sale);
      setShowReceipt(true);
      setShowPaymentModal(false);
      setTicket([]);
      setPaymentForms([]);
      setSelectedTableForPOS(null);
      quitarSocioPOS();
      loadSalesHistory();
    } catch (error) {
      console.error("Error processing payment:", error);

      // Una venta ligada a una mesa es una cuenta de mesa (el backend estampa mesero y turno y revisa saldo/roles):
      // nunca entra a la cola offline, se rechaza con el mensaje de conexión.
      if (saleData.tableId && isNetworkOrTimeoutError(error)) {
        setCardValidationError("Sin conexión: las cuentas de mesa no se pueden cobrar sin internet. Reintenta cuando vuelva la conexión.");
        return;
      }

      // Una cortesía o un descuento autorizado necesita internet: el token vence en 2 minutos y no se puede encolar.
      if (saleData.autorizacion && isNetworkOrTimeoutError(error)) {
        setCardValidationError("Sin conexión: una cortesía o un descuento con autorización necesita internet. Reintenta cuando vuelva la conexión.");
        return;
      }

      if (isNetworkOrTimeoutError(error)) {
        // Fase C2: sin red/timeout — encolar la venta y mostrar el ticket como si se
        // hubiera cobrado, para no dejar al cajero varado. El caché de C1 (stock) NO
        // se toca: sigue mostrando el último conteo confirmado, no un descuento
        // adelantado que podría descuadrar si la venta termina fallando de verdad.
        const clientTimestamp = new Date().toISOString();
        const folio = generateOfflineSaleFolio(clientTimestamp);
        await enqueueOperation('SALE', { ...saleData, folio, clientTimestamp }, clientTimestamp);

        const optimisticSale: Sale = {
          id: generateLocalId(),
          folio,
          fecha: clientTimestamp,
          hora: new Date(clientTimestamp).toTimeString().slice(0, 8),
          items: ticket,
          total: saleData.total,
          subtotal: saleData.subtotal,
          descuento: saleData.descuento,
          impuestos: saleData.impuestos,
          formaPago: paymentForms[0]?.forma || 'EFECTIVO',
          formasPago: paymentForms,
          status: 'PAGADA',
        };

        paymentFailureCountRef.current = 0;
        setCurrentSale(optimisticSale);
        setShowReceipt(true);
        setShowPaymentModal(false);
        setTicket([]);
        setPaymentForms([]);
        setSelectedTableForPOS(null);
        quitarSocioPOS();
        return;
      }

      // El servidor rechazó el cobro (4xx): se muestra su motivo real en el modal y NO se reintenta nada solo; el cajero
      // corrige (dígitos, forma de pago, monto) y vuelve a confirmar. Un 5xx sí se puede reintentar a mano, sin cobrar dos veces:
      // la venta no queda guardada si el servidor falla.
      const motivo = motivoDeRechazo(error);
      if (!esReintentable(error)) {
        setCardValidationError(`El servidor rechazó el cobro: ${motivo}`);
        return;
      }
      paymentFailureCountRef.current += 1;
      setCardValidationError(`El servidor tuvo un problema (${motivo}). Reintenta el cobro; no se registró ninguna venta.`);
      if (paymentFailureCountRef.current >= 2) {
        void avisar({ tipo: "error", titulo: "Cobro no registrado", mensaje: "No se pudo procesar la venta después de varios intentos. Reporta esto a soporte antes de continuar — no se realizó ningún cobro." });
      }
    }
  }

  function devolverVenta(saleId: string) {
    setReturnSaleId(saleId);
    setReturnSaleReason("");
    setReturnSaleError("");
    setShowReturnSaleModal(true);
  }

  // Devolución total de una venta cobrada (POST /pos/sales/:id/return, solo el motivo): el backend
  // devuelve el stock, registra el reembolso en el turno abierto y decide quién puede hacerla según
  // la política del negocio. Un rechazo (403 política, 400 sin turno abierto / ya devuelta...) se
  // muestra con el mensaje real del backend.
  async function confirmReturnSale() {
    if (!returnSaleId || !returnSaleReason.trim() || returningSale) return;
    setReturningSale(true);
    setReturnSaleError("");
    try {
      // turnoId: la devolución se atribuye al turno de ESTA caja (si el POS tiene uno abierto en
      // estado); sin él, el backend usa el turno abierto más reciente de la sucursal.
      await api.post(`/pos/sales/${returnSaleId}/return`, {
        motivo: returnSaleReason.trim(),
        ...(shift?.id ? { turnoId: shift.id } : {}),
      });
      setShowReturnSaleModal(false);
      setReturnSaleId(null);
      setReturnSaleReason("");
      loadSalesHistory();
    } catch (error) {
      console.error("Error returning sale:", error);
      const msg = (error as ApiErrorLike)?.response?.data?.message;
      setReturnSaleError(
        (Array.isArray(msg) ? msg.join(". ") : msg) || "No se pudo procesar la devolución. Intenta de nuevo.",
      );
    } finally {
      setReturningSale(false);
    }
  }

  // Política de devoluciones vigente y si este usuario puede devolver (solo para mostrar el botón).
  function loadPoliticaDevoluciones() {
    return api
      .get("/pos/sales/politica-devoluciones")
      .then((res) => {
        setPoliticaDevoluciones(res.data?.politicaDevoluciones === "CAJERO_LIBRE" ? "CAJERO_LIBRE" : "SOLO_GERENTE");
        setPuedeDevolver(res.data?.puedeDevolver === true);
      })
      .catch(() => setPuedeDevolver(false)); // sin dato, el botón se oculta; el backend sigue decidiendo
  }

  // Solo ADMIN (el backend también lo exige): cambia la política del negocio.
  async function savePoliticaDevoluciones(value: "SOLO_GERENTE" | "CAJERO_LIBRE") {
    const tid = localStorage.getItem("tenant_id");
    if (!tid) return;
    setSavingPolitica(true);
    setPoliticaGuardada(false);
    setPoliticaError("");
    try {
      await api.put(`/tenant-settings/${tid}/politica-devoluciones`, { politicaDevoluciones: value });
      await loadPoliticaDevoluciones();
      setPoliticaGuardada(true);
    } catch (error) {
      const msg = (error as ApiErrorLike)?.response?.data?.message;
      setPoliticaError((Array.isArray(msg) ? msg.join(". ") : msg) || "No se pudo guardar la política.");
    } finally {
      setSavingPolitica(false);
    }
  }

  // Capacidad mesas_cuenta_abierta (GET público de settings) y, si hay y eres ADMIN, las dos políticas de mesas.
  async function loadPoliticasMesas() {
    const tid = localStorage.getItem("tenant_id");
    if (!tid) return;
    try {
      const s = await api.get(`/tenant-settings/${tid}`);
      const habilitado = s.data?.posCapabilities?.mesas_cuenta_abierta === true;
      setMesasHabilitado(habilitado);
      if (!habilitado || user?.roleCode !== "ADMIN") return;
      const [c, d] = await Promise.all([
        api.get(`/tenant-settings/${tid}/politica-cobro`),
        api.get(`/tenant-settings/${tid}/politica-division-cuentas`),
      ]);
      setPoliticaCobro(c.data?.politicaCobro ?? "SOLO_CAJA");
      setPoliticaDivision(d.data?.politicaDivisionCuentas ?? "GERENTE_CAPITAN_CAJERO");
    } catch {
      setMesasHabilitado(false); // sin dato no se muestra; el backend sigue decidiendo
    }
  }

  async function savePoliticaMesas(campo: "politicaCobro" | "politicaDivisionCuentas", valor: string) {
    const tid = localStorage.getItem("tenant_id");
    if (!tid) return;
    setSavingMesasPol(true);
    setMesasPolMsg(null);
    try {
      const ruta = campo === "politicaCobro" ? "politica-cobro" : "politica-division-cuentas";
      const r = await api.put(`/tenant-settings/${tid}/${ruta}`, { [campo]: valor });
      if (campo === "politicaCobro") setPoliticaCobro(r.data.politicaCobro);
      else setPoliticaDivision(r.data.politicaDivisionCuentas);
      setMesasPolMsg({ ok: true, texto: "Guardado." });
    } catch (error) {
      const msg = (error as ApiErrorLike)?.response?.data?.message;
      setMesasPolMsg({ ok: false, texto: (Array.isArray(msg) ? msg.join(". ") : msg) || "No se pudo guardar la política." });
    } finally {
      setSavingMesasPol(false);
    }
  }

  useEffect(() => {
    if (authChecked && user) loadPoliticasMesas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, user?.roleCode]);

  useEffect(() => {
    if (authChecked && user) loadPoliticaDevoluciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, user?.roleCode]);

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
    const content = "nombre,categoria,precio,impuesto,descripcion,estacion\n";
    const content2 = "Hamburguesa Clásica,Comida,85.00,16,Hamburguesa con carne de res,COCINA\n";
    const content3 = "Refresco Cola,Bebidas,25.00,16,Refresco de cola 355ml,BARRA\n";
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
        
        const response = await api.post("/pos/products/import", { productos: data, branchId: user?.branchId || branchId || undefined });
        setPosCsvImportResult(response.data);
        loadProducts(categories);
      };
      reader.readAsText(posCsvFile);
    } catch (err: any) {
      void avisar({ tipo: "error", mensaje: err.response?.data?.message || "Error al importar productos" });
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
    <div className="min-h-screen !bg-bg !text-content-1">
      {/* HEADER - Tabs */}
      <div className="h-16 border-b !border-line flex items-center px-4 !bg-nav">
        <h1 className="text-xl font-bold mr-8">POS</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("terminal")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "terminal"
                ? "!bg-btn !text-on-solid"
                : "!bg-surface-1 !text-content-3 hover:!bg-surface-2"
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
                    ? "!bg-btn !text-on-solid"
                    : "!bg-surface-1 !text-content-3 hover:!bg-surface-2"
                }`}
              >
                Productos
              </button>
              <button
                onClick={() => setActiveTab("categorias")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "categorias"
                    ? "!bg-btn !text-on-solid"
                    : "!bg-surface-1 !text-content-3 hover:!bg-surface-2"
                }`}
              >
                Categorías
              </button>
              {mesasHabilitado && (
                <button
                  onClick={() => navigate("/mesas")}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors !bg-surface-1 !text-content-3 hover:!bg-surface-2"
                >
                  Mesas ↗
                </button>
              )}
              <button
                onClick={() => setActiveTab("turnos")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "turnos"
                    ? "!bg-btn !text-on-solid"
                    : "!bg-surface-1 !text-content-3 hover:!bg-surface-2"
                }`}
              >
                Turnos
              </button>
              <button
                onClick={() => setActiveTab("parametros")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "parametros"
                    ? "!bg-btn !text-on-solid"
                    : "!bg-surface-1 !text-content-3 hover:!bg-surface-2"
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
          <header className="h-16 border-b !border-line flex items-center justify-between px-4 !bg-surface-1">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (shift && salesHistory.length > 0) {
                    setShowExitConfirmModal(true);
                  } else {
                    if (esCajeroDeSesion) {
                      logout();
                      navigate('/');
                    } else {
                      navigate('/dashboard');
                    }
                  }
                }}
                className="text-sm !text-content-3 hover:text-content-1 flex items-center gap-1"
              >
                ← Salir
              </button>
              <div className="text-sm !text-content-3">
                Cajero: <span className="!text-content-1">{nombreCajero(selectedCashier || user?.id)}</span>
              </div>
              {shift && (
                <div className="text-sm !text-content-3">
                  Turno: <span className="!text-ok">Abierto</span> ({shift.horaApertura || new Date(shift.fecha).toLocaleTimeString('es-MX', { timeZone: 'America/Tijuana' })})
                </div>
              )}
              {(usingCachedCategories || usingCachedProducts || usingCachedAreas) && (
                <div
                  className="text-xs !text-warn border border-tono-yellow-700 rounded px-2 py-1"
                  title="No se pudo conectar al servidor — mostrando la última copia guardada en este dispositivo, puede no estar actualizada."
                >
                  ⚠ Datos sin conexión
                </div>
              )}
              {pendingOpsCount > 0 && (
                <div
                  className="text-xs text-tono-orange-400 border border-tono-orange-700 rounded px-2 py-1"
                  title="Operaciones guardadas en este dispositivo que aún no se han enviado al servidor — se sincronizan solas cuando haya conexión."
                >
                  ⏳ {pendingOpsCount} pendiente{pendingOpsCount === 1 ? "" : "s"}
                </div>
              )}
              {failedOpsCount > 0 && (
                <div
                  className="text-xs !text-danger border border-tono-danger-700 rounded px-2 py-1"
                  title="El servidor rechazó estas operaciones (no es un problema de conexión) — necesitan revisión manual, no se van a reintentar solas."
                >
                  ✕ {failedOpsCount} necesita{failedOpsCount === 1 ? "" : "n"} revisión
                  {(user?.roleCode === "ADMIN" || user?.roleCode === "GERENTE") && (
                    <button className="ml-2 underline" onClick={() => navigate("/ventas-offline")}>Revisar</button>
                  )}
                </div>
              )}
              {showSyncedToast && (
                <div className="text-xs !text-ok border border-tono-ok-700 rounded px-2 py-1">
                  ✓ Todo sincronizado
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTema(true)}
                aria-label="Cambiar el tema de la pantalla"
                title="Tema"
                className="px-3 py-2 rounded text-sm !bg-surface-2 !text-content-1 border !border-line"
              >
                🎨 Tema
              </button>
              {!shift ? (
                <button
                  onClick={() => setShowOpenShiftModal(true)}
                  className="px-4 py-2 rounded !bg-ok-solid !text-on-solid text-sm hover:bg-tono-ok-700"
                >
                  Abrir Turno
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowWithdrawalModal(true)}
                    className="px-3 py-2 rounded bg-tono-yellow-600 !text-on-yellow text-sm hover:bg-tono-yellow-700"
                  >
                    💰 Retiro
                  </button>
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="px-3 py-2 rounded !bg-btn !text-on-solid text-sm hover:!bg-btn-hover"
                  >
                    💵 Depósito
                  </button>
                  <button
                    onClick={() => setShowPrecutModal(true)}
                    disabled={shift?.precorteGuardado}
                    className="px-3 py-2 rounded bg-tono-purple-600 !text-on-strong text-sm hover:bg-tono-purple-700 disabled:bg-tono-slate-700 disabled:text-tinta-3"
                  >
                    {shift?.precorteGuardado ? '✓ Precorte realizado' : '📊 Precorte'}
                  </button>
                  {shift?.precorteGuardado && (
                    <button
                      onClick={() => setShowChatPanel(true)}
                      className="px-3 py-2 rounded bg-tono-yellow-700 !text-on-strong text-sm hover:bg-tono-yellow-600"
                    >
                      💬 Chat Supervisor
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (!shift) return;
                      try {
                        const response = await api.get(`/pos/shifts/${shift.id}/summary`);
                        setShiftSummary(response.data);
                        setShowCloseShiftModal(true);
                      } catch (error) {
                        console.error("Error loading shift summary:", error);
                        void avisar({ tipo: "error", mensaje: "No se pudo cargar el resumen del turno. Inténtalo de nuevo." });
                      }
                    }}
                    disabled={!shift?.precorteGuardado}
                    className="px-4 py-2 rounded !bg-danger-solid !text-on-solid text-sm hover:bg-tono-danger-700 disabled:bg-tono-slate-700 disabled:text-tinta-3"
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
                className="px-4 py-2 rounded !bg-btn !text-on-solid text-sm hover:!bg-btn-hover"
              >
                Historial de Ventas
              </button>
            </div>
          </header>

          {showTema && <ModalTema onClose={() => setShowTema(false)} />}

          {/* RESTAURANT: tabla selector overlay */}
          {isRestaurant && shift && showTableSelect && (
            <div className="fixed inset-0 z-50 bg-scrim/80 flex flex-col overflow-auto p-4">
              <div className="flex items-center justify-between mb-4 max-w-5xl mx-auto w-full">
                <h2 className="text-lg font-semibold !text-content-1">Selecciona una mesa</h2>
                <button onClick={() => setShowTableSelect(false)} className="text-sm !text-content-3 hover:text-content-1">✕ Cancelar</button>
              </div>
              <div className="max-w-5xl mx-auto w-full">
                <TableLayout
                  tenantId={tenantId || ""}
                  branchId={branchId || ""}
                  onSelectTable={(tableId, tableNumber) => {
                    setSelectedTableForPOS({ id: tableId, numero: tableNumber });
                    setShowTableSelect(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* RESTAURANT: mesa indicator + button when shift open */}
          {isRestaurant && shift && (
            <div className="px-4 py-2 border-b !border-line flex items-center gap-3 !bg-nav">
              {selectedTableForPOS ? (
                <span className="text-sm !text-ok font-medium">Mesa {selectedTableForPOS.numero} seleccionada</span>
              ) : (
                <span className="text-sm !text-warn">Sin mesa seleccionada</span>
              )}
              <button
                onClick={() => setShowTableSelect(true)}
                className="text-xs px-3 py-1.5 rounded !bg-surface-2 !text-content-1 hover:!bg-surface-2"
              >
                {selectedTableForPOS ? "Cambiar mesa" : "Seleccionar mesa"}
              </button>
              {selectedTableForPOS && (
                <button onClick={() => setSelectedTableForPOS(null)} className="text-xs !text-danger hover:text-tono-danger-300">Liberar mesa</button>
              )}
            </div>
          )}

          {/* MAIN CONTENT - 2 ZONES */}
          <div className="flex-1 flex overflow-hidden">
            {/* ZONA IZQUIERDA - PRODUCTOS (75%) */}
            <div className="w-[75%] flex flex-col border-r !border-line">
              <div className="p-4 border-b !border-line space-y-3">
                <InputBusqueda
                  name="pos-buscar-producto"
                  placeholder="Buscar producto..."
                  aria-label="Buscar producto"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border !border-line !bg-surface-1 !text-content-1"
                />
                <p className="text-[11px] !text-content-3" aria-label="Atajos de teclado">
                  <kbd className="font-sans">F2</kbd> Buscar producto · <kbd className="font-sans">F4</kbd> Cobrar · <kbd className="font-sans">Esc</kbd> Limpiar búsqueda
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                      selectedCategory === "all"
                        ? "!bg-btn !text-on-solid"
                        : "!bg-surface-2 !text-content-2 hover:!bg-surface-2"
                    }`}
                  >
                    Todos
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                        selectedCategory === cat.name
                          ? "!bg-btn !text-on-solid"
                          : "!bg-surface-2 !text-content-2 hover:!bg-surface-2"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {filteredProducts.map((product) => {
                    // Auditoría de producto (GoodsHabits, Punto 1): stockPolicy la elige
                    // el tenant en PosConfigPage.tsx — bajo PERMITIR_NEGATIVO (default) el
                    // botón nunca se deshabilita, mismo comportamiento de siempre, el badge
                    // sigue siendo solo informativo. Bajo BLOQUEAR, coincide con lo que el
                    // backend igual va a rechazar (checkStockAvailability en sales.service.ts)
                    // — anticipa el problema antes del submit, no solo lo rechaza después.
                    // <= 0, no === 0: un tenant que cambie de PERMITIR_NEGATIVO a BLOQUEAR
                    // puede tener insumos que ya quedaron en déficit de antes — deben
                    // seguir bloqueados, no solo los que están en exactamente 0.
                    const isOutOfStock = product.stock !== null && product.stock !== undefined && product.stock <= 0;
                    const isBlocked = stockPolicy === 'BLOQUEAR' && isOutOfStock;
                    return (
                    <button
                      key={product.id}
                      onClick={() => !isBlocked && addToTicket(product)}
                      disabled={isBlocked}
                      className={`max-w-[120px] max-h-[120px] p-3 rounded-lg border text-left transition-colors flex flex-col relative ${
                        isBlocked
                          ? '!bg-nav !border-line opacity-40 grayscale cursor-not-allowed'
                          : '!bg-surface-1 hover:!bg-surface-2 !border-line'
                      }`}
                    >
                      <div className="w-full aspect-square !bg-surface-2 rounded mb-2 flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl">🛒</span>
                        )}
                      </div>
                      <p className="font-medium text-xs line-clamp-2 h-8 overflow-hidden">{product.name}</p>
                      <p className="!text-ok font-bold text-sm">${product.price.toFixed(2)}</p>
                      {product.stock !== null && product.stock !== undefined && (
                        <div className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          product.stock <= 0
                            ? '!bg-danger-solid !text-on-solid'
                            : product.stock <= (product.stockMinimo || 0)
                            ? 'bg-tono-yellow-600 !text-on-yellow'
                            : '!bg-ok-solid !text-on-solid'
                        }`}>
                          {product.stock <= 0 ? 'Agotado' : product.stock <= (product.stockMinimo || 0) ? `Quedan ${product.stock}` : product.stock}
                        </div>
                      )}
                    </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ZONA DERECHA - TICKET + COBRO (25%) */}
            <div className="w-[25%] h-full flex flex-col">
              {/* TICKET */}
              <div className="flex-1 flex flex-col border-b !border-line min-h-0">
                <div className="p-4 border-b !border-line flex-shrink-0">
                  <h2 className="text-lg font-semibold">Ticket Actual</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {ticket.length === 0 ? (
                    <p className="!text-content-3 text-center py-8">Ticket vacío</p>
                  ) : (
                    ticket.map((item) => (
                      <div key={item.productoId} className="p-3 rounded-lg !bg-surface-1 border !border-line">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium text-sm flex-1">{item.nombre}</p>
                          <button
                            onClick={() => removeFromTicket(item.productoId)}
                            className="!text-danger hover:text-tono-danger-300 text-xs ml-2"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.productoId, item.cantidad - 1)}
                              className="w-6 h-6 rounded !bg-surface-2 hover:!bg-surface-2 text-sm"
                            >
                              -
                            </button>
                            <span className="w-8 text-center">{item.cantidad}</span>
                            <button
                              onClick={() => updateQuantity(item.productoId, item.cantidad + 1)}
                              className="w-6 h-6 rounded !bg-surface-2 hover:!bg-surface-2 text-sm"
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

                {membresiasOn && (
                  <div className="px-4 py-2 border-t !border-line !bg-surface-1 text-sm flex-shrink-0">
                    {socioPOS ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="!text-ok">
                          Socio #{socioPOS.numeroSocio} · {socioPOS.nombre}
                          {socioPOS.descuentoPct > 0 ? ` · ${socioPOS.descuentoPct}% de beneficio` : " · sin beneficio vigente"}
                        </span>
                        <button className="!text-content-3 hover:text-content-1" onClick={quitarSocioPOS}>Quitar</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <InputBusqueda
                          name="pos-numero-socio"
                          value={socioNumero}
                          onChange={(e) => setSocioNumero(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && buscarSocioPOS()}
                          placeholder="N.º de socio (beneficio)"
                          className="flex-1 rounded !bg-nav px-3 py-1 !text-content-1"
                        />
                        <button className="rounded !bg-surface-2 px-3 py-1 hover:!bg-surface-2" onClick={buscarSocioPOS}>Aplicar</button>
                      </div>
                    )}
                    {socioError && <div className="mt-1 text-xs !text-danger">{socioError}</div>}
                  </div>
                )}
                <div className="p-4 border-t !border-line space-y-2 !bg-surface-1 flex-shrink-0">
                  <div className="flex justify-between text-sm">
                    <span className="!text-content-3">Subtotal</span>
                    <span>${getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="!text-content-3">Descuento</span>
                    <span className="!text-danger">-${getTotalDiscount().toFixed(2)}</span>
                  </div>
                  {lineasDeIva(ivaTicket).length === 0 ? (
                    <div className="flex justify-between text-sm">
                      <span className="!text-content-3">{etiquetaIvaUnica(ivaTicket, ivaCfg)}</span>
                      <span>${getTaxes().toFixed(2)}</span>
                    </div>
                  ) : (
                    lineasDeIva(ivaTicket).map((l) => (
                      <div key={l.tasa} className="flex justify-between text-sm">
                        <span className="!text-content-3">{l.tasa === "EXENTO" ? "Exento (base)" : `IVA ${l.etiqueta}`}</span>
                        <span>${(l.tasa === "EXENTO" ? l.base : l.impuestos).toFixed(2)}</span>
                      </div>
                    ))
                  )}
                  {ivaCfg.preciosIncluyenIva && (
                    <div className="text-xs !text-content-3">Los precios incluyen IVA.</div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t !border-line">
                    <span>TOTAL</span>
                    <span className="!text-ok">${getTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* COBRO */}
              <div className="p-4 space-y-3 !bg-nav flex-shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDiscountModal(true)}
                    disabled={!ticket || ticket.length === 0}
                    className="flex-1 h-9 rounded-lg !bg-surface-2 !text-content-1 font-medium hover:!bg-surface-2 disabled:bg-tono-slate-800 disabled:text-tinta-3"
                  >
                    Descuento
                  </button>
                  <button
                    onClick={() => setShowCourtesyModal(true)}
                    disabled={!ticket || ticket.length === 0}
                    className="flex-1 h-9 rounded-lg bg-tono-yellow-600 !text-content-1 font-medium hover:bg-tono-yellow-700 disabled:bg-tono-slate-800 disabled:text-tinta-3"
                  >
                    Cortesía
                  </button>
                </div>

                <button
                  onClick={abrirCobro}
                  title="Cobrar (F4)"
                  disabled={!ticket || ticket.length === 0}
                  className="w-full py-4 rounded-lg !bg-ok-solid !text-on-solid font-bold text-xl hover:bg-tono-ok-700 disabled:bg-tono-slate-700 disabled:text-tinta-3"
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
                    tasaIva: "",
                    tipo: "SIMPLE",
                    recipeId: "",
                    insumoId: "",
                    activo: true
                  });
                  setShowProductModal(true);
                }}
                className="px-4 py-2 rounded !bg-btn !text-on-solid hover:!bg-btn-hover"
              >
                + Nuevo Producto
              </button>
              <button
                onClick={() => setPosProductImportModalOpen(true)}
                className="px-4 py-2 rounded !bg-surface-2 !text-content-1 hover:!bg-surface-2"
              >
                Importar Insumos
              </button>
            </div>
          </div>
          <div className="rounded-xl border !border-line !bg-nav overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="!bg-surface-1">
                <tr>
                  <th className="px-4 py-3 text-left text-sm">Código</th>
                  <th className="px-4 py-3 text-left text-sm">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm">Categoría</th>
                  <th className="px-4 py-3 text-right text-sm">Precio</th>
                  <th className="px-4 py-3 text-center text-sm">Status</th>
                  <th className="px-4 py-3 text-center text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tono-slate-800">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center !text-content-3">
                      No hay productos registrados
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-tono-slate-800/50">
                      <td className="px-4 py-3 text-sm">{product.id || "-"}</td>
                      <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-sm">{product.category || "-"}</td>
                      <td className="px-4 py-3 text-sm text-right">${Number(product.price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          product.isActive ? "bg-tono-ok-900/40 !text-ok" : "bg-tono-danger-900/40 !text-danger"
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
                              tasaIva: product.tasaIva ?? "",
                              tipo: "SIMPLE",
                              recipeId: "",
                              insumoId: "",
                              activo: product.isActive !== false
                            });
                            setShowProductModal(true);
                          }}
                          className="px-2 py-1 rounded !bg-btn text-xs hover:!bg-btn-hover mr-1"
                        >
                          Editar
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirmar({ titulo: "Eliminar producto", mensaje: "¿Eliminar este producto?", textoConfirmar: "Eliminar", destructiva: true })) {
                              setProducts(products.filter(p => p.id !== product.id));
                            }
                          }}
                          className="px-2 py-1 rounded !bg-danger-solid text-xs hover:bg-tono-danger-700"
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
                setCategoryForm({ nombre: "", color: COLOR_CATEGORIA_POR_DEFECTO, descripcion: "" });
                setShowCategoryModal(true);
              }}
              className="px-4 py-2 rounded !bg-btn !text-on-solid hover:!bg-btn-hover"
            >
              + Nueva Categoría
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {posCategories.length === 0 ? (
              <div className="col-span-3 p-8 text-center !text-content-3 rounded-xl !bg-nav border !border-line">
                No hay categorías registradas
              </div>
            ) : (
              posCategories.map((cat) => (
                <div key={cat.id} className="rounded-xl border !border-line !bg-nav p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }}></div>
                      <h3 className="font-semibold">{cat.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryForm({
                            nombre: cat.name,
                            color: cat.color,
                            descripcion: cat.description || ""
                          });
                          setShowCategoryModal(true);
                        }}
                        className="px-2 py-1 rounded !bg-btn text-xs hover:!bg-btn-hover"
                      >
                        Editar
                      </button>
                      <button
                        onClick={async () => {
                          if (await confirmar({ titulo: "Eliminar categoría", mensaje: "¿Eliminar esta categoría?", textoConfirmar: "Eliminar", destructiva: true })) {
                            setPosCategories(posCategories.filter(c => c.id !== cat.id));
                          }
                        }}
                        className="px-2 py-1 rounded !bg-danger-solid text-xs hover:bg-tono-danger-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <p className="text-sm !text-content-3">{cat.description || "Sin descripción"}</p>
                  <p className="text-xs !text-content-3 mt-2">{cat.products?.length || cat.productCount || 0} productos</p>
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
              className="px-4 py-2 rounded !bg-btn !text-on-solid hover:!bg-btn-hover"
            >
              + Nueva Área
            </button>
          </div>
          <div className="space-y-4">
            {areas.length === 0 ? (
              <div className="p-8 text-center !text-content-3 rounded-xl !bg-nav border !border-line">
                No hay áreas registradas
              </div>
            ) : (
              areas.map((area) => (
                <div key={area.id} className="rounded-xl border !border-line !bg-nav overflow-hidden">
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-tono-slate-800/50" onClick={() => setExpandedArea(expandedArea === area.id ? null : area.id)}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{expandedArea === area.id ? "▼" : "▶"}</span>
                      <div>
                        <h3 className="font-semibold">{area.name}</h3>
                        <p className="text-sm !text-content-3">{area.description || "Sin descripción"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm !text-content-3">{area.tables?.length || 0} mesas</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingArea(area);
                          setAreaForm({ nombre: area.name, descripcion: area.description || "" });
                          setShowAreaModal(true);
                        }}
                        className="px-2 py-1 rounded !bg-btn text-xs hover:!bg-btn-hover"
                      >
                        Editar
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (await confirmar({ titulo: "Eliminar área", mensaje: "¿Eliminar esta área?", textoConfirmar: "Eliminar", destructiva: true })) {
                            setAreas(areas.filter(a => a.id !== area.id));
                          }
                        }}
                        className="px-2 py-1 rounded !bg-danger-solid text-xs hover:bg-tono-danger-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {expandedArea === area.id && (
                    <div className="p-4 border-t !border-line bg-tono-slate-800/50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Mesas</h4>
                        <button
                          onClick={() => {
                            setEditingMesa(null);
                            setMesaForm({ areaId: area.id, numero: "", capacidad: "", status: "AVAILABLE" });
                            setShowMesaModal(true);
                          }}
                          className="px-3 py-1 rounded !bg-ok-solid text-xs hover:bg-tono-ok-700"
                        >
                          + Nueva Mesa
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {area.tables?.length === 0 ? (
                          <p className="col-span-4 text-sm !text-content-3">No hay mesas en esta área</p>
                        ) : (
                          area.tables.map((mesa: any) => (
                            <div key={mesa.id} className="p-3 rounded-lg !bg-nav border !border-line">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold">Mesa {mesa.number}</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  mesa.status === "AVAILABLE" ? "bg-tono-ok-900/40 !text-ok" :
                                  mesa.status === "OCCUPIED" ? "bg-tono-danger-900/40 !text-danger" :
                                  "bg-tono-yellow-900/40 text-tono-yellow-300"
                                }`}>
                                  {mesa.status}
                                </span>
                              </div>
                              <p className="text-xs !text-content-3">Capacidad: {mesa.capacity}</p>
                              <button
                                onClick={async () => {
                                  if (await confirmar({ titulo: "Eliminar mesa", mensaje: "¿Eliminar esta mesa?", textoConfirmar: "Eliminar", destructiva: true })) {
                                    setAreas(areas.map(a => 
                                      a.id === area.id 
                                        ? { ...a, mesas: a.mesas.filter((m: any) => m.id !== mesa.id) }
                                        : a
                                    ));
                                  }
                                }}
                                className="mt-2 text-xs !text-danger hover:text-tono-danger-300"
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
              className="px-4 py-2 rounded !bg-btn !text-on-solid hover:!bg-btn-hover"
            >
              + Nuevo Turno
            </button>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Configuración de Turnos</h3>
            <div className="rounded-xl border !border-line !bg-nav overflow-hidden">
              <table className="w-full">
                <thead className="!bg-surface-1">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm">Nombre</th>
                    <th className="px-4 py-3 text-left text-sm">Hora Inicio</th>
                    <th className="px-4 py-3 text-left text-sm">Hora Fin</th>
                    <th className="px-4 py-3 text-left text-sm">Días Activos</th>
                    <th className="px-4 py-3 text-center text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tono-slate-800">
                  {shiftConfigs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center !text-content-3">
                        No hay turnos configurados
                      </td>
                    </tr>
                  ) : (
                    shiftConfigs.map((config) => (
                      <tr key={config.id} className="hover:bg-tono-slate-800/50">
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
                            className="px-2 py-1 rounded !bg-btn text-xs hover:!bg-btn-hover mr-1"
                          >
                            Editar
                          </button>
                          <button
                            onClick={async () => {
                              if (await confirmar({ titulo: "Eliminar turno", mensaje: "¿Eliminar este turno?", textoConfirmar: "Eliminar", destructiva: true })) {
                                setShiftConfigs(shiftConfigs.filter(c => c.id !== config.id));
                              }
                            }}
                            className="px-2 py-1 rounded !bg-danger-solid text-xs hover:bg-tono-danger-700"
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
            <div className="rounded-xl border !border-line !bg-nav overflow-hidden">
              <table className="w-full">
                <thead className="!bg-surface-1">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm">Fecha</th>
                    <th className="px-4 py-3 text-left text-sm">Cajero</th>
                    <th className="px-4 py-3 text-right text-sm">Ventas</th>
                    <th className="px-4 py-3 text-right text-sm">Total Cobrado</th>
                    <th className="px-4 py-3 text-center text-sm">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tono-slate-800">
                  {salesHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center !text-content-3">
                        No hay historial de turnos
                      </td>
                    </tr>
                  ) : (
                    salesHistory.slice(0, 10).map((sale) => (
                      <tr key={sale.id} className="hover:bg-tono-slate-800/50">
                        <td className="px-4 py-3 text-sm">{sale.fecha}</td>
                        <td className="px-4 py-3 text-sm">{nombreCajero((sale as any).cajero || user?.id)}</td>
                        <td className="px-4 py-3 text-sm text-right">{sale.items?.length || 0}</td>
                        <td className="px-4 py-3 text-sm text-right">${Number(sale.total).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            sale.status === "PAGADA" ? "bg-tono-ok-900/40 !text-ok" : "bg-tono-danger-900/40 !text-danger"
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

      {activeTab === "parametros" && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Parámetros</h2>
          <div className="max-w-2xl space-y-6">
            <div className="rounded-xl border !border-line !bg-nav p-4">
              <h3 className="text-lg font-semibold mb-3">Stock insuficiente al vender</h3>
              <p className="text-xs !text-content-3 mb-4">
                Aplica a toda la empresa, no solo a esta sucursal.
              </p>

              <label className="flex items-start gap-3 mb-3 cursor-pointer">
                <input
                  type="radio"
                  name="stockPolicy"
                  checked={stockPolicy === 'PERMITIR_NEGATIVO'}
                  onChange={() => saveStockPolicy('PERMITIR_NEGATIVO')}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium !text-content-1">Permitir venta (stock queda en negativo)</div>
                  <div className="text-xs !text-content-3">El cajero puede vender igual; el stock refleja el déficit real.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="stockPolicy"
                  checked={stockPolicy === 'BLOQUEAR'}
                  onChange={() => saveStockPolicy('BLOQUEAR')}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium !text-content-1">Bloquear venta</div>
                  <div className="text-xs !text-content-3">Sin stock suficiente, la venta se rechaza — el botón del producto se ve deshabilitado en el POS.</div>
                </div>
              </label>

              <div className="mt-3 h-4 text-xs">
                {savingStockPolicy && <span className="!text-content-3">Guardando...</span>}
                {!savingStockPolicy && stockPolicySaved && <span className="!text-ok">Guardado.</span>}
              </div>
            </div>

            {user?.roleCode === "ADMIN" && (
              <div className="rounded-xl border !border-line !bg-nav p-4">
                <h3 className="text-lg font-semibold mb-3">Devoluciones de ventas</h3>
                <p className="text-xs !text-content-3 mb-4">
                  Define quién puede devolver una venta ya cobrada. Aplica a toda la empresa.
                </p>

                <label className="flex items-start gap-3 mb-3 cursor-pointer">
                  <input
                    type="radio"
                    name="politicaDevoluciones"
                    checked={politicaDevoluciones === "SOLO_GERENTE"}
                    onChange={() => savePoliticaDevoluciones("SOLO_GERENTE")}
                    disabled={savingPolitica}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium !text-content-1">Solo gerente o administrador (recomendado)</div>
                    <div className="text-xs !text-content-3">Un cajero no puede devolver; debe pedirle a un gerente que lo haga.</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="politicaDevoluciones"
                    checked={politicaDevoluciones === "CAJERO_LIBRE"}
                    onChange={() => savePoliticaDevoluciones("CAJERO_LIBRE")}
                    disabled={savingPolitica}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium !text-content-1">Cualquier cajero</div>
                    <div className="text-xs !text-content-3">Cualquier usuario del POS puede devolver una venta, sin autorización de un gerente.</div>
                  </div>
                </label>

                <div className="mt-3 h-4 text-xs">
                  {savingPolitica && <span className="!text-content-3">Guardando...</span>}
                  {!savingPolitica && politicaGuardada && !politicaError && <span className="!text-ok">Guardado.</span>}
                  {!savingPolitica && politicaError && <span className="!text-danger">{politicaError}</span>}
                </div>
              </div>
            )}

            {user?.roleCode === "ADMIN" && mesasHabilitado && (
              <div className="rounded-xl border !border-line !bg-nav p-4">
                <h3 className="text-lg font-semibold mb-3">Cuentas de mesa</h3>
                <p className="text-xs !text-content-3 mb-4">Quién cobra y quién divide las cuentas abiertas en mesas. Aplica a toda la empresa; el sistema valida siempre.</p>

                <h4 className="text-sm font-semibold !text-content-2 mb-2">¿Quién cobra una cuenta de mesa?</h4>
                {OPCIONES_POLITICA_COBRO.map((o) => (
                  <label key={o.value} className="flex items-start gap-3 mb-3 cursor-pointer">
                    <input type="radio" name="politicaCobro" checked={politicaCobro === o.value} onChange={() => savePoliticaMesas("politicaCobro", o.value)} disabled={savingMesasPol} className="mt-1" />
                    <div>
                      <div className="text-sm font-medium !text-content-1">{o.label}</div>
                      <div className="text-xs !text-content-3">{o.linea}</div>
                    </div>
                  </label>
                ))}

                <h4 className="text-sm font-semibold !text-content-2 mt-4 mb-2">¿Quién puede dividir la cuenta?</h4>
                {OPCIONES_POLITICA_DIVISION.map((o) => (
                  <label key={o.value} className="flex items-start gap-3 mb-3 cursor-pointer">
                    <input type="radio" name="politicaDivisionCuentas" checked={politicaDivision === o.value} onChange={() => savePoliticaMesas("politicaDivisionCuentas", o.value)} disabled={savingMesasPol} className="mt-1" />
                    <div>
                      <div className="text-sm font-medium !text-content-1">{o.label}</div>
                      <div className="text-xs !text-content-3">{o.linea}</div>
                    </div>
                  </label>
                ))}

                <div className="mt-3 h-4 text-xs">
                  {savingMesasPol && <span className="!text-content-3">Guardando...</span>}
                  {!savingMesasPol && mesasPolMsg && <span className={mesasPolMsg.ok ? "!text-ok" : "!text-danger"}>{mesasPolMsg.texto}</span>}
                </div>
              </div>
            )}

            <div className="rounded-xl border !border-line !bg-nav p-4">
              <h3 className="text-lg font-semibold mb-3">Impuestos</h3>
              <div>
                <label className="block text-sm !text-content-3 mb-1">IVA por defecto del negocio</label>
                <select
                  value={ivaTasaDefault}
                  onChange={(e) => esTasaIva(e.target.value) && guardarIva({ ivaTasaDefault: e.target.value })}
                  disabled={user?.roleCode !== "ADMIN" || guardandoIva}
                  className="w-full px-3 py-2 rounded !bg-surface-1 !text-content-1 disabled:opacity-60"
                >
                  <option value="16">16%</option>
                  <option value="8">8%</option>
                  <option value="0">0%</option>
                  <option value="EXENTO">Exento</option>
                </select>
                <p className="text-xs !text-content-3 mt-1">Cada producto puede tener su propia tasa; esta aplica a los que no la tienen.</p>
              </div>
              <label className="flex items-start gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preciosIncluyenIva}
                  onChange={(e) => guardarIva({ preciosIncluyenIva: e.target.checked })}
                  disabled={user?.roleCode !== "ADMIN" || guardandoIva}
                  className="mt-1 rounded"
                />
                <span className="text-sm !text-content-2">
                  Los precios de mis productos ya incluyen IVA
                  <span className="block text-xs !text-content-3">
                    Activado: el sistema desglosa el IVA del precio. Desactivado: lo suma al precio.
                  </span>
                </span>
              </label>
              <div className="mt-3 h-4 text-xs">
                {guardandoIva && <span className="!text-content-3">Guardando...</span>}
                {!guardandoIva && ivaMsg && <span className={ivaMsg.ok ? "!text-ok" : "!text-danger"}>{ivaMsg.texto}</span>}
                {user?.roleCode !== "ADMIN" && <span className="!text-content-3">Solo un administrador puede cambiarlo.</span>}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL ABRIR TURNO */}
      {showOpenShiftModal && (
        <AperturaTurnoModal
          cajero={nombreCajero(selectedCashier || user?.id)}
          error={errApertura}
          errorFondo={errAperturaFondo}
          fondo={initialFund}
          setFondo={setInitialFund}
          notas={shiftNotes}
          setNotas={setShiftNotes}
          onCancel={() => setShowOpenShiftModal(false)}
          onOpen={openShift}
        />
      )}

      {/* PANTALLA LOGIN CAJERO */}
      {showLoginScreen && (
        <div className="fixed inset-0 !bg-bg flex items-center justify-center z-50">
          <div className="!bg-surface-1 rounded-xl p-8 w-96">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🏪</div>
              <h2 className="text-2xl font-bold">POS Sistema</h2>
              <p className="!text-content-3">Inicio de Cajero</p>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="pos-login-cajero" className="block text-sm !text-content-3 mb-1">Seleccionar Cajero</label>
                <select
                  id="pos-login-cajero"
                  value={selectedCashier}
                  onChange={(e) => {
                    setSelectedCashier(e.target.value);
                  }}
                  className="w-full px-4 py-2 rounded-lg border !border-line !bg-nav !text-content-1"
                >
                  <option value="">{cajerosLista === null ? "Cargando…" : cajerosLista.length === 0 ? "No hay cajeros activos" : "Cualquiera (solo con mi PIN)"}</option>
                  {(cajerosLista ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre ?? "Sin nombre"}</option>
                  ))}
                </select>
                {cajerosLista !== null && cajerosLista.length === 0 ? (
                  <p className="mt-1 text-xs !text-content-3">Crea el cajero en Usuarios (rol Cajero, con empresa, sucursal y PIN de 4 dígitos).</p>
                ) : null}
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">PIN de Cajero</label>
                <input
                  type="password"
                  maxLength={6}
                  value={cashierPin}
                  onChange={(e) => setCashierPin(e.target.value)}
                  placeholder="****"
                  aria-invalid={errLogin ? true : undefined}
                  aria-describedby={errLogin ? "pos-login-error" : undefined}
                  className="w-full px-4 py-2 rounded-lg border !border-line !bg-nav !text-content-1 text-center text-2xl tracking-widest"
                />
                {errLogin ? <p id="pos-login-error" role="alert" className="mt-1 text-center text-sm font-medium !text-danger">{errLogin}</p> : null}
              </div>
              <button
                onClick={handleLogin}
                className="w-full py-3 rounded-lg !bg-btn !text-on-solid font-semibold hover:!bg-btn-hover"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL DE VENTAS */}
      {showSalesHistory && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-scrim/50 flex items-center justify-center z-50">
          <div className="!bg-surface-1 rounded-xl p-6 w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Historial de Ventas</h3>
              <button
                onClick={() => setShowSalesHistory(false)}
                className="!text-content-3 hover:text-content-1"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSalesFilter("all")}
                className={`px-3 py-1 rounded text-sm ${
                  salesFilter === "all" ? "!bg-btn" : "!bg-surface-2"
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setSalesFilter("PAGADA")}
                className={`px-3 py-1 rounded text-sm ${
                  salesFilter === "PAGADA" ? "!bg-btn" : "!bg-surface-2"
                }`}
              >
                Pagadas
              </button>
              <button
                onClick={() => setSalesFilter("CANCELADA")}
                className={`px-3 py-1 rounded text-sm ${
                  salesFilter === "CANCELADA" ? "!bg-btn" : "!bg-surface-2"
                }`}
              >
                Canceladas
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-[500px]">
                <thead className="!bg-surface-2 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm">Folio</th>
                    <th className="px-4 py-2 text-left text-sm">Fecha</th>
                    <th className="px-4 py-2 text-right text-sm">Total</th>
                    <th className="px-4 py-2 text-center text-sm">Estado</th>
                    <th className="px-4 py-2 text-center text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tono-slate-700">
                  {salesHistory.map((sale) => (
                    <tr key={sale.id} className="hover:bg-tono-slate-700/50">
                      <td className="px-4 py-2 text-sm">{sale.folio}</td>
                      <td className="px-4 py-2 text-sm">{sale.fecha}</td>
                      <td className="px-4 py-2 text-right text-sm font-semibold">
                        ${Number(sale.total).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            sale.status === "PAGADA"
                              ? "bg-tono-ok-900/40 !text-ok"
                              : sale.status === "DEVUELTA" || sale.status === "DEVOLUCION"
                                ? "bg-tono-amber-900/40 text-tono-amber-300"
                                : "bg-tono-danger-900/40 !text-danger"
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {/* Solo ventas PAGADA reales (total > 0 y sin sufijo -DEV: las filas -DEV del
                            esquema anterior no se pueden devolver) y solo si la política lo permite
                            a este usuario. El backend decide de todos modos. */}
                        {sale.status === "PAGADA" && sale.total > 0 && !sale.folio?.endsWith("-DEV") && puedeDevolver && (
                          <button
                            onClick={() => devolverVenta(sale.id)}
                            className="px-2 py-1 rounded !bg-danger-solid text-xs hover:bg-tono-danger-700"
                          >
                            Devolver
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
        <ModalPOS
          size="md"
          title={"Aplicar Descuento"}
          onClose={() => setShowDiscountModal(false)}
          etiquetaEnter="Aplicar"
          footer={
            <ModalFooter
              secundario={<Boton variante="secundario" confirma={false} onClick={() => setShowDiscountModal(false)}>Cancelar</Boton>}
              principal={<Boton cargando={autorizando} onClick={applyGlobalDiscount}>Aplicar descuento</Boton>}
            />
          }
        >
            {errDescuento ? <AlertaModal className="mb-3">{errDescuento}</AlertaModal> : null}
            <div className="space-y-4">
              {/* Sección 1: Descuentos predefinidos */}
              <div>
                <label className="block text-sm !text-content-3 mb-2">Descuentos predefinidos</label>
                <div className="flex flex-wrap gap-2">
                  {predefinedDiscounts.map((percent) => (
                    <button
                      key={percent}
                      onClick={() => {
                        setDiscountType('percentage');
                        setCustomDiscountValue(percent.toString());
                      }}
                      className="px-3 py-2 rounded !bg-surface-2 !text-content-1 hover:!bg-surface-2 text-sm"
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Sección 2: Descuento personalizado */}
              <div>
                <label className="block text-sm !text-content-3 mb-2">Descuento personalizado</label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setDiscountType('percentage')}
                    className={`flex-1 py-2 rounded ${discountType === 'percentage' ? '!bg-btn !text-on-solid' : '!bg-surface-2 !text-content-1'}`}
                  >
                    Porcentaje
                  </button>
                  <button
                    onClick={() => setDiscountType('fixed')}
                    className={`flex-1 py-2 rounded ${discountType === 'fixed' ? '!bg-btn !text-on-solid' : '!bg-surface-2 !text-content-1'}`}
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
                  className="w-full px-4 py-2 rounded-lg border !border-line !bg-nav !text-content-1"
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
                  <label className="text-sm !text-content-3">Aplicar a todo el ticket</label>
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
                        <span className="text-sm !text-content-1">{item.nombre}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sección 4: Motivo */}
              <div>
                <label className="block text-sm !text-content-3 mb-1">Motivo *</label>
                <select
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border !border-line !bg-nav !text-content-1"
                >
                  <option value="">Seleccionar motivo...</option>
                  <option value="promocion">Promoción</option>
                  <option value="cliente_frecuente">Cliente frecuente</option>
                  <option value="error_cobro">Error de cobro</option>
                  <option value="autorizacion_gerencia">Autorización gerencia</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {descuentoRequiereAutorizacion ? (
                <AutorizacionGerente
                  idBase="descuento"
                  autorizadores={autorizadores}
                  autorizadorId={autorizadorId}
                  onAutorizador={setAutorizadorId}
                  contrasena={autorizadorClave}
                  onContrasena={setAutorizadorClave}
                  motivoAutorizacion={`Este descuento (${descuentoPedidoPct()} %) supera tu límite (${topeDescuentoRol} %).`}
                />
              ) : null}
            </div>
        </ModalPOS>
      )}

      {/* MODAL CORTESÍA */}
      {showCourtesyModal && (
        <ModalPOS
          size="md"
          title={"Cortesía"}
          onClose={() => setShowCourtesyModal(false)}
          etiquetaEnter="Aplicar"
          footer={
            <ModalFooter
              secundario={<Boton variante="secundario" confirma={false} onClick={() => setShowCourtesyModal(false)}>Cancelar</Boton>}
              principal={<Boton cargando={autorizando} disabled={!courtesyReason || (!puedeCortesia && (!autorizadorId || !autorizadorClave))} onClick={applyCourtesy}>Aplicar cortesía</Boton>}
            />
          }
        >
            {errCortesia ? <AlertaModal className="mb-3">{errCortesia}</AlertaModal> : null}
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
                  <label className="text-sm !text-content-3">Cortesía total del ticket</label>
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
                        <span className="text-sm !text-content-1">{item.nombre}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sección 2: Motivo */}
              <div>
                <label className="block text-sm !text-content-3 mb-1">Motivo *</label>
                <select
                  value={courtesyReason}
                  onChange={(e) => setCourtesyReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border !border-line !bg-nav !text-content-1"
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
              {puedeCortesia ? (
                <p className="text-sm !text-content-3">Autorizas con tu sesión{user?.email ? ` (${user.email})` : ""}. La cortesía queda en la bitácora con su motivo.</p>
              ) : (
                <AutorizacionGerente
                  idBase="cortesia"
                  autorizadores={autorizadores}
                  autorizadorId={autorizadorId}
                  onAutorizador={setAutorizadorId}
                  contrasena={autorizadorClave}
                  onContrasena={setAutorizadorClave}
                  motivoAutorizacion="Una cortesía solo la autoriza un gerente o administrador."
                />
              )}
            </div>
        </ModalPOS>
      )}

      {/* COBRO Y RECIBO: una sola ventana. Tras cobrar, esta misma ventana pasa a mostrar el recibo (id="print-area" es lo que se imprime). */}
      {(showPaymentModal || (showReceipt && currentSale)) && (
        <CobroPOS
          total={getTotal()}
          pagado={getTotalCovered()}
          pendiente={getPending()}
          cambio={getChange()}
          puedeCortesia={puedeCortesia}
          pagos={paymentForms}
          formaActiva={selectedPaymentForm}
          onElegirForma={(f) => {
            setSelectedPaymentForm(f);
            setCardLast4("");
            setPaymentAmount("");
            setTimeout(() => paymentInputRef.current?.focus(), 0);
          }}
          monto={paymentAmount}
          setMonto={setPaymentAmount}
          inputRef={paymentInputRef}
          onAgregar={() => {
            if (selectedPaymentForm && Number(paymentAmount) > 0) {
              if (esFormaTarjeta(selectedPaymentForm) && !ultimos4Validos(cardLast4)) return;
              addPaymentForm(selectedPaymentForm, Number(paymentAmount), cardLast4);
              setCardLast4("");
              setPaymentAmount("");
              setTimeout(() => paymentInputRef.current?.focus(), 0);
            }
          }}
          onExacto={() => {
            if (!selectedPaymentForm) setSelectedPaymentForm("EFECTIVO");
            setPaymentAmount(getPending().toFixed(2));
          }}
          onQuitar={removePaymentForm}
          cardLast4={cardLast4}
          setCardLast4={setCardLast4}
          cardBank={cardBank}
          setCardBank={setCardBank}
          speiKey={speiKey}
          setSpeiKey={setSpeiKey}
          courtesyReason={courtesyReason}
          setCourtesyReason={setCourtesyReason}
          error={cardValidationError}
          onCancel={cerrarCobro}
          onConfirm={processPayment}
                  recibo={showReceipt && currentSale ? (
            <div id="print-area" className="text-content-1">
            {/* Header del ticket */}
            <div className="text-center mb-4">
              {config.logoUrl && (
                <img src={config.logoUrl} alt="Logo" className="w-20 h-20 mx-auto mb-2 object-contain" />
              )}
              <h3 className="text-xl font-bold">{config.companyName || 'Empresa'}</h3>
              <p className="text-xs text-content-3 mt-1">Dirección: Calle Demo {"#"}123, Col. Centro</p>
              <p className="text-xs text-content-3">RFC: XAXX010101000</p>
              <p className="text-xs text-content-3">Tel: (555) 123-4567</p>
              <div className="border-t border-tono-slate-300 my-2"></div>
              <p className="text-sm font-semibold">Ticket #{currentSale.folio}</p>
              <p className="text-xs text-content-3">{new Date(currentSale.fecha).toLocaleString('es-MX')}</p>
            </div>

            {/* Productos */}
            <div className="space-y-1 mb-4 text-sm">
              {currentSale.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{item.nombre}</p>
                    <p className="text-xs text-content-3">
                      {item.cantidad} x ${Number(item.precioUnitario).toFixed(2)}
                    </p>
                  </div>
                  <span className="font-semibold">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="border-t border-tono-slate-300 pt-2 mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${Number(currentSale.subtotal ?? reciboIva.subtotal).toFixed(2)}</span>
              </div>
              {(currentSale.descuento ?? 0) > 0 && (
                <div className="flex justify-between text-danger">
                  <span>Descuento</span>
                  <span>-${Number(currentSale.descuento).toFixed(2)}</span>
                </div>
              )}
              {lineasDeIva(reciboIva).length <= 1 ? (
                <div className="flex justify-between">
                  <span>{etiquetaIvaUnica(reciboIva, ivaCfg)}</span>
                  <span>${Number(currentSale.impuestos ?? reciboIva.impuestos).toFixed(2)}</span>
                </div>
              ) : (
                lineasDeIva(reciboIva).map((l) => (
                  <div key={l.tasa} className="flex justify-between">
                    <span>{l.tasa === "EXENTO" ? "Exento (base)" : `IVA ${l.etiqueta} (base $${l.base.toFixed(2)})`}</span>
                    <span>${(l.tasa === "EXENTO" ? l.base : l.impuestos).toFixed(2)}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between font-bold text-lg border-t border-tono-slate-300 pt-2 mt-2">
                <span>TOTAL</span>
                <span>${Number(currentSale.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Formas de pago */}
            <div className="border-t border-tono-slate-300 pt-2 mt-2">
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

            {/* Mensaje opcional */}
            <div className="border-t border-tono-slate-300 pt-2 mt-2">
              <label className="text-sm font-semibold block mb-1">Mensaje (opcional):</label>
              <textarea
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                className="w-full p-2 border border-tono-slate-300 rounded text-sm"
                rows={2}
                placeholder="¡Gracias por su compra!"
              />
            </div>

            {/* Datos de facturación */}
            <div className="border-t border-tono-slate-300 pt-2 mt-2 print:hidden">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                <input
                  type="checkbox"
                  checked={requireInvoice}
                  onChange={(e) => setRequireInvoice(e.target.checked)}
                />
                ¿Requiere factura?
              </label>
              {requireInvoice && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={invoiceRfc}
                    onChange={(e) => setInvoiceRfc(e.target.value)}
                    placeholder="RFC"
                    className="w-full p-2 border border-tono-slate-300 rounded text-sm"
                  />
                  <input
                    type="email"
                    value={invoiceEmail}
                    onChange={(e) => setInvoiceEmail(e.target.value)}
                    placeholder="Email para factura"
                    className="w-full p-2 border border-tono-slate-300 rounded text-sm"
                  />
                </div>
              )}
            </div>
            </div>
          ) : undefined}
          onCerrarRecibo={() => setShowReceipt(false)}
          onImprimirRecibo={() => {
            window.print();
            setShowReceipt(false);
          }}
        />
      )}

      {/* MODAL PRODUCTO */}
      {showProductModal && (
        <ModalPOS size="md" title={editingProduct ? "Editar Producto" : "Nuevo Producto"} onClose={() => setShowProductModal(false)}>
            {errProducto ? <AlertaModal className="mb-3">{errProducto}</AlertaModal> : null}
            <div className="space-y-4">
              <div>
                <label className="block text-sm !text-content-3 mb-1">Código</label>
                <input
                  type="text"
                  value={productForm.codigo}
                  onChange={(e) => setProductForm({ ...productForm, codigo: e.target.value })}
                  placeholder="Código del producto"
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                />
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">Nombre *</label>
                <input
                  {...propsTextoLibre("pos-producto-nombre")}
                  value={productForm.nombre}
                  onChange={(e) => setProductForm({ ...productForm, nombre: e.target.value })}
                  placeholder="Nombre del producto"
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                />
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">Descripción</label>
                <textarea
                  value={productForm.descripcion}
                  onChange={(e) => setProductForm({ ...productForm, descripcion: e.target.value })}
                  placeholder="Descripción del producto"
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">Precio *</label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.precio}
                  onChange={(e) => setProductForm({ ...productForm, precio: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                />
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">Categoría</label>
                <input
                  type="text"
                  value={productForm.categoria}
                  onChange={(e) => setProductForm({ ...productForm, categoria: e.target.value })}
                  placeholder="Categoría"
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                />
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">URL Imagen</label>
                <input
                  type="text"
                  value={productForm.imagenUrl}
                  onChange={(e) => setProductForm({ ...productForm, imagenUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                />
                {productForm.imagenUrl && (
                  <div className="mt-2 w-24 h-24 rounded !bg-surface-2 overflow-hidden">
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
                <label className="block text-sm !text-content-3 mb-1">Tipo</label>
                <select
                  value={productForm.tipo}
                  onChange={(e) => setProductForm({ ...productForm, tipo: e.target.value, recipeId: "", insumoId: "" })}
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                >
                  <option value="SIMPLE">Simple (retail)</option>
                  <option value="PREPARADO">Preparado (receta)</option>
                </select>
              </div>
              {productForm.tipo === "PREPARADO" && (
                <div>
                  <label className="block text-sm !text-content-3 mb-1">Receta</label>
                  <select
                    value={productForm.recipeId}
                    onChange={(e) => setProductForm({ ...productForm, recipeId: e.target.value })}
                    className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                  >
                    <option value="">{opcionesStockCargadas && opcionesStock.recetas.length === 0 ? "No hay recetas registradas" : "Seleccionar receta"}</option>
                    {opcionesStock.recetas.map((r) => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              {productForm.tipo === "SIMPLE" && (
                <div>
                  <label className="block text-sm !text-content-3 mb-1">Insumo</label>
                  <select
                    value={productForm.insumoId}
                    onChange={(e) => setProductForm({ ...productForm, insumoId: e.target.value })}
                    className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                  >
                    <option value="">{opcionesStockCargadas && opcionesStock.insumos.length === 0 ? "No hay insumos registrados" : "Seleccionar insumo"}</option>
                    {opcionesStock.insumos.map((i) => (
                      <option key={i.id} value={i.id}>{i.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm !text-content-3 mb-1">IVA de este producto</label>
                <select
                  value={productForm.tasaIva}
                  onChange={(e) => setProductForm({ ...productForm, tasaIva: e.target.value })}
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                >
                  <option value="">Usar la del negocio ({etiquetaTasa(ivaTasaDefault)})</option>
                  {TASAS_IVA.map((t) => (
                    <option key={t} value={t}>{t === "EXENTO" ? "Exento" : `${t}%`}</option>
                  ))}
                </select>
                <p className="text-xs !text-content-3 mt-1">Reemplaza la tasa del negocio solo para este producto.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={productForm.activo}
                  onChange={(e) => setProductForm({ ...productForm, activo: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm !text-content-3">Activo</label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2 rounded !bg-surface-2 !text-content-1 hover:!bg-surface-2"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarProducto}
                  disabled={guardandoProducto}
                  className="flex-1 py-2 rounded !bg-btn !text-on-solid hover:!bg-btn-hover disabled:opacity-60"
                >
                  {guardandoProducto ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
        </ModalPOS>
      )}

      {/* MODAL RETIRO */}
      {showWithdrawalModal && (
        <MovimientoEfectivoModal
          tipo="RETIRO"
          error={errMovimiento}
          errores={errMovimientoCampos}
          esperado={shift ? efectivoEsperado(shift as any) : undefined}
          monto={withdrawalAmount}
          setMonto={setWithdrawalAmount}
          concepto={withdrawalReason}
          setConcepto={setWithdrawalReason}
          autorizadoPor={withdrawalAuthorizedBy}
          setAutorizadoPor={setWithdrawalAuthorizedBy}
          onCancel={() => setShowWithdrawalModal(false)}
          onConfirm={handleWithdrawal}
        />
      )}

      {/* MODAL DEPÓSITO */}
      {showDepositModal && (
        <MovimientoEfectivoModal
          tipo="DEPOSITO"
          error={errMovimiento}
          errores={errMovimientoCampos}
          esperado={shift ? efectivoEsperado(shift as any) : undefined}
          monto={depositAmount}
          setMonto={setDepositAmount}
          concepto={depositOrigin}
          setConcepto={setDepositOrigin}
          autorizadoPor={depositAuthorizedBy}
          setAutorizadoPor={setDepositAuthorizedBy}
          onCancel={() => setShowDepositModal(false)}
          onConfirm={handleDeposit}
        />
      )}

      {/* MODAL PRECORTE X */}
      {showPrecutModal && shift && (
        <PrecorteModal
          turno={shift as any}
          error={errPrecorte}
          tickets={salesHistory.length}
          cashCounts={cashCounts}
          setCashCounts={setCashCounts}
          debito={debitoDeclarado}
          setDebito={setDebitoDeclarado}
          credito={creditoDeclarado}
          setCredito={setCreditoDeclarado}
          transferencia={transferenciaDeclarada}
          setTransferencia={setTransferenciaDeclarada}
          vales={valesDeclarados}
          setVales={setValesDeclarados}
          onCancel={() => setShowPrecutModal(false)}
          onSave={handlePrecut}
        />
      )}

      {/* MODAL CORTE Z */}
      {showCloseShiftModal && shift && (
        <CierreTurnoModal
          turno={shift as any}
          error={errCierre}
          totalesServidor={shiftSummary?.calculatedTotals}
          onCancel={() => setShowCloseShiftModal(false)}
          onClose={closeShift}
        />
      )}

      {/* MODAL CONFIRMACIÓN SALIR */}
      {showExitConfirmModal && (
        <ModalPOS size="sm" title={"¿Salir del POS?"} onClose={() => setShowExitConfirmModal(false)}>
            <p className="text-sm !text-content-3 mb-6">
              ¿Seguro que deseas salir? El turno quedará activo y podrás continuar después.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="flex-1 py-2 rounded !bg-surface-2 !text-content-1 hover:!bg-surface-2"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (esCajeroDeSesion) {
                    // logout() (useAuthStore) ya hace POST /auth/logout (limpia la cookie
                    // httpOnly server-side) + limpia todo el localStorage relevante +
                    // redirige a /login — la limpieza manual y el navigate('/') que vivían
                    // acá eran redundantes y competían con esa redirección.
                    logout();
                  } else {
                    navigate('/dashboard');
                  }
                }}
                className="flex-1 py-2 rounded !bg-btn !text-on-solid hover:!bg-btn-hover"
              >
                Salir
              </button>
            </div>
        </ModalPOS>
      )}

      {/* MODAL CATEGORÍA */}
      {showCategoryModal && (
        <ModalPOS size="sm" title={editingCategory ? "Editar Categoría" : "Nueva Categoría"} onClose={() => setShowCategoryModal(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm !text-content-3 mb-1">Nombre *</label>
                <input
                  {...propsTextoLibre("pos-categoria-nombre")}
                  value={categoryForm.nombre}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nombre: e.target.value })}
                  placeholder="Nombre de la categoría"
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                />
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">Color</label>
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  className="w-full h-10 rounded !bg-nav"
                />
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">Descripción</label>
                <textarea
                  value={categoryForm.descripcion}
                  onChange={(e) => setCategoryForm({ ...categoryForm, descripcion: e.target.value })}
                  placeholder="Descripción"
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 py-2 rounded !bg-surface-2 !text-content-1 hover:!bg-surface-2"
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
                  className="flex-1 py-2 rounded !bg-btn !text-on-solid hover:!bg-btn-hover"
                >
                  Guardar
                </button>
              </div>
            </div>
        </ModalPOS>
      )}

      {/* MODAL ÁREA */}
      {showAreaModal && (
        <ModalPOS size="sm" title={editingArea ? "Editar Área" : "Nueva Área"} onClose={() => setShowAreaModal(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm !text-content-3 mb-1">Nombre *</label>
                <input
                  {...propsTextoLibre("pos-area-nombre")}
                  value={areaForm.nombre}
                  onChange={(e) => setAreaForm({ ...areaForm, nombre: e.target.value })}
                  placeholder="Nombre del área"
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                />
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">Descripción</label>
                <textarea
                  value={areaForm.descripcion}
                  onChange={(e) => setAreaForm({ ...areaForm, descripcion: e.target.value })}
                  placeholder="Descripción"
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAreaModal(false)}
                  className="flex-1 py-2 rounded !bg-surface-2 !text-content-1 hover:!bg-surface-2"
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
                  className="flex-1 py-2 rounded !bg-btn !text-on-solid hover:!bg-btn-hover"
                >
                  Guardar
                </button>
              </div>
            </div>
        </ModalPOS>
      )}

      {/* MODAL MESA */}
      {showMesaModal && (
        <ModalPOS size="sm" title={editingMesa ? "Editar Mesa" : "Nueva Mesa"} onClose={() => setShowMesaModal(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm !text-content-3 mb-1">Número *</label>
                <input
                  type="text"
                  value={mesaForm.numero}
                  onChange={(e) => setMesaForm({ ...mesaForm, numero: e.target.value })}
                  placeholder="Número de mesa"
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                />
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">Capacidad *</label>
                <input
                  type="number"
                  value={mesaForm.capacidad}
                  onChange={(e) => setMesaForm({ ...mesaForm, capacidad: e.target.value })}
                  placeholder="Capacidad de personas"
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                />
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">Status</label>
                <select
                  value={mesaForm.status}
                  onChange={(e) => setMesaForm({ ...mesaForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                >
                  <option value="AVAILABLE">Disponible</option>
                  <option value="OCCUPIED">Ocupada</option>
                  <option value="RESERVED">Reservada</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMesaModal(false)}
                  className="flex-1 py-2 rounded !bg-surface-2 !text-content-1 hover:!bg-surface-2"
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
                  className="flex-1 py-2 rounded !bg-btn !text-on-solid hover:!bg-btn-hover"
                >
                  Guardar
                </button>
              </div>
            </div>
        </ModalPOS>
      )}

      {/* MODAL CONFIGURACIÓN TURNO */}
      {showShiftConfigModal && (
        <ModalPOS size="sm" title={editingShiftConfig ? "Editar Turno" : "Nuevo Turno"} onClose={() => setShowShiftConfigModal(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm !text-content-3 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={shiftConfigForm.nombre}
                  onChange={(e) => setShiftConfigForm({ ...shiftConfigForm, nombre: e.target.value })}
                  placeholder="Ej: Matutino"
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                />
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">Hora Inicio *</label>
                <input
                  type="time"
                  value={shiftConfigForm.horaInicio}
                  onChange={(e) => setShiftConfigForm({ ...shiftConfigForm, horaInicio: e.target.value })}
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                />
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">Hora Fin *</label>
                <input
                  type="time"
                  value={shiftConfigForm.horaFin}
                  onChange={(e) => setShiftConfigForm({ ...shiftConfigForm, horaFin: e.target.value })}
                  className="w-full px-3 py-2 rounded !bg-nav !text-content-1"
                />
              </div>
              <div>
                <label className="block text-sm !text-content-3 mb-1">Días Activos</label>
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
                          ? "!bg-btn !text-on-solid"
                          : "!bg-surface-2 !text-content-2"
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
                  className="flex-1 py-2 rounded !bg-surface-2 !text-content-1 hover:!bg-surface-2"
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
                  className="flex-1 py-2 rounded !bg-btn !text-on-solid hover:!bg-btn-hover"
                >
                  Guardar
                </button>
              </div>
            </div>
        </ModalPOS>
      )}

      {/* MODAL CANCELAR VENTA */}
      {showReturnSaleModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/70 px-4">
          <div className="w-full max-w-md rounded-2xl border !border-line !bg-nav p-6 shadow-2xl">
            <div className="mb-6">
              <h3 className="text-2xl font-bold !text-content-1">Devolver Venta</h3>
              <p className="text-sm !text-content-3">
                Se devuelve la venta completa: el inventario regresa (salvo lo que ya salió a cocina o barra,
                que se registra como merma) y el reembolso se descuenta en el turno abierto.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm !text-content-3 mb-2">Motivo de la devolución</label>
                <textarea
                  value={returnSaleReason}
                  onChange={(e) => setReturnSaleReason(e.target.value)}
                  autoFocus
                  placeholder="Describe el motivo..."
                  rows={3}
                  className="w-full rounded-lg border !border-line !bg-surface-1 p-3 !text-content-1 focus:outline-none focus:ring-2 focus:ring-st-danger"
                />
              </div>
              {returnSaleError && (
                <div className="rounded-lg border border-tono-danger-800 bg-tono-danger-900/30 px-3 py-2 text-sm !text-danger">
                  {returnSaleError}
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowReturnSaleModal(false); setReturnSaleId(null); setReturnSaleReason(""); setReturnSaleError(""); }}
                  className="px-4 py-2 rounded-lg !bg-surface-2 !text-content-1 font-medium hover:!bg-surface-2"
                >
                  Cerrar
                </button>
                <button
                  onClick={confirmReturnSale}
                  disabled={!returnSaleReason.trim() || returningSale}
                  className="px-4 py-2 rounded-lg !bg-danger-solid !text-on-solid font-medium hover:bg-tono-danger-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {returningSale ? "Devolviendo..." : "Confirmar Devolución"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTACIÓN CSV PRODUCTOS POS */}
      {posProductImportModalOpen && (
        <ModalPOS size="md" title={"Importar Productos desde CSV"} onClose={() => setPosProductImportModalOpen(false)}>
            
            <div className="space-y-4">
              <button
                onClick={downloadPOSCSVTemplate}
                className="w-full px-4 py-3 rounded !bg-surface-2 !text-content-1 hover:!bg-surface-2 border !border-line"
              >
                📥 Descargar Plantilla CSV
              </button>

              <div className="border-2 border-dashed !border-line rounded-lg p-8 text-center">
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
                  <div className="!text-content-3 mb-2">
                    Arrastra tu archivo CSV aquí o haz clic para seleccionar
                  </div>
                  <div className="text-sm !text-content-3">
                    Formato: nombre, categoria, precio, impuesto, descripcion, estacion (COCINA o BARRA)
                  </div>
                </label>
              </div>

              {posCsvPreview.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Vista Previa (primeras 5 filas):</h4>
                  <div className="rounded-lg border !border-line !bg-nav overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="!text-content-3">
                        <tr>
                          {Object.keys(posCsvPreview[0]).map(key => (
                            <th key={key} className="p-2 text-left">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {posCsvPreview.map((row, i) => (
                          <tr key={i} className="border-t !border-line">
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
                <div className={`rounded-lg p-4 ${posCsvImportResult.success > 0 ? 'bg-tono-ok-900/30 border border-tono-ok-700' : 'bg-tono-danger-900/30 border border-tono-danger-700'}`}>
                  <p className="!text-content-1 font-semibold">
                    {posCsvImportResult.success} productos importados correctamente
                  </p>
                  {posCsvImportResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="!text-danger text-sm">{posCsvImportResult.errors.length} errores:</p>
                      <ul className="text-xs !text-danger mt-1 space-y-1">
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
                className="flex-1 py-2 rounded !bg-surface-2 !text-content-1 hover:!bg-surface-2"
              >
                Cancelar
              </button>
              <button
                onClick={importPosProductsFromCSV}
                disabled={!posCsvFile || isPosImporting}
                className="flex-1 py-2 rounded !bg-btn !text-on-solid hover:!bg-btn-hover disabled:opacity-40"
              >
                {isPosImporting ? "Importando..." : "Importar"}
              </button>
            </div>
        </ModalPOS>
      )}

      {/* Chat de aprobación de corte */}
      {showChatPanel && shift?.id && (
        <PosChatPanel
          turnoId={shift.id}
          onClose={() => setShowChatPanel(false)}
          onApproved={() => setShowChatPanel(false)}
          onRejected={() => setShowChatPanel(false)}
        />
      )}
    </div>
  );
}
