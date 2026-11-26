import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Aviso breve cuando una ruta sacó al usuario al Dashboard (módulo no disponible / no se pudo comprobar). Flota arriba a la derecha:
// no mueve el contenido. Se cierra solo a los 8 s, con el botón o con Escape.
export default function AvisoRuta() {
  const location = useLocation();
  const navigate = useNavigate();
  const aviso = (location.state as { avisoRuta?: string } | null)?.avisoRuta;
  const [visible, setVisible] = useState(!!aviso);

  useEffect(() => {
    setVisible(!!aviso);
    if (!aviso) return;
    const t = setTimeout(() => setVisible(false), 8000);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setVisible(false); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [aviso]);

  if (!aviso || !visible) return null;
  const cerrar = () => { setVisible(false); navigate(location.pathname, { replace: true, state: null }); };
  return (
    <div role="status" aria-live="polite" className="fixed right-4 top-24 z-[300] flex max-w-sm items-start gap-3 rounded-lg border !border-line !bg-surface-1 px-4 py-3 text-sm !text-content-1 shadow-lg">
      <span className="min-w-0 flex-1">{aviso}</span>
      <button onClick={cerrar} aria-label="Cerrar aviso" className="rounded border !border-line px-2 text-sm !text-content-1">Cerrar</button>
    </div>
  );
}
