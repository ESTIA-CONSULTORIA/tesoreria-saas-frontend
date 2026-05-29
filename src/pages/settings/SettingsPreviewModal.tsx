interface Props {
  open: boolean;
  onClose: () => void;
  name: string;
  logoUrl: string;
  primaryColor: string;
  sidebarColor: string;
}

export default function SettingsPreviewModal({
  open,
  onClose,
  name,
  logoUrl,
  primaryColor,
  sidebarColor,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header - flex-shrink-0 */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">Preview de tenant</h3>
              <p className="text-sm text-slate-400">Vista previa de la personalización</p>
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
          <div className="rounded-xl p-4" style={{ backgroundColor: sidebarColor }}>
            {logoUrl ? <img src={logoUrl} alt="Logo tenant" className="mb-3 h-10 w-10 rounded object-cover" /> : null}
            <p className="font-semibold text-white">{name || "Tenant sin nombre"}</p>
            <button className="mt-3 rounded px-3 py-2 text-white" style={{ backgroundColor: primaryColor }}>
              Boton primario
            </button>
          </div>
        </div>

        {/* Footer - flex-shrink-0 */}
        <div className="flex-shrink-0 p-4 border-t border-slate-800 text-center text-xs text-slate-500">
          ESC para cerrar
        </div>
      </div>
    </div>
  );
}
