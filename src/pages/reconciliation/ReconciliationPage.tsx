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
  createdAt: string;
}

export default function ReconciliationPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "conciliadas" | "pendientes" | "noConciliadas">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    type: "EMITIDA" as "EMITIDA" | "RECIBIDA",
    status: "PENDIENTE_PAGO" as "PAGADA" | "PENDIENTE_COBRO" | "PENDIENTE_PAGO",
    amount: "",
    dueDate: "",
    concept: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [invoicesRes, summaryRes] = await Promise.all([
        api.get("/reconciliation"),
        api.get("/reconciliation/summary"),
      ]);
      setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
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
      });
      setModalOpen(false);
      setFormData({
        invoiceNumber: "",
        type: "EMITIDA",
        status: "PENDIENTE_PAGO",
        amount: "",
        dueDate: "",
        concept: "",
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible crear la factura");
    }
  }

  async function handleUpdateStatus(id: string, status: "CONCILIADA" | "PENDIENTE" | "NO_CONCILIADA") {
    try {
      await api.put(`/reconciliation/${id}/status`, { status });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible actualizar el estado");
    }
  }

  async function handleManualReview(id: string) {
    try {
      await api.put(`/reconciliation/${id}/manual-review`);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible marcar para revisión manual");
    }
  }

  const filteredInvoices = invoices.filter((invoice) => {
    if (activeTab === "all") return true;
    return invoice.reconciliationStatus === activeTab.toUpperCase();
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Conciliación Bancaria</h2>
            <p className="text-slate-400">Gestión de facturas y conciliación</p>
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
            <div className="flex gap-2 border-b border-slate-800">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "all" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400"
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setActiveTab("conciliadas")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "conciliadas" ? "text-green-400 border-b-2 border-green-400" : "text-slate-400"
                }`}
              >
                Conciliadas
              </button>
              <button
                onClick={() => setActiveTab("pendientes")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "pendientes" ? "text-yellow-400 border-b-2 border-yellow-400" : "text-slate-400"
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setActiveTab("noConciliadas")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "noConciliadas" ? "text-red-400 border-b-2 border-red-400" : "text-slate-400"
                }`}
              >
                No Conciliadas
              </button>
            </div>

            {/* Tabla de facturas */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="p-2">Número</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Estado</th>
                      <th className="p-2">Conciliación</th>
                      <th className="p-2">Monto</th>
                      <th className="p-2">Vencimiento</th>
                      <th className="p-2">Concepto</th>
                      <th className="p-2">Revisión</th>
                      <th className="p-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-t border-slate-800">
                        <td className="p-2">{invoice.invoiceNumber}</td>
                        <td className="p-2">{invoice.type}</td>
                        <td className="p-2">{invoice.status}</td>
                        <td className="p-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              invoice.reconciliationStatus === "CONCILIADA"
                                ? "bg-green-900/40 text-green-300"
                                : invoice.reconciliationStatus === "PENDIENTE"
                                ? "bg-yellow-900/40 text-yellow-300"
                                : "bg-red-900/40 text-red-300"
                            }`}
                          >
                            {invoice.reconciliationStatus}
                          </span>
                        </td>
                        <td className="p-2">${Number(invoice.amount).toFixed(2)}</td>
                        <td className="p-2">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                        <td className="p-2">{invoice.concept || "-"}</td>
                        <td className="p-2">
                          {invoice.needsManualReview && (
                            <span className="rounded-full bg-orange-900/40 px-2 py-1 text-xs text-orange-300">
                              Revisión Manual
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpdateStatus(invoice.id, "CONCILIADA")}
                              className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                            >
                              Conciliar
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(invoice.id, "NO_CONCILIADA")}
                              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                            >
                              Rechazar
                            </button>
                            <button
                              onClick={() => handleManualReview(invoice.id)}
                              className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
                            >
                              Revisar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
      </div>
    </MainLayout>
  );
}
