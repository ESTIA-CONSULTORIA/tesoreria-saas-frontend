import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";

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
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"reconciled" | "pending" | "notReconciled">("reconciled");
  const [modalOpen, setModalOpen] = useState(false);
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

  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [dataRes, summaryRes] = await Promise.all([
        api.get("/reconciliation/data", { params: filters }),
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
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Conciliación Bancaria</h2>
            <p className="text-slate-400">Cruce de movimientos bancarios con facturas</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            + Nueva Factura
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
            {error}
          </div>
        )}

        {/* Filtros */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
            />
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="EMITIDA">Emitidas</option>
              <option value="RECIBIDA">Recibidas</option>
            </select>
            <button
              onClick={() => setFilters({ bankAccountId: "", startDate: "", endDate: "", type: "" })}
              className="rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando datos...</div>
        ) : (
          <div className="space-y-6">
            {/* Resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Total</p>
                <p className="text-2xl font-bold">{summary?.total || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Conciliadas</p>
                <p className="text-2xl font-bold text-green-400">{summary?.conciliadas || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-400">{summary?.pendientes || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">No Conciliadas</p>
                <p className="text-2xl font-bold text-red-400">{summary?.noConciliadas || 0}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-800 overflow-x-auto">
              <button
                onClick={() => setActiveTab("reconciled")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "reconciled" ? "text-green-400 border-b-2 border-green-400" : "text-slate-400"
                }`}
              >
                Conciliados ({reconciliationData?.reconciled?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "pending" ? "text-yellow-400 border-b-2 border-yellow-400" : "text-slate-400"
                }`}
              >
                Pendientes ({reconciliationData?.pending?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("notReconciled")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "notReconciled" ? "text-red-400 border-b-2 border-red-400" : "text-slate-400"
                }`}
              >
                No Conciliados ({reconciliationData?.notReconciled?.length || 0})
              </button>
            </div>

            {/* Tabla de conciliados */}
            {activeTab === "reconciled" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h3 className="mb-3 text-lg font-semibold">Conciliados (Factura + Movimiento)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">Factura</th>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Monto Factura</th>
                        <th className="p-2">Movimiento</th>
                        <th className="p-2">Monto Movimiento</th>
                        <th className="p-2">Cuenta</th>
                        <th className="p-2">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationData?.reconciled?.map((item) => (
                        <tr key={item.invoice.id} className="border-t border-slate-800">
                          <td className="p-2">{item.invoice.invoiceNumber}</td>
                          <td className="p-2">{item.invoice.type}</td>
                          <td className="p-2">${Number(item.invoice.amount).toFixed(2)}</td>
                          <td className="p-2">{item.movement.id}</td>
                          <td className="p-2">${Number(item.movement.amount).toFixed(2)}</td>
                          <td className="p-2">{item.invoice.bankName || item.movement.bankName}</td>
                          <td className="p-2">{new Date(item.invoice.dueDate).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tabla de pendientes */}
            {activeTab === "pending" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h3 className="mb-3 text-lg font-semibold">Pendientes (Facturas sin movimiento)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">Número</th>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2">Monto</th>
                        <th className="p-2">Vencimiento</th>
                        <th className="p-2">Cuenta</th>
                        <th className="p-2">Concepto</th>
                        <th className="p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationData?.pending?.map((invoice) => (
                        <tr key={invoice.id} className="border-t border-slate-800">
                          <td className="p-2">{invoice.invoiceNumber}</td>
                          <td className="p-2">{getInvoiceTypeLabel(invoice.type)}</td>
                          <td className="p-2">{getInvoiceStatusLabel(invoice.status)}</td>
                          <td className="p-2">${Number(invoice.amount).toFixed(2)}</td>
                          <td className="p-2">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                          <td className="p-2">{invoice.bankName || "-"}</td>
                          <td className="p-2">{invoice.concept || "-"}</td>
                          <td className="p-2">
                            <button
                              onClick={() => handleManualReconciliation(invoice)}
                              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
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
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h3 className="mb-3 text-lg font-semibold">No Conciliados (Movimientos sin factura)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-2">ID Movimiento</th>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Categoría</th>
                        <th className="p-2">Monto</th>
                        <th className="p-2">Cuenta</th>
                        <th className="p-2">Concepto</th>
                        <th className="p-2">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationData?.notReconciled?.map((movement) => (
                        <tr key={movement.id} className="border-t border-slate-800">
                          <td className="p-2">{movement.id}</td>
                          <td className="p-2">{getMovementTypeLabel(movement.type)}</td>
                          <td className="p-2">{movement.category}</td>
                          <td className="p-2">${Number(movement.amount).toFixed(2)}</td>
                          <td className="p-2">{movement.bankName}</td>
                          <td className="p-2">{movement.concept || "-"}</td>
                          <td className="p-2">{new Date(movement.createdAt).toLocaleDateString()}</td>
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
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">Nueva Factura</h3>
                  <p className="text-sm text-slate-400">Registro de factura para conciliación</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <input
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="Número de factura"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                />
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="EMITIDA">Emitida</option>
                  <option value="RECIBIDA">Recibida</option>
                </select>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                />
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  placeholder="Fecha de vencimiento"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                />
                <input
                  value={formData.bankAccountId}
                  onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                  placeholder="ID Cuenta Bancaria (opcional)"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                />
                <input
                  value={formData.concept}
                  onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                  placeholder="Concepto"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700"
                >
                  Guardar Factura
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal de conciliación manual */}
        {reconcileModalOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">Conciliación Manual</h3>
                  <p className="text-sm text-slate-400">Factura: {selectedInvoice.invoiceNumber}</p>
                </div>
                <button
                  onClick={() => setReconcileModalOpen(false)}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-slate-400">Seleccione un movimiento para conciliar:</p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {availableMovements.map((movement) => (
                    <button
                      key={movement.id}
                      onClick={() => confirmReconciliation(movement.id)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-left hover:bg-slate-700"
                    >
                      <div className="flex justify-between">
                        <span className="text-sm text-white">{movement.id}</span>
                        <span className="text-sm text-slate-400">${Number(movement.amount).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-slate-500">{movement.concept || movement.category}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
