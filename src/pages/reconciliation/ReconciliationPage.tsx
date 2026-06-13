import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import useDebounce from "../../core/hooks/useDebounce";
import ImportModal from "./ImportModal";
import ExecutiveKPI from "../../components/ExecutiveKPI";
import { useCompanyStore } from "../../core/store/useCompanyStore";

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: "EMITIDA" | "RECIBIDA";
  status: "PAGADA" | "PENDIENTE_COBRO" | "PENDIENTE_PAGO";
  reconciliationStatus: "CONCILIADA" | "PENDIENTE" | "NO_CONCILIADA";
  amount: number;
  dueDate: string;
  paymentDate?: string;
  concept?: string;
  needsManualReview: boolean;
  movementId?: string;
  bankAccountId?: string;
  bankName?: string;
  createdAt: string;
}

interface Movement {
  id: string;
  accountId: string;
  bankName?: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  concept?: string;
  createdAt: string;
}

interface ReconciliationData {
  reconciled: Array<{ invoice: Invoice; movement: Movement }>;
  pending: Invoice[];
  notReconciled: Movement[];
}

export default function ReconciliationPage() {
  const { activeCompany } = useCompanyStore();
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"reconciled" | "pending" | "notReconciled">("reconciled");
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"manual" | "import">("manual");
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [availableMovements, setAvailableMovements] = useState<Movement[]>([]);
  const [filters, setFilters] = useState({
    bankAccountId: "",
    startDate: "",
    endDate: "",
    type: "" as "EMITIDA" | "RECIBIDA" | "",
  });
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    type: "EMITIDA" as "EMITIDA" | "RECIBIDA",
    status: "PENDIENTE_PAGO" as "PAGADA" | "PENDIENTE_COBRO" | "PENDIENTE_PAGO",
    amount: "",
    dueDate: "",
    bankAccountId: "",
    concept: "",
  });

  const debouncedFilters = useDebounce(filters, 400);

  useEffect(() => {
    loadData();
  }, [debouncedFilters, activeCompany?.id]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [dataRes, summaryRes] = await Promise.all([
        api.get("/reconciliation/data", { params: debouncedFilters }),
        api.get("/reconciliation/summary"),
      ]);
      setReconciliationData(dataRes.data);
      setSummary(summaryRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar los datos de conciliación");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/reconciliation", {
        ...formData,
        amount: Number(formData.amount),
        dueDate: new Date(formData.dueDate),
        bankAccountId: formData.bankAccountId || undefined,
      });
      setModalOpen(false);
      setFormData({
        invoiceNumber: "",
        type: "EMITIDA",
        status: "PENDIENTE_PAGO",
        amount: "",
        dueDate: "",
        bankAccountId: "",
        concept: "",
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible crear la factura");
    }
  }

  async function handleManualReconciliation(invoice: Invoice) {
    setSelectedInvoice(invoice);
    try {
      const movementsRes = await api.get("/reconciliation/movements", {
        params: { bankAccountId: invoice.bankAccountId },
      });
      setAvailableMovements(Array.isArray(movementsRes.data) ? movementsRes.data : []);
      setReconcileModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar movimientos");
    }
  }

  async function confirmReconciliation(movementId: string) {
    if (!selectedInvoice) return;
    try {
      await api.post(`/reconciliation/${selectedInvoice.id}/reconcile`, { movementId });
      setReconcileModalOpen(false);
      setSelectedInvoice(null);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible conciliar");
    }
  }

  function getInvoiceTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
      "EMITIDA": "Emitida",
      "RECIBIDA": "Recibida",
    };
    return typeMap[type] || type;
  }

  function getInvoiceStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      "PAGADA": "Pagada",
      "PENDIENTE_COBRO": "Pendiente de Cobro",
      "PENDIENTE_PAGO": "Pendiente de Pago",
    };
    return statusMap[status] || status;
  }

  function getMovementTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
      "INCOME": "Ingreso",
      "EXPENSE": "Egreso",
      "TRANSFER": "Transferencia",
    };
    return typeMap[type] || type;
  }

  return (
    <MainLayout>
      {!activeCompany ? (
        <div style={{ padding: '24px', backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', color: '#8A6A3A', textAlign: 'center' }}>
          Selecciona una empresa para ver los datos
        </div>
      ) : (
        <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold" style={{ color: '#F5F5F5' }}>Conciliación Bancaria</h2>
            <p style={{ color: '#A3A3A3', fontSize: '14px' }}>Cruce de movimientos bancarios con facturas</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setImportModalOpen(true)}
              className="px-4 py-2 font-medium text-sm"
              style={{
                backgroundColor: '#2D2D2D',
                color: '#F5F5F5',
                borderRadius: '4px',
                border: '1px solid #2D2D2D',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D3D3D'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2D2D2D'}
            >
              Importar Facturas
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 font-medium text-sm"
              style={{
                backgroundColor: '#C0C0C0',
                color: '#0A0A0A',
                borderRadius: '4px',
                border: '1px solid #C0C0C0',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E8E8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C0C0C0'}
            >
              + Captura Manual
            </button>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#2D2D2D', border: '1px solid #C53030', borderRadius: '6px', padding: '16px', color: '#F5F5F5' }}>
            {error}
          </div>
        )}

        {/* Filtros */}
        <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '16px' }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={{
                backgroundColor: '#0F0F0F',
                color: '#F5F5F5',
                borderRadius: '4px',
                border: '1px solid #2D2D2D',
                padding: '8px 12px',
                fontSize: '13px',
              }}
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{
                backgroundColor: '#0F0F0F',
                color: '#F5F5F5',
                borderRadius: '4px',
                border: '1px solid #2D2D2D',
                padding: '8px 12px',
                fontSize: '13px',
              }}
            />
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
              style={{
                backgroundColor: '#0F0F0F',
                color: '#F5F5F5',
                borderRadius: '4px',
                border: '1px solid #2D2D2D',
                padding: '8px 12px',
                fontSize: '13px',
              }}
            >
              <option value="">Todos los tipos</option>
              <option value="EMITIDA">Emitidas</option>
              <option value="RECIBIDA">Recibidas</option>
            </select>
            <button
              onClick={() => setFilters({ bankAccountId: "", startDate: "", endDate: "", type: "" })}
              className="p-2 text-sm font-medium"
              style={{
                backgroundColor: '#2D2D2D',
                color: '#F5F5F5',
                borderRadius: '4px',
                border: '1px solid #2D2D2D',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D3D3D'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2D2D2D'}
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '24px', color: '#A3A3A3' }}>
            Cargando datos...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Executive KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ExecutiveKPI
                label="Total"
                value={summary?.total || 0}
                context="Total de registros"
              />
              <ExecutiveKPI
                label="Conciliadas"
                value={summary?.conciliadas || 0}
                context="Facturas conciliadas"
                trend="up"
              />
              <ExecutiveKPI
                label="Pendientes"
                value={summary?.pendientes || 0}
                context="Facturas pendientes de conciliar"
                trend="neutral"
              />
              <ExecutiveKPI
                label="No Conciliadas"
                value={summary?.noConciliadas || 0}
                context="Movimientos sin factura"
                trend="down"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b overflow-x-auto" style={{ borderColor: '#2D2D2D' }}>
              <button
                onClick={() => setActiveTab("reconciled")}
                className="px-4 py-2 text-sm font-medium"
                style={{
                  color: activeTab === "reconciled" ? '#2F855A' : '#A3A3A3',
                  borderBottom: activeTab === "reconciled" ? '2px solid #2F855A' : '2px solid transparent',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => { if (activeTab !== "reconciled") e.currentTarget.style.color = '#F5F5F5'; }}
                onMouseLeave={(e) => { if (activeTab !== "reconciled") e.currentTarget.style.color = '#A3A3A3'; }}
              >
                Conciliados ({reconciliationData?.reconciled?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className="px-4 py-2 text-sm font-medium"
                style={{
                  color: activeTab === "pending" ? '#B7791F' : '#A3A3A3',
                  borderBottom: activeTab === "pending" ? '2px solid #B7791F' : '2px solid transparent',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => { if (activeTab !== "pending") e.currentTarget.style.color = '#F5F5F5'; }}
                onMouseLeave={(e) => { if (activeTab !== "pending") e.currentTarget.style.color = '#A3A3A3'; }}
              >
                Pendientes ({reconciliationData?.pending?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("notReconciled")}
                className="px-4 py-2 text-sm font-medium"
                style={{
                  color: activeTab === "notReconciled" ? '#C53030' : '#A3A3A3',
                  borderBottom: activeTab === "notReconciled" ? '2px solid #C53030' : '2px solid transparent',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => { if (activeTab !== "notReconciled") e.currentTarget.style.color = '#F5F5F5'; }}
                onMouseLeave={(e) => { if (activeTab !== "notReconciled") e.currentTarget.style.color = '#A3A3A3'; }}
              >
                No Conciliados ({reconciliationData?.notReconciled?.length || 0})
              </button>
            </div>

            {/* Tabla de conciliados */}
            {activeTab === "reconciled" && (
              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '12px' }}>Conciliados (Factura + Movimiento)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left" style={{ fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#0F0F0F', borderBottom: '1px solid #2D2D2D' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Factura</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tipo</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Monto Factura</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Movimiento</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Monto Movimiento</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Cuenta</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationData?.reconciled?.map((item, index) => (
                        <tr 
                          key={item.invoice.id}
                          style={{ 
                            backgroundColor: index % 2 === 0 ? '#0A0A0A' : '#0F0F0F',
                            borderBottom: index < reconciliationData.reconciled.length - 1 ? '1px solid #2D2D2D' : 'none',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1F1F1F'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#0A0A0A' : '#0F0F0F'}
                        >
                          <td style={{ padding: '12px 16px', color: '#F5F5F5' }}>{item.invoice.invoiceNumber}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{item.invoice.type}</td>
                          <td style={{ padding: '12px 16px', color: '#F5F5F5', fontWeight: 600 }}>${Number(item.invoice.amount).toFixed(2)}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{item.movement.id}</td>
                          <td style={{ padding: '12px 16px', color: '#F5F5F5', fontWeight: 600 }}>${Number(item.movement.amount).toFixed(2)}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{item.invoice.bankName || item.movement.bankName}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{new Date(item.invoice.dueDate).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tabla de pendientes */}
            {activeTab === "pending" && (
              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '12px' }}>Pendientes (Facturas sin movimiento)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left" style={{ fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#0F0F0F', borderBottom: '1px solid #2D2D2D' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Número</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tipo</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Estado</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Monto</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Vencimiento</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Cuenta</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Concepto</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationData?.pending?.map((invoice, index) => (
                        <tr 
                          key={invoice.id}
                          style={{ 
                            backgroundColor: index % 2 === 0 ? '#0A0A0A' : '#0F0F0F',
                            borderBottom: index < reconciliationData.pending.length - 1 ? '1px solid #2D2D2D' : 'none',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1F1F1F'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#0A0A0A' : '#0F0F0F'}
                        >
                          <td style={{ padding: '12px 16px', color: '#F5F5F5' }}>{invoice.invoiceNumber}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{getInvoiceTypeLabel(invoice.type)}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{getInvoiceStatusLabel(invoice.status)}</td>
                          <td style={{ padding: '12px 16px', color: '#F5F5F5', fontWeight: 600 }}>${Number(invoice.amount).toFixed(2)}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{new Date(invoice.dueDate).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{invoice.bankName || "-"}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{invoice.concept || "-"}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <button
                              onClick={() => handleManualReconciliation(invoice)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: '#C0C0C0',
                                color: '#0A0A0A',
                                border: '1px solid #C0C0C0',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E8E8'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C0C0C0'}
                            >
                              Conciliar Manual
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tabla de no conciliados */}
            {activeTab === "notReconciled" && (
              <div style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '6px', padding: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5', marginBottom: '12px' }}>No Conciliados (Movimientos sin factura)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left" style={{ fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#0F0F0F', borderBottom: '1px solid #2D2D2D' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>ID Movimiento</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tipo</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Categoría</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Monto</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Cuenta</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Concepto</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#7E7E7E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationData?.notReconciled?.map((movement, index) => (
                        <tr 
                          key={movement.id}
                          style={{ 
                            backgroundColor: index % 2 === 0 ? '#0A0A0A' : '#0F0F0F',
                            borderBottom: index < reconciliationData.notReconciled.length - 1 ? '1px solid #2D2D2D' : 'none',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1F1F1F'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#0A0A0A' : '#0F0F0F'}
                        >
                          <td style={{ padding: '12px 16px', color: '#F5F5F5' }}>{movement.id}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{getMovementTypeLabel(movement.type)}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{movement.category}</td>
                          <td style={{ padding: '12px 16px', color: '#F5F5F5', fontWeight: 600 }}>${Number(movement.amount).toFixed(2)}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{movement.bankName}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{movement.concept || "-"}</td>
                          <td style={{ padding: '12px 16px', color: '#A3A3A3' }}>{new Date(movement.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal de nueva factura */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div style={{ width: '100%', maxWidth: '512px', borderRadius: '8px', border: '1px solid #2D2D2D', backgroundColor: '#161616', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#F5F5F5' }}>Nueva Factura</h3>
                  <p style={{ fontSize: '13px', color: '#7E7E7E' }}>Registro de factura para conciliación</p>
                </div>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setModalTab("manual");
                  }}
                  className="px-3 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: '#2D2D2D',
                    color: '#F5F5F5',
                    borderRadius: '4px',
                    border: '1px solid #2D2D2D',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D3D3D'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2D2D2D'}
                >
                  Cerrar
                </button>
              </div>

              {/* Tabs del modal */}
              <div className="flex gap-2 border-b mb-4" style={{ borderColor: '#2D2D2D' }}>
                <button
                  onClick={() => setModalTab("manual")}
                  className="px-4 py-2 text-sm font-medium"
                  style={{
                    color: modalTab === "manual" ? '#C0C0C0' : '#A3A3A3',
                    borderBottom: modalTab === "manual" ? '2px solid #C0C0C0' : '2px solid transparent',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => { if (modalTab !== "manual") e.currentTarget.style.color = '#F5F5F5'; }}
                  onMouseLeave={(e) => { if (modalTab !== "manual") e.currentTarget.style.color = '#A3A3A3'; }}
                >
                  Captura Manual
                </button>
                <button
                  onClick={() => setModalTab("import")}
                  className="px-4 py-2 text-sm font-medium"
                  style={{
                    color: modalTab === "import" ? '#C0C0C0' : '#A3A3A3',
                    borderBottom: modalTab === "import" ? '2px solid #C0C0C0' : '2px solid transparent',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => { if (modalTab !== "import") e.currentTarget.style.color = '#F5F5F5'; }}
                  onMouseLeave={(e) => { if (modalTab !== "import") e.currentTarget.style.color = '#A3A3A3'; }}
                >
                  Importación Masiva
                </button>
              </div>

              {modalTab === "manual" && (
                <form onSubmit={handleCreateInvoice} className="space-y-4">
                  <input
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="Número de factura"
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0F0F0F',
                      color: '#F5F5F5',
                      borderRadius: '4px',
                      border: '1px solid #2D2D2D',
                      padding: '10px 12px',
                      fontSize: '13px',
                    }}
                  />
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    style={{
                      width: '100%',
                      backgroundColor: '#0F0F0F',
                      color: '#F5F5F5',
                      borderRadius: '4px',
                      border: '1px solid #2D2D2D',
                      padding: '10px 12px',
                      fontSize: '13px',
                    }}
                  >
                    <option value="EMITIDA">Emitida</option>
                    <option value="RECIBIDA">Recibida</option>
                  </select>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    style={{
                      width: '100%',
                      backgroundColor: '#0F0F0F',
                      color: '#F5F5F5',
                      borderRadius: '4px',
                      border: '1px solid #2D2D2D',
                      padding: '10px 12px',
                      fontSize: '13px',
                    }}
                  >
                    <option value="PENDIENTE_PAGO">Pendiente de Pago</option>
                    <option value="PENDIENTE_COBRO">Pendiente de Cobro</option>
                    <option value="PAGADA">Pagada</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Monto"
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0F0F0F',
                      color: '#F5F5F5',
                      borderRadius: '4px',
                      border: '1px solid #2D2D2D',
                      padding: '10px 12px',
                      fontSize: '13px',
                    }}
                  />
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    placeholder="Fecha de vencimiento"
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0F0F0F',
                      color: '#F5F5F5',
                      borderRadius: '4px',
                      border: '1px solid #2D2D2D',
                      padding: '10px 12px',
                      fontSize: '13px',
                    }}
                  />
                  <input
                    value={formData.bankAccountId}
                    onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                    placeholder="ID Cuenta Bancaria (opcional)"
                    style={{
                      width: '100%',
                      backgroundColor: '#0F0F0F',
                      color: '#F5F5F5',
                      borderRadius: '4px',
                      border: '1px solid #2D2D2D',
                      padding: '10px 12px',
                      fontSize: '13px',
                    }}
                  />
                  <input
                    value={formData.concept}
                    onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                    placeholder="Concepto"
                    style={{
                      width: '100%',
                      backgroundColor: '#0F0F0F',
                      color: '#F5F5F5',
                      borderRadius: '4px',
                      border: '1px solid #2D2D2D',
                      padding: '10px 12px',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '4px',
                      backgroundColor: '#C0C0C0',
                      color: '#0A0A0A',
                      border: '1px solid #C0C0C0',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E8E8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C0C0C0'}
                  >
                    Guardar Factura
                  </button>
                </form>
              )}

              {modalTab === "import" && (
                <div className="text-center py-8">
                  <p style={{ color: '#7E7E7E', marginBottom: '16px' }}>Usa el botón "Importar Facturas" en la página principal para importar múltiples facturas</p>
                  <button
                    onClick={() => {
                      setModalOpen(false);
                      setModalTab("manual");
                      setImportModalOpen(true);
                    }}
                    className="px-4 py-2 font-medium"
                    style={{
                      backgroundColor: '#C0C0C0',
                      color: '#0A0A0A',
                      borderRadius: '4px',
                      border: '1px solid #C0C0C0',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E8E8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C0C0C0'}
                  >
                    Ir a Importación Masiva
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de conciliación manual */}
        {reconcileModalOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div style={{ width: '100%', maxWidth: '512px', borderRadius: '8px', border: '1px solid #2D2D2D', backgroundColor: '#161616', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#F5F5F5' }}>Conciliación Manual</h3>
                  <p style={{ fontSize: '13px', color: '#7E7E7E' }}>Factura: {selectedInvoice.invoiceNumber}</p>
                </div>
                <button
                  onClick={() => setReconcileModalOpen(false)}
                  className="px-3 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: '#2D2D2D',
                    color: '#F5F5F5',
                    borderRadius: '4px',
                    border: '1px solid #2D2D2D',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D3D3D'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2D2D2D'}
                >
                  Cerrar
                </button>
              </div>
              <div className="space-y-4">
                <p style={{ fontSize: '13px', color: '#7E7E7E' }}>Seleccione un movimiento para conciliar:</p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {availableMovements.map((movement, index) => (
                    <button
                      key={movement.id}
                      onClick={() => confirmReconciliation(movement.id)}
                      className="w-full p-3 text-left transition-colors"
                      style={{
                        borderRadius: '4px',
                        border: '1px solid #2D2D2D',
                        backgroundColor: index % 2 === 0 ? '#0A0A0A' : '#0F0F0F',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1F1F1F'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#0A0A0A' : '#0F0F0F'}
                    >
                      <div className="flex justify-between">
                        <span style={{ fontSize: '13px', color: '#F5F5F5' }}>{movement.id}</span>
                        <span style={{ fontSize: '13px', color: '#A3A3A3' }}>${Number(movement.amount).toFixed(2)}</span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#7E7E7E' }}>{movement.concept || movement.category}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de importación masiva */}
        <ImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImported={loadData}
        />
      </div>
      )}
    </MainLayout>
  );
}
