interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DashboardInfoModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-2xl font-bold text-white">Resumen Dashboard</h3>
        <p className="mt-2 text-sm text-slate-400">
          Este panel muestra KPIs reales, ultimos movimientos y comparativa de ingresos vs egresos.
        </p>
        <button onClick={onClose} className="mt-6 w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700">
          Cerrar
        </button>
      </div>
    </div>
  );
}
