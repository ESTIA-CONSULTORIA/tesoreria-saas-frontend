import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import ReportsFiltersModal from "./ReportsFiltersModal";

export default function ReportsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [categorySummary, setCategorySummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadReports();
  }, [startDate, endDate]);

  async function loadReports() {
    try {
      setLoading(true);
      setError("");
      const [cashRes, balanceRes, categoryRes] = await Promise.all([
        api.get("/reports/cash-flow", { params: { startDate, endDate } }),
        api.get("/reports/balance-by-account"),
        api.get("/reports/category-summary", { params: { startDate, endDate } }),
      ]);

      setCashFlow(cashRes.data);
      setBalances(Array.isArray(balanceRes.data) ? balanceRes.data : []);
      setCategorySummary(Array.isArray(categoryRes.data) ? categoryRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar reportes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <ReportsFiltersModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        startDate={startDate}
        endDate={endDate}
        onApply={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }}
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Reportes</h2>
            <p className="text-slate-400">Flujo de efectivo, balance y categorias</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
            Filtros
          </button>
        </div>

        {error && <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">{error}</div>}
        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando reportes...</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-3 text-lg font-semibold">Flujo de efectivo</h3>
              <p className="text-sm text-slate-400">Ingresos: {Number(cashFlow?.income || 0)}</p>
              <p className="text-sm text-slate-400">Egresos: {Number(cashFlow?.expense || 0)}</p>
              <p className="text-sm text-white">Neto: {Number(cashFlow?.net || 0)}</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-3 text-lg font-semibold">Balance por cuenta</h3>
              <div className="space-y-2">
                {balances.map((row) => (
                  <div key={row.accountId} className="text-sm text-slate-300">
                    {row.accountName} ({row.bank}) - {Number(row.balance)} {row.currency}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-3 text-lg font-semibold">Resumen por categoria</h3>
              <div className="space-y-2">
                {categorySummary.map((row, index) => (
                  <div key={`${row.category}-${index}`} className="text-sm text-slate-300">
                    {row.category} ({row.type}) - {Number(row.total)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
