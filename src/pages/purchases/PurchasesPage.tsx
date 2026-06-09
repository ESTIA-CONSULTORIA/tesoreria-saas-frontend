import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateOrderModal from "./CreateOrderModal";
import ReceiveOrderModal from "./ReceiveOrderModal";
import CreateInvoiceModal from "./CreateInvoiceModal";
import { useCompanyStore } from "../../core/store/useCompanyStore";

interface PurchaseOrder {
  id: string;
  numero: string;
  fecha: string;
  supplierId: string;
  status: string;
  items: any[];
  subtotal: number;
  impuestos: number;
  total: number;
  fechaEntregaEsperada: string;
  notas: string;
  statusHistory?: any[];
  motivoCancelacion?: string;
}

interface Purchase {
  id: string;
  numero: string;
  fecha: string;
  supplierId: string;
  ocId: string;
  items: any[];
  subtotal: number;
  impuestos: number;
  total: number;
  montoPagado: number;
  status: string;
  fechaVencimiento: string;
  metodoPago: string;
  diasCredito?: number;
}

interface Supplier {
  id: string;
  nombre: string;
}

export default function PurchasesPage() {
  const { activeBranch, activeCompany } = useCompanyStore();
  const [activeTab, setActiveTab] = useState("ordenes");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<Purchase[]>([]);
  const [accountsPayable, setAccountsPayable] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [viewOrderModalOpen, setViewOrderModalOpen] = useState(false);
  const [viewInvoiceModalOpen, setViewInvoiceModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Purchase | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [userRole, setUserRole] = useState("");
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    accountId: "",
    fechaPago: new Date().toISOString().split('T')[0],
    referencia: "",
    notas: "",
  });

  useEffect(() => {
    loadSuppliers();
    loadBankAccounts();
    loadUserRole();
  }, []);

  useEffect(() => {
    if (activeTab === "ordenes") loadOrders();
    if (activeTab === "recepcion") loadOrders("ENVIADA");
    if (activeTab === "facturas") loadInvoices();
    if (activeTab === "cuentas-pagar") loadAccountsPayable();
  }, [activeTab, activeBranch?.id, activeCompany?.id]);

  function loadUserRole() {
    const auth = localStorage.getItem("access_token");
    if (auth) {
      try {
        const payload = JSON.parse(atob(auth.split('.')[1]));
        setUserRole(payload.roleCode || "");
      } catch {
        setUserRole("");
      }
    }
  }

  async function loadSuppliers() {
    try {
      const response = await api.get("/suppliers");
      setSuppliers(Array.isArray(response.data) ? response.data : []);
    } catch {
      setSuppliers([]);
    }
  }

  async function loadBankAccounts() {
    try {
      const response = await api.get("/banks");
      setBankAccounts(Array.isArray(response.data) ? response.data : []);
    } catch {
      setBankAccounts([]);
    }
  }

  async function loadOrders(status?: string) {
    try {
      setLoading(true);
      const response = await api.get("/purchases/orders", { params: { status } });
      const ordersData = Array.isArray(response.data) ? response.data : [];
      setOrders(ordersData);
      if (ordersData.length > 0) {
        console.log('Primera OC:', JSON.stringify(ordersData[0]));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar órdenes");
    } finally {
      setLoading(false);
    }
  }

  async function loadInvoices() {
    try {
      setLoading(true);
      const response = await api.get("/purchases/invoices");
      setInvoices(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar facturas");
    } finally {
      setLoading(false);
    }
  }

  async function loadAccountsPayable() {
    try {
      setLoading(true);
      const response = await api.get("/purchases/accounts-payable");
      setAccountsPayable(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar cuentas por pagar");
    } finally {
      setLoading(false);
    }
  }

  async function markOrderAsSent(id: string) {
    try {
      await api.put(`/purchases/orders/${id}/send`);
      loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible enviar la orden");
    }
  }

  async function cancelOrder(id: string) {
    try {
      await api.put(`/purchases/orders/${id}/cancel`);
      loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cancelar la orden");
    }
  }

  async function requestCancellation(id: string) {
    try {
      const auth = localStorage.getItem("access_token");
      let userId = "";
      if (auth) {
        try {
          const payload = JSON.parse(atob(auth.split('.')[1]));
          userId = payload.sub || "";
        } catch {}
      }
      await api.post(`/purchases/orders/${id}/request-cancellation`, {
        motivo: cancelMotivo,
        userId,
      });
      setCancelModalOpen(false);
      setCancelMotivo("");
      loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible solicitar la cancelación");
    }
  }

  async function approveCancellation(id: string) {
    try {
      const auth = localStorage.getItem("access_token");
      let userId = "";
      if (auth) {
        try {
          const payload = JSON.parse(atob(auth.split('.')[1]));
          userId = payload.sub || "";
        } catch {}
      }
      await api.post(`/purchases/orders/${id}/approve-cancellation`, { userId });
      loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible aprobar la cancelación");
    }
  }

  function handleRequestCancellation(order: PurchaseOrder) {
    setSelectedOrder(order);
    setCancelMotivo("");
    setCancelModalOpen(true);
  }

  function handlePayment(invoice: Purchase) {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: Number(invoice.total) - Number(invoice.montoPagado),
      accountId: "",
      fechaPago: new Date().toISOString().split('T')[0],
      referencia: "",
      notas: "",
    });
    setPaymentModalOpen(true);
  }

  async function registerPayment() {
    if (!selectedInvoice || !paymentData.accountId || paymentData.amount <= 0) {
      setError("Complete todos los campos requeridos");
      return;
    }

    try {
      const auth = localStorage.getItem("access_token");
      let userId = "";
      if (auth) {
        try {
          const payload = JSON.parse(atob(auth.split('.')[1]));
          userId = payload.sub || "";
        } catch {}
      }

      await api.post(`/purchases/invoices/${selectedInvoice.id}/register-payment`, {
        ...paymentData,
        userId,
      });

      setPaymentModalOpen(false);
      setSelectedInvoice(null);
      setError("");
      loadAccountsPayable();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible registrar el pago");
    }
  }

  function handleViewOrder(order: PurchaseOrder) {
    setSelectedOrder(order);
    setViewOrderModalOpen(true);
  }

  function handleViewInvoice(invoice: Purchase) {
    setSelectedInvoice(invoice);
    setViewInvoiceModalOpen(true);
  }

  function handleReceiveOrder(order: PurchaseOrder) {
    setSelectedOrder(order);
    setReceiveModalOpen(true);
  }

  function getSupplierName(supplierId: string): string {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier?.nombre || supplierId;
  }

  function getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      "BORRADOR": "Borrador",
      "ENVIADA": "Enviada",
      "PARCIAL": "Parcial",
      "RECIBIDA": "Recibida",
      "CANCELACION_PENDIENTE": "Cancelación Pendiente",
      "CANCELADA": "Cancelada",
      "PENDIENTE": "Pendiente",
      "PAGADA": "Pagada",
      "PARCIAL_PAGADA": "Parcialmente Pagada",
      "DRAFT": "Borrador",
      "PENDING": "Pendiente",
      "ACTIVE": "Activo",
      "INACTIVE": "Inactivo",
    };
    return statusMap[status] || status;
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "BORRADOR":
        return "bg-slate-700 text-slate-300";
      case "ENVIADA":
        return "bg-blue-900/40 text-blue-300";
      case "PARCIAL":
        return "bg-yellow-900/40 text-yellow-300";
      case "RECIBIDA":
        return "bg-green-900/40 text-green-300";
      case "CANCELACION_PENDIENTE":
        return "bg-orange-900/40 text-orange-300";
      case "CANCELADA":
        return "bg-red-900/40 text-red-300";
      case "PENDIENTE":
        return "bg-red-900/40 text-red-300";
      case "PAGADA":
        return "bg-green-900/40 text-green-300";
      case "PARCIAL_PAGADA":
        return "bg-yellow-900/40 text-yellow-300";
      default:
        return "bg-slate-700 text-slate-300";
    }
  }

  function getVencimientoColor(fechaVencimiento: string): string {
    if (!fechaVencimiento) return "bg-slate-700 text-slate-300";
    const today = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diffDays = Math.ceil((vencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "bg-red-900/40 text-red-300"; // Vencido
    if (diffDays <= 7) return "bg-yellow-900/40 text-yellow-300"; // Próximo
    return "bg-green-900/40 text-green-300"; // Vigente
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
          <h2 className="text-3xl font-bold">Compras</h2>
          <p className="text-slate-400">Gestión de órdenes de compra y facturas</p>
        </div>

        <div className="flex gap-2 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("ordenes")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "ordenes"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Órdenes de Compra
          </button>
          <button
            onClick={() => setActiveTab("recepcion")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "recepcion"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Recepción
          </button>
          <button
            onClick={() => setActiveTab("facturas")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "facturas"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Facturas
          </button>
          <button
            onClick={() => setActiveTab("cuentas-pagar")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "cuentas-pagar"
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Cuentas por Pagar
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
            {/* TAB 1: Órdenes de Compra */}
            {activeTab === "ordenes" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Órdenes de Compra</h3>
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={() => setOrderModalOpen(true)}>
                    + Nueva OC
                  </button>
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">Número</th>
                        <th className="p-2">Proveedor</th>
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Total</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-t border-slate-800">
                          <td className="p-2 font-medium">{order.numero}</td>
                          <td className="p-2">{getSupplierName(order.supplierId)}</td>
                          <td className="p-2">{order.fecha}</td>
                          <td className="p-2">{Number(order.total).toFixed(2)}</td>
                          <td className="p-2">
                            <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              <button className="rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600" onClick={() => handleViewOrder(order)}>
                                Ver
                              </button>
                              {order.status === "BORRADOR" && (
                                <button className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700">
                                  Editar
                                </button>
                              )}
                              {order.status === "BORRADOR" && (
                                <button className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700" onClick={() => markOrderAsSent(order.id)}>
                                  Enviar
                                </button>
                              )}
                              {order.status !== "CANCELADA" && order.status !== "CANCELACION_PENDIENTE" && (
                                <button className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700" onClick={() => handleRequestCancellation(order)}>
                                  Cancelar
                                </button>
                              )}
                              {(userRole === "ADMIN" || userRole === "SOPORTE") && order.status === "CANCELACION_PENDIENTE" && (
                                <button className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700" onClick={() => approveCancellation(order.id)}>
                                  Aprobar Cancelación
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-white">{order.numero}</p>
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 mb-3">
                        <p><span className="text-slate-500">Proveedor:</span> {getSupplierName(order.supplierId)}</p>
                        <p><span className="text-slate-500">Fecha:</span> {order.fecha}</p>
                        <p><span className="text-slate-500">Total:</span> {Number(order.total).toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600" onClick={() => handleViewOrder(order)}>
                          Ver
                        </button>
                        {order.status === "BORRADOR" && (
                          <button className="flex-1 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700" onClick={() => markOrderAsSent(order.id)}>
                            Enviar
                          </button>
                        )}
                        {order.status !== "CANCELADA" && order.status !== "CANCELACION_PENDIENTE" && (
                          <button className="flex-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700" onClick={() => handleRequestCancellation(order)}>
                            Cancelar
                          </button>
                        )}
                        {(userRole === "ADMIN" || userRole === "SOPORTE") && order.status === "CANCELACION_PENDIENTE" && (
                          <button className="flex-1 rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700" onClick={() => approveCancellation(order.id)}>
                            Aprobar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Recepción */}
            {activeTab === "recepcion" && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Recepción de Mercancía</h3>
                <p className="text-slate-400 mb-4">Órdenes enviadas pendientes de recepción</p>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">Número</th>
                        <th className="p-2">Proveedor</th>
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Total</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-t border-slate-800">
                          <td className="p-2 font-medium">{order.numero}</td>
                          <td className="p-2">{getSupplierName(order.supplierId)}</td>
                          <td className="p-2">{order.fecha}</td>
                          <td className="p-2">{Number(order.total).toFixed(2)}</td>
                          <td className="p-2">
                            <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </td>
                          <td className="p-2">
                            <button className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700" onClick={() => handleReceiveOrder(order)}>
                              Recibir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-white">{order.numero}</p>
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 mb-3">
                        <p><span className="text-slate-500">Proveedor:</span> {getSupplierName(order.supplierId)}</p>
                        <p><span className="text-slate-500">Total:</span> {Number(order.total).toFixed(2)}</p>
                      </div>
                      <button className="w-full rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700" onClick={() => handleReceiveOrder(order)}>
                        Recibir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Facturas */}
            {activeTab === "facturas" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Facturas de Compra</h3>
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={() => setInvoiceModalOpen(true)}>
                    + Capturar Factura
                  </button>
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">Número</th>
                        <th className="p-2">Proveedor</th>
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Vencimiento</th>
                        <th className="p-2">Total</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-t border-slate-800">
                          <td className="p-2 font-medium">{invoice.numero}</td>
                          <td className="p-2">{getSupplierName(invoice.supplierId)}</td>
                          <td className="p-2">{invoice.fecha}</td>
                          <td className="p-2">{invoice.fechaVencimiento || "-"}</td>
                          <td className="p-2">{Number(invoice.total).toFixed(2)}</td>
                          <td className="p-2">
                            <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(invoice.status)}`}>
                              {getStatusLabel(invoice.status)}
                            </span>
                          </td>
                          <td className="p-2">
                            <button className="rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600" onClick={() => handleViewInvoice(invoice)}>
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-white">{invoice.numero}</p>
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(invoice.status)}`}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 mb-3">
                        <p><span className="text-slate-500">Proveedor:</span> {getSupplierName(invoice.supplierId)}</p>
                        <p><span className="text-slate-500">Vencimiento:</span> {invoice.fechaVencimiento || "-"}</p>
                        <p><span className="text-slate-500">Total:</span> {Number(invoice.total).toFixed(2)}</p>
                      </div>
                      <button className="w-full rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600" onClick={() => handleViewInvoice(invoice)}>
                        Ver
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: Cuentas por Pagar */}
            {activeTab === "cuentas-pagar" && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Cuentas por Pagar</h3>
                <div className="space-y-4">
                  {accountsPayable.map((group) => (
                    <div key={group.supplierId} className="rounded-lg border border-slate-800 bg-slate-800 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <p className="font-semibold text-white">{getSupplierName(group.supplierId)}</p>
                        <p className="text-sm text-slate-400">Total pendiente: {Number(group.totalPendiente).toFixed(2)}</p>
                      </div>
                      <div className="space-y-2">
                        {group.facturas.map((invoice: Purchase) => (
                          <div key={invoice.id} className="flex justify-between items-center p-2 rounded bg-slate-900">
                            <div>
                              <p className="text-sm text-white">{invoice.numero}</p>
                              <p className="text-xs text-slate-400">Vence: {invoice.fechaVencimiento || "-"}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs px-2 py-1 rounded ${getVencimientoColor(invoice.fechaVencimiento)}`}>
                                {Number(invoice.total) - Number(invoice.montoPagado)} pendiente
                              </span>
                              <button className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700" onClick={() => handlePayment(invoice)}>
                                Pagar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <CreateOrderModal
          open={orderModalOpen}
          onClose={() => setOrderModalOpen(false)}
          onCreated={() => { loadOrders(); setOrderModalOpen(false); }}
          suppliers={suppliers}
        />

        <ReceiveOrderModal
          open={receiveModalOpen}
          onClose={() => setReceiveModalOpen(false)}
          onReceived={() => { loadOrders("ENVIADA"); setReceiveModalOpen(false); }}
          order={selectedOrder}
        />

        <CreateInvoiceModal
          open={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          onCreated={() => { loadInvoices(); setInvoiceModalOpen(false); }}
          suppliers={suppliers}
          orders={orders}
        />

        {/* Modal de Solicitud de Cancelación */}
        {cancelModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Solicitar Cancelación</h3>
              <p className="text-slate-400 mb-4">
                ¿Solicitar cancelación de {selectedOrder.numero}?
              </p>
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1">Motivo de cancelación *</label>
                <textarea
                  value={cancelMotivo}
                  onChange={(e) => setCancelMotivo(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setCancelModalOpen(false); setCancelMotivo(""); }}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => selectedOrder && requestCancellation(selectedOrder.id)}
                  disabled={!cancelMotivo}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
                >
                  Solicitar Cancelación
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Registro de Pago */}
        {paymentModalOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Registrar Pago</h3>
              <p className="text-slate-400 mb-4">
                Factura: {selectedInvoice.numero}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Monto a pagar</label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Cuenta bancaria origen</label>
                  <select 
                    value={paymentData.accountId}
                    onChange={(e) => setPaymentData({ ...paymentData, accountId: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">Seleccionar cuenta</option>
                    {bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - ${account.balance}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Fecha de pago</label>
                  <input
                    type="date"
                    value={paymentData.fechaPago}
                    onChange={(e) => setPaymentData({ ...paymentData, fechaPago: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Referencia/Número de transferencia</label>
                  <input
                    type="text"
                    value={paymentData.referencia}
                    onChange={(e) => setPaymentData({ ...paymentData, referencia: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Notas (opcional)</label>
                  <textarea
                    value={paymentData.notas}
                    onChange={(e) => setPaymentData({ ...paymentData, notas: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
                    rows={2}
                  />
                </div>
              </div>
              {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setPaymentModalOpen(false); setSelectedInvoice(null); setError(""); }}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={registerPayment}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Registrar Pago
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalle de OC */}
        {viewOrderModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
              <div className="flex-shrink-0 p-6 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedOrder.numero}</h3>
                    <p className="text-sm text-slate-400">{getSupplierName(selectedOrder.supplierId)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`rounded-full px-3 py-1 text-sm ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusLabel(selectedOrder.status)}
                    </span>
                    <button
                      onClick={() => { setViewOrderModalOpen(false); setSelectedOrder(null); }}
                      className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-slate-400">Fecha</p>
                    <p className="text-white">{selectedOrder.fecha}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Fecha entrega esperada</p>
                    <p className="text-white">{selectedOrder.fechaEntregaEsperada || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Subtotal</p>
                    <p className="text-white">{Number(selectedOrder.subtotal).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total</p>
                    <p className="text-white font-bold">{Number(selectedOrder.total).toFixed(2)}</p>
                  </div>
                </div>

                {selectedOrder.notas && (
                  <div className="mb-6">
                    <p className="text-xs text-slate-400 mb-1">Notas</p>
                    <p className="text-white">{selectedOrder.notas}</p>
                  </div>
                )}

                <h4 className="text-lg font-semibold text-white mb-3">Artículos</h4>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2">Descripción</th>
                        <th className="p-2">Cantidad</th>
                        <th className="p-2">Precio Unitario</th>
                        <th className="p-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item: any, index: number) => (
                        <tr key={index} className="border-t border-slate-800">
                          <td className="p-2">{item.descripcion}</td>
                          <td className="p-2">{item.cantidad}</td>
                          <td className="p-2">{Number(item.precioUnitario).toFixed(2)}</td>
                          <td className="p-2">{Number(item.subtotal || item.cantidad * item.precioUnitario).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Historial de Cambios</h4>
                    <div className="space-y-2">
                      {selectedOrder.statusHistory.map((entry: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg bg-slate-800">
                          <div className="flex justify-between items-center">
                            <span className={`text-sm px-2 py-1 rounded ${getStatusColor(entry.status)}`}>
                              {getStatusLabel(entry.status)}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(entry.fecha).toLocaleString()}
                            </span>
                          </div>
                          {entry.motivo && (
                            <p className="text-sm text-slate-300 mt-2">{entry.motivo}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalle de Factura */}
        {viewInvoiceModalOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
              <div className="flex-shrink-0 p-6 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedInvoice.numero}</h3>
                    <p className="text-sm text-slate-400">{getSupplierName(selectedInvoice.supplierId)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`rounded-full px-3 py-1 text-sm ${getStatusColor(selectedInvoice.status)}`}>
                      {getStatusLabel(selectedInvoice.status)}
                    </span>
                    <button
                      onClick={() => { setViewInvoiceModalOpen(false); setSelectedInvoice(null); }}
                      className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-slate-400">Fecha</p>
                    <p className="text-white">{selectedInvoice.fecha}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Vencimiento</p>
                    <p className="text-white">{selectedInvoice.fechaVencimiento || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Método de pago</p>
                    <p className="text-white">{selectedInvoice.metodoPago || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total</p>
                    <p className="text-white font-bold">{Number(selectedInvoice.total).toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-slate-400">Subtotal</p>
                    <p className="text-white">{Number(selectedInvoice.subtotal).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Impuestos</p>
                    <p className="text-white">{Number(selectedInvoice.impuestos).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Pagado</p>
                    <p className="text-white">{Number(selectedInvoice.montoPagado).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Saldo pendiente</p>
                    <p className="text-white font-bold">{(Number(selectedInvoice.total) - Number(selectedInvoice.montoPagado)).toFixed(2)}</p>
                  </div>
                </div>

                <h4 className="text-lg font-semibold text-white mb-3">Artículos</h4>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2">Descripción</th>
                        <th className="p-2">Cantidad</th>
                        <th className="p-2">Precio Unitario</th>
                        <th className="p-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((item: any, index: number) => (
                        <tr key={index} className="border-t border-slate-800">
                          <td className="p-2">{item.descripcion}</td>
                          <td className="p-2">{item.cantidad}</td>
                          <td className="p-2">{Number(item.precioUnitario).toFixed(2)}</td>
                          <td className="p-2">{Number(item.subtotal || item.cantidad * item.precioUnitario).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedInvoice.ocId && (
                  <div className="mb-6">
                    <p className="text-xs text-slate-400">Orden de compra relacionada</p>
                    <p className="text-white">{selectedInvoice.ocId}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </MainLayout>
  );
}
