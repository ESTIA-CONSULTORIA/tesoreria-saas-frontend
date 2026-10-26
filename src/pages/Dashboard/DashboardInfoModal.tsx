interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DashboardInfoModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-4">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border !border-line !bg-nav shadow-2xl overflow-hidden">
        {/* Header - flex-shrink-0 */}
        <div className="flex-shrink-0 p-6 border-b !border-line">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold !text-content-1">Resumen Dashboard</h3>
              <p className="text-sm !text-content-3">
                Este panel muestra KPIs reales, ultimos movimientos y comparativa de ingresos vs egresos.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg !bg-surface-1 px-3 py-2 text-sm !text-content-1 hover:!bg-surface-2"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Body - flex-1 overflow-y-auto */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="!text-content-2">
            El dashboard proporciona una vista general de las finanzas del tenant, incluyendo:
          </p>
          <ul className="mt-4 space-y-2 !text-content-2 list-disc list-inside">
            <li>KPIs financieros en tiempo real</li>
            <li>Últimos movimientos registrados</li>
            <li>Comparativa de ingresos vs egresos</li>
            <li>Gráficos de tendencias</li>
          </ul>
        </div>

        {/* Footer - flex-shrink-0 */}
        <div className="flex-shrink-0 p-4 border-t !border-line text-center text-xs !text-content-3">
          ESC para cerrar
        </div>
      </div>
    </div>
  );
}
