import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PASOS_PRUEBA, alternarPaso, cargarProgreso, guardarProgreso, marcarGuiaVista, moverSeleccion, pasoActual, pasosHechos, yaVioLaGuia, type Progreso,
} from './pruebaLogic';

const almacen = (): Storage | null => { try { return localStorage; } catch { return null; } };

// Guía de inicio de la prueba: se abre sola la primera vez que entra el ADMIN de un negocio con plan PRUEBA y se puede reabrir con
// Alt+G o con el botón. Teclado: ↑/↓ mueven, Enter va al paso, Espacio lo marca como hecho, 1–5 saltan, Esc cierra.
// Solo orienta (rutas y cifras de ejemplo): no toca datos ni ventas.
export default function PruebaWizard({ tenantId }: { tenantId: string }) {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(() => !yaVioLaGuia(almacen(), tenantId));
  const [progreso, setProgreso] = useState<Progreso>(() => cargarProgreso(almacen(), tenantId));
  const [sel, setSel] = useState(() => pasoActual(cargarProgreso(almacen(), tenantId)));
  const dialogo = useRef<HTMLDivElement>(null);

  const cerrar = useCallback(() => { setAbierto(false); marcarGuiaVista(almacen(), tenantId); }, [tenantId]);
  const alternar = useCallback((id: string) => {
    setProgreso((p) => { const n = alternarPaso(p, id); guardarProgreso(almacen(), tenantId, n); return n; });
  }, [tenantId]);

  const ir = useCallback((i: number) => {
    cerrar();
    navigate(PASOS_PRUEBA[i].ruta);
  }, [cerrar, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.shiftKey && e.code === 'KeyG') { e.preventDefault(); setAbierto((a) => !a); return; }
      if (!abierto) return;
      if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => moverSeleccion(s, 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => moverSeleccion(s, -1)); return; }
      if (/^[1-5]$/.test(e.key) && !e.altKey && !e.ctrlKey) { e.preventDefault(); setSel(Number(e.key) - 1); return; }
      if (e.key === ' ' && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); alternar(PASOS_PRUEBA[sel].id); return; }
      if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); ir(sel); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, sel, cerrar, alternar, ir]);

  useEffect(() => { if (abierto) dialogo.current?.focus(); }, [abierto]);

  const hechos = pasosHechos(progreso);

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} title="Guía de la prueba (Alt+G)"
        className="fixed bottom-4 right-4 z-40 h-9 px-3 rounded-full text-xs font-semibold border border-line-field bg-surface-2 text-content-1 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))]">
        Guía de la prueba · {hechos}/{PASOS_PRUEBA.length}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div ref={dialogo} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="guia-titulo"
        className="w-[640px] max-w-[94vw] max-h-[92vh] rounded-xl border border-line-field bg-surface-1 text-content-1 shadow-2xl outline-none flex flex-col">
        <div className="px-6 pt-5 pb-3 border-b border-line">
          <h2 id="guia-titulo" className="text-lg font-semibold">Bienvenido a tu prueba de ESTIA</h2>
          <p className="text-sm text-content-2 mt-0.5">5 pasos para ver el sistema funcionando con los datos de ejemplo. Llevas {hechos} de {PASOS_PRUEBA.length}.</p>
          <div className="mt-2 h-1.5 rounded-full bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={PASOS_PRUEBA.length} aria-valuenow={hechos}>
            <div className="h-full rounded-full bg-accent" style={{ width: `${(hechos / PASOS_PRUEBA.length) * 100}%` }} />
          </div>
        </div>
        <ol className="px-4 py-3 overflow-y-auto" role="listbox" aria-label="Pasos de la guía" aria-activedescendant={`paso-${PASOS_PRUEBA[sel].id}`}>
          {PASOS_PRUEBA.map((p, i) => {
            const hecho = !!progreso[p.id];
            const activo = i === sel;
            return (
              <li key={p.id} id={`paso-${p.id}`} role="option" aria-selected={activo} onClick={() => setSel(i)}
                className="flex gap-3 items-start rounded-lg px-3 py-2 cursor-pointer"
                style={{ background: activo ? 'rgb(var(--surface-2))' : 'transparent', outline: activo ? '2px solid rgb(var(--focus))' : 'none' }}>
                <span aria-hidden className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-line-field flex items-center justify-center text-xs"
                  style={{ background: hecho ? 'rgb(var(--ok-solid))' : 'transparent' }}>{hecho ? '✓' : i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{p.titulo}{hecho && <span className="sr-only"> (hecho)</span>}</span>
                  <span className="block text-xs text-content-2">{p.detalle}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="px-6 py-3 border-t border-line flex items-center gap-2 flex-wrap">
          <button type="button" className="h-9 px-3 rounded-md text-sm font-semibold bg-accent text-on-accent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))]" onClick={() => ir(sel)}>Ir a este paso</button>
          <button type="button" className="h-9 px-3 rounded-md text-sm border border-line-field focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))]" onClick={() => alternar(PASOS_PRUEBA[sel].id)}>
            {progreso[PASOS_PRUEBA[sel].id] ? 'Desmarcar' : 'Marcar como hecho'}
          </button>
          <button type="button" className="h-9 px-3 rounded-md text-sm border border-line-field focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))] ml-auto" onClick={cerrar}>Cerrar</button>
        </div>
        <p className="px-6 pb-3 text-xs text-content-3">↑↓ o 1–5: elegir · Enter: ir · Espacio: marcar · Esc: cerrar · Alt+G: abrir de nuevo</p>
      </div>
    </div>
  );
}
