interface Props {
  open: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  onApply: (startDate: string, endDate: string) => void;
}

export default function ReportsFiltersModal({
  open,
  onClose,
  startDate,
  endDate,
  onApply,
}: Props) {
  if (!open) return null;

  let start = startDate;
  let end = endDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-2xl font-bold text-white">Filtros de reporte</h3>
        <p className="mb-4 text-sm text-slate-400">Selecciona rango de fechas</p>
        <div className="space-y-3">
          <input type="date" defaultValue={startDate} onChange={(e) => { start = e.target.value; }} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white" />
          <input type="date" defaultValue={endDate} onChange={(e) => { end = e.target.value; }} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white" />
          <button onClick={() => { onApply(start, end); onClose(); }} className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700">Aplicar</button>
          <button onClick={onClose} className="w-full rounded-lg bg-slate-800 p-3 font-semibold text-white hover:bg-slate-700">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
