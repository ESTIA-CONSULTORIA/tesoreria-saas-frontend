interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DashboardInfoModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header - flex-shrink-0 */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">Resumen Dashboard</h3>
              <p className="text-sm text-slate-400">
                Este panel muestra KPIs reales, ultimos movimientos y comparativa de ingresos vs egresos.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Body - flex-1 overflow-y-auto */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-slate-300">
            El dashboard proporciona una vista general de las finanzas del tenant, incluyendo:
          </p>
          <ul className="mt-4 space-y-2 text-slate-300 list-disc list-inside">
            <li>KPIs financieros en tiempo real</li>
            <li>Últimos movimientos registrados</li>
            <li>Comparativa de ingresos vs egresos</li>
            <li>Gráficos de tendencias</li>
          </ul>
        </div>

        {/* Footer - flex-shrink-0 */}
        <div className="flex-shrink-0 p-4 border-t border-slate-800 text-center text-xs text-slate-500">
          ESC para cerrar
        </div>
      </div>
    </div>
  );
}
