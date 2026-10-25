import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../core/api/api';
import { useAuthStore } from '../../core/store/useAuthStore';
import {
  alternarPaso, borrarNipSesion, cargarProgreso, esEstadoPrueba, etiquetaDias, guardarNipSesion, guardarProgreso, leerNipSesion, marcarGuiaVista,
  mensajeDeError, moverSeleccion, textoDias, yaVioLaGuia, type EstadoPrueba, type NipSocio, type Progreso,
} from './pruebaLogic';
import {
  detallePaso, esAutomatico, esProgresoNegocio, hechosGuia, pasoActualGuia, pasoHecho, pasosDeGiro, resumenEjemplo, textoVacio, type ProgresoNegocio,
} from './guia';

const almacen = (): Storage | null => { try { return localStorage; } catch { return null; } };
const sesion = (): Storage | null => { try { return sessionStorage; } catch { return null; } };

// Guía de inicio de la prueba, como wizard POR GIRO (guia.ts): se abre sola la primera vez que entra el ADMIN y se reabre con Alt+G o con el botón.
// Marca sola los pasos que el negocio ya cumplió (GET /prueba/progreso) y ofrece, si el negocio sigue vacío, «Cargar datos de ejemplo».
// Teclado: ↑/↓ mueven, Enter va al paso, Espacio lo marca, 1–9 saltan, Esc cierra. Solo orienta: no toca datos salvo el botón de ejemplo.
export default function PruebaWizard({ tenantId, giro }: { tenantId: string; giro?: string | null }) {
  const navigate = useNavigate();
  const esAdmin = useAuthStore((s) => s.user?.roleCode === 'ADMIN');
  const pasos = useMemo(() => pasosDeGiro(giro), [giro]); // salen de la misma tabla giro → módulos que activa el servidor

  const [abierto, setAbierto] = useState(() => !yaVioLaGuia(almacen(), tenantId));
  const [manual, setManual] = useState<Progreso>(() => cargarProgreso(almacen(), tenantId));
  const [real, setReal] = useState<ProgresoNegocio | null>(null);
  const [sel, setSel] = useState(0);
  const dialogo = useRef<HTMLDivElement>(null);
  const [estadoPrueba, setEstadoPrueba] = useState<EstadoPrueba | null>(null);
  const [nip, setNip] = useState<NipSocio | null>(() => leerNipSesion(sesion()));
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const seleccionInicial = useRef(false);

  // Días restantes (GET /prueba/estado: solo la prueba del negocio de esta sesión). Si falla o no es una prueba, la guía funciona igual sin ese dato.
  useEffect(() => {
    let vivo = true;
    api.get('/prueba/estado').then((r) => { if (vivo && esEstadoPrueba(r.data)) setEstadoPrueba(r.data); }).catch(() => undefined);
    return () => { vivo = false; };
  }, [tenantId]);

  // Avance real del negocio (solo ADMIN; para los demás roles queda en marcado a mano). Se refresca al abrir la guía.
  const refrescar = useCallback(() => {
    if (!esAdmin) return Promise.resolve();
    return api.get('/prueba/progreso').then((r) => { if (esProgresoNegocio(r.data)) setReal(r.data); }).catch(() => undefined);
  }, [esAdmin]);
  useEffect(() => { if (abierto) void refrescar(); }, [abierto, refrescar]);

  // La primera vez que llega el avance real, la selección salta al primer paso pendiente.
  useEffect(() => {
    if (seleccionInicial.current || (esAdmin && !real)) return;
    seleccionInicial.current = true;
    setSel(pasoActualGuia(pasos, manual, real));
  }, [real, esAdmin, pasos, manual]);

  const cerrar = useCallback(() => { setAbierto(false); marcarGuiaVista(almacen(), tenantId); }, [tenantId]);
  const alternar = useCallback((id: string) => {
    setManual((p) => {
      const n = alternarPaso(p, id);
      guardarProgreso(almacen(), tenantId, n);
      // Hecho el check-in, el NIP ya no hace falta en pantalla: se borra de la pestaña.
      if (id === 'checkin' && n[id]) { borrarNipSesion(sesion()); setNip(null); }
      return n;
    });
  }, [tenantId]);

  const ir = useCallback((ruta: string) => { cerrar(); navigate(ruta); }, [cerrar, navigate]);

  async function cargarEjemplo() {
    if (cargando) return;
    setCargando(true);
    setAviso(null);
    try {
      const r = await api.post('/prueba/datos-ejemplo');
      // El NIP del socio de ejemplo (solo gimnasio) llega UNA vez y no se guarda en claro en el servidor: aquí solo vive en esta pestaña.
      if (r.data?.socioNip) { guardarNipSesion(sesion(), { numero: r.data.socioNumero, nip: r.data.socioNip }); setNip(leerNipSesion(sesion())); }
      setAviso({ tipo: 'ok', texto: resumenEjemplo(r.data ?? {}) });
      await refrescar();
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err) });
    } finally {
      setCargando(false);
    }
  }

  const hechos = hechosGuia(pasos, manual, real);
  const actual = pasos[Math.min(sel, pasos.length - 1)];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.shiftKey && e.code === 'KeyG') { e.preventDefault(); setAbierto((a) => !a); return; }
      if (!abierto) return;
      if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => moverSeleccion(s, 1, pasos.length)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => moverSeleccion(s, -1, pasos.length)); return; }
      if (/^[1-9]$/.test(e.key) && !e.altKey && !e.ctrlKey) { e.preventDefault(); if (Number(e.key) <= pasos.length) setSel(Number(e.key) - 1); return; }
      if (e.key === ' ' && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); if (actual && !esAutomatico(actual)) alternar(actual.id); return; }
      if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); if (actual) ir(actual.ruta); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, pasos.length, actual, cerrar, alternar, ir]);

  useEffect(() => { if (abierto) dialogo.current?.focus(); }, [abierto]);

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} title="Guía de la prueba (Alt+G)"
        className="fixed bottom-4 right-4 z-40 h-9 px-3 rounded-full text-xs font-semibold border border-line-field bg-surface-2 text-content-1 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))]">
        Guía de la prueba · {hechos}/{pasos.length}{estadoPrueba ? ` · ${etiquetaDias(estadoPrueba)}` : ''}
      </button>
    );
  }

  const puedeEjemplo = esAdmin && real?.puedeCargarEjemplo === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div ref={dialogo} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="guia-titulo"
        className="w-[680px] max-w-[94vw] max-h-[92vh] rounded-xl border border-line-field bg-surface-1 text-content-1 shadow-2xl outline-none flex flex-col">
        <div className="px-6 pt-5 pb-3 border-b border-line">
          <h2 id="guia-titulo" className="text-lg font-semibold">Bienvenido a tu prueba de ESTIA</h2>
          <p className="text-sm text-content-2 mt-0.5">{pasos.length} pasos para dejar tu negocio funcionando. Llevas {hechos} de {pasos.length}.</p>
          {estadoPrueba && <p className="text-sm mt-1" role="status" style={{ color: estadoPrueba.vencida || estadoPrueba.diasRestantes <= 3 ? 'rgb(var(--warn))' : 'rgb(var(--text-2))' }}>{textoDias(estadoPrueba)}</p>}
          <div className="mt-2 h-1.5 rounded-full bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={pasos.length} aria-valuenow={hechos}>
            <div className="h-full rounded-full bg-accent" style={{ width: `${(hechos / pasos.length) * 100}%` }} />
          </div>
          {(puedeEjemplo || aviso) && (
            <div className="mt-3 rounded-lg border border-line bg-surface-2 px-3 py-2 flex flex-wrap items-center gap-3">
              {puedeEjemplo && (
                <>
                  <p className="text-xs text-content-2 flex-1 min-w-[12rem]">¿Prefieres ver el sistema con datos? Carga una plantilla mínima de tu giro. Es opcional y solo se hace una vez.</p>
                  <button type="button" onClick={cargarEjemplo} disabled={cargando}
                    className="h-8 px-3 rounded-md text-xs font-semibold border border-line-field focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))] disabled:opacity-50">
                    {cargando ? 'Cargando…' : 'Cargar datos de ejemplo'}
                  </button>
                </>
              )}
              {aviso && <p role={aviso.tipo === 'error' ? 'alert' : 'status'} className={`text-xs w-full ${aviso.tipo === 'error' ? 'text-danger' : 'text-content-2'}`}>{aviso.texto}</p>}
            </div>
          )}
        </div>
        <ol className="px-4 py-3 overflow-y-auto" role="listbox" aria-label="Pasos de la guía" aria-activedescendant={actual ? `paso-${actual.id}` : undefined}>
          {pasos.map((p, i) => {
            const hecho = pasoHecho(p, manual, real);
            const activo = i === sel;
            const vacio = !hecho ? textoVacio(p, real) : null;
            return (
              <li key={p.id} id={`paso-${p.id}`} role="option" aria-selected={activo} onClick={() => setSel(i)}
                className="flex gap-3 items-start rounded-lg px-3 py-2 cursor-pointer"
                style={{ background: activo ? 'rgb(var(--surface-2))' : 'transparent', outline: activo ? '2px solid rgb(var(--focus))' : 'none' }}>
                <span aria-hidden className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-line-field flex items-center justify-center text-xs"
                  style={{ background: hecho ? 'rgb(var(--ok-solid))' : 'transparent' }}>{hecho ? '✓' : i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{p.titulo}{hecho && <span className="sr-only"> (hecho)</span>}</span>
                  <span className="block text-xs text-content-2">{detallePaso(p, nip)}</span>
                  {vacio && <span className="block text-xs text-content-3 mt-0.5">{vacio}</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="px-6 py-3 border-t border-line flex items-center gap-2 flex-wrap">
          {actual && (
            <>
              <button type="button" className="h-9 px-3 rounded-md text-sm font-semibold bg-accent text-on-accent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))]" onClick={() => ir(actual.ruta)}>Ir a este paso</button>
              {actual.accesos.filter((a) => a.ruta !== actual.ruta).map((a) => (
                <button key={a.ruta} type="button" className="h-9 px-3 rounded-md text-sm border border-line-field focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))]" onClick={() => ir(a.ruta)}>{a.texto}</button>
              ))}
              {esAutomatico(actual) ? (
                <span className="text-xs text-content-3">{esAdmin ? 'Se marca solo cuando lo haces.' : 'Pídele a tu ADMIN que lo revise.'}</span>
              ) : (
                <button type="button" className="h-9 px-3 rounded-md text-sm border border-line-field focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))]" onClick={() => alternar(actual.id)}>
                  {manual[actual.id] ? 'Desmarcar' : 'Marcar como hecho'}
                </button>
              )}
            </>
          )}
          <button type="button" className="h-9 px-3 rounded-md text-sm border border-line-field focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))] ml-auto" onClick={cerrar}>Cerrar</button>
        </div>
        <p className="px-6 pb-3 text-xs text-content-3">↑↓ o 1–{pasos.length}: elegir · Enter: ir · Espacio: marcar · Esc: cerrar · Alt+G: abrir de nuevo</p>
      </div>
    </div>
  );
}
