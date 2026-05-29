import MainLayout from "../../core/layout/MainLayout";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../core/api/api";
import DashboardInfoModal from "./DashboardInfoModal";

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    loadKpis();
  }, []);

  async function loadKpis() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/dashboard/kpis");
      setKpis(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar dashboard");
    } finally {
      setLoading(false);
    }
  }

  const chartPercentages = useMemo(() => {
    const income = Number(kpis?.chart?.income || 0);
    const expense = Number(kpis?.chart?.expense || 0);
    const total = income + expense;
    if (total <= 0) return { income: 0, expense: 0 };
    return {
      income: Math.round((income / total) * 100),
      expense: Math.round((expense / total) * 100),
    };
  }, [kpis]);

  return (
    <MainLayout>
      <DashboardInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
            <p className="text-slate-400 mb-6">Bienvenido a Tesorería SaaS</p>
          </div>
          <button onClick={() => setInfoOpen(true)} className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700">
            Ver info
          </button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">{error}</div>}

        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando dashboard...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-900 p-4 md:p-6">
                <p className="text-xs md:text-sm text-slate-400">Empresas</p>
                <p className="text-lg md:text-2xl font-bold">{kpis?.totalCompanies || 0}</p>
              </div>

              <div className="rounded-xl bg-slate-900 p-4 md:p-6">
                <p className="text-xs md:text-sm text-slate-400">Sucursales</p>
                <p className="text-lg md:text-2xl font-bold">{kpis?.totalBranches || 0}</p>
              </div>

              <div className="rounded-xl bg-slate-900 p-4 md:p-6">
                <p className="text-xs md:text-sm text-slate-400">Saldo total</p>
                <p className="text-lg md:text-2xl font-bold">{Number(kpis?.totalBalance || 0)}</p>
              </div>

              <div className="rounded-xl bg-slate-900 p-4 md:p-6">
                <p className="text-xs md:text-sm text-slate-400">Movimientos</p>
                <p className="text-lg md:text-2xl font-bold">{kpis?.totalMovements || 0}</p>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <div className="rounded-xl bg-slate-900 p-6">
                <h3 className="mb-4 text-lg font-semibold">Ultimos 5 movimientos</h3>
                <div className="space-y-3">
                  {(kpis?.latestMovements || []).map((movement: any) => (
                    <div key={movement.id} className="rounded-lg border border-slate-800 p-3">
                      <p className="text-sm">{movement.concept}</p>
                      <p className="text-xs text-slate-400">
                        {movement.type} · {movement.category} · {Number(movement.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900 p-6">
                <h3 className="mb-4 text-lg font-semibold">Ingresos vs Egresos</h3>
                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-xs text-slate-400">Ingresos ({chartPercentages.income}%)</p>
                    <div className="h-3 w-full rounded bg-slate-800">
                      <div className="h-3 rounded bg-green-600" style={{ width: `${chartPercentages.income}%` }} />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-400">Egresos ({chartPercentages.expense}%)</p>
                    <div className="h-3 w-full rounded bg-slate-800">
                      <div className="h-3 rounded bg-red-600" style={{ width: `${chartPercentages.expense}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}