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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-2xl font-bold text-white">Preview de tenant</h3>
        <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: sidebarColor }}>
          {logoUrl ? <img src={logoUrl} alt="Logo tenant" className="mb-3 h-10 w-10 rounded object-cover" /> : null}
          <p className="font-semibold text-white">{name || "Tenant sin nombre"}</p>
          <button className="mt-3 rounded px-3 py-2 text-white" style={{ backgroundColor: primaryColor }}>
            Boton primario
          </button>
        </div>
        <button onClick={onClose} className="mt-6 w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700">
          Cerrar
        </button>
      </div>
    </div>
  );
}
