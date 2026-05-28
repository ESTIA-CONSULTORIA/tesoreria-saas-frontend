import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";

export default function TreasuryPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/treasury/summary");
      setSummary(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar el resumen de tesorería");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Tesorería</h2>
          <p className="text-slate-400">Resumen financiero general</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-slate-900 p-6">Cargando resumen...</div>
        ) : (
          <div className="space-y-6">
            {/* Resumen de cuentas activas y saldo total */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="mb-2 text-lg font-semibold">Cuentas Activas</h3>
                <p className="text-3xl font-bold text-blue-400">{summary?.activeAccounts || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="mb-2 text-lg font-semibold">Saldo Total</h3>
                <p className="text-3xl font-bold text-green-400">
                  ${Number(summary?.totalBalance || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Flujo del mes */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-semibold">Flujo del Mes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Ingresos</p>
                  <p className="text-xl font-semibold text-green-400">
                    ${Number(summary?.monthlyFlow?.income || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Egresos</p>
                  <p className="text-xl font-semibold text-red-400">
                    ${Number(summary?.monthlyFlow?.expense || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Neto</p>
                  <p className="text-xl font-semibold text-white">
                    ${Number(summary?.monthlyFlow?.net || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Próximos vencimientos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="mb-4 text-lg font-semibold">Próximos Pagos</h3>
                <div className="space-y-2">
                  {summary?.upcomingPayments?.length === 0 ? (
                    <p className="text-sm text-slate-400">No hay pagos próximos</p>
                  ) : (
                    summary?.upcomingPayments?.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between text-sm">
                        <span className="text-slate-300">{payment.concept}</span>
                        <span className="text-red-400">${Number(payment.amount).toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="mb-4 text-lg font-semibold">Próximos Cobros</h3>
                <div className="space-y-2">
                  {summary?.upcomingCollections?.length === 0 ? (
                    <p className="text-sm text-slate-400">No hay cobros próximos</p>
                  ) : (
                    summary?.upcomingCollections?.map((collection: any) => (
                      <div key={collection.id} className="flex justify-between text-sm">
                        <span className="text-slate-300">{collection.concept}</span>
                        <span className="text-green-400">${Number(collection.amount).toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
