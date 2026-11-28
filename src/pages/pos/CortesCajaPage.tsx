import { useEffect, useMemo, useState } from 'react';
import MainLayout from '../../core/layout/MainLayout';
import { api } from '../../core/api/api';
import { useAuthStore } from '../../core/store/useAuthStore';
import { activarConTeclado } from '../../core/utils/accesoTeclado';
import { TiraZ } from './TiraZ';
import { formatoFechaHora } from '../../core/utils/tiempo';

// «Cortes de caja»: el corte Z de cada turno para ADMIN, GERENTE y SOPORTE (esperado, declarado y diferencia por forma de pago, y los
// retiros y depósitos con su autorizador). En el POS el supervisor entra con el NIP de una cajera y actúa como ella (a ciegas); aquí lo ve
// con su propia sesión. El servidor solo entrega los totales a esos tres roles: el candado real está allá, esta pantalla solo los muestra.
interface Turno { id: string; folio?: string | null; cajero: string; status: string; fecha?: string; abiertoEn?: string | null; createdAt?: string; totalVentas?: number | string }

const money = (v: unknown) => { const n = Number(v) || 0; return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`; };
const ESTADOS: Record<string, string> = { ABIERTO: 'Abierto', CERRADO: 'Cerrado', PENDIENTE_APROBACION: 'Por aprobar' };

export default function CortesCajaPage() {
  const rol = useAuthStore((s) => s.user?.roleCode);
  const autorizado = rol === 'ADMIN' || rol === 'GERENTE' || rol === 'SOPORTE';
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [estado, setEstado] = useState<'' | 'ABIERTO' | 'CERRADO'>('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [sel, setSel] = useState<Turno | null>(null);
  const [resumen, setResumen] = useState<any>(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);

  useEffect(() => {
    if (!autorizado) return;
    setCargando(true);
    setError('');
    Promise.all([
      api.get('/pos/shifts', { params: estado ? { status: estado } : undefined }),
      api.get('/pos/cashiers/directorio').catch(() => ({ data: [] })),
    ])
      .then(([t, d]) => {
        setTurnos((Array.isArray(t.data) ? t.data : []).slice(0, 200));
        const mapa: Record<string, string> = {};
        for (const u of Array.isArray(d.data) ? d.data : []) mapa[u.id] = u.name || u.nombre || u.email || 'Sin nombre';
        setNombres(mapa);
      })
      .catch((e) => setError(e?.response?.data?.message || 'No se pudieron cargar los turnos.'))
      .finally(() => setCargando(false));
  }, [autorizado, estado]);

  useEffect(() => {
    if (!sel) { setResumen(null); return; }
    setCargandoResumen(true);
    api.get(`/pos/shifts/${sel.id}/summary`)
      .then((r) => setResumen(r.data))
      .catch((e) => { setResumen(null); setError(e?.response?.data?.message || 'No se pudo cargar el corte de este turno.'); })
      .finally(() => setCargandoResumen(false));
  }, [sel?.id]);

  const filas = useMemo(() => turnos, [turnos]);
  const cierre = resumen?.precorteDeclaracion?.cierre;

  return (
    <MainLayout>
      <div style={{ padding: '0 24px 12px' }}>
        <div style={{ marginBottom: 10 }}>
          <h2 className="text-content-1" style={{ fontSize: 16, fontWeight: 600, marginBottom: 0 }}>Cortes de caja</h2>
          <p className="text-content-2" style={{ fontSize: 12 }}>Esperado, declarado y diferencia por turno. Solo para administradores, gerentes y soporte.</p>
        </div>
        {!autorizado ? (
          <div className="rounded-xl border border-line bg-surface-1 p-6 text-sm text-content-2" role="alert">
            Solo un administrador, un gerente o soporte pueden ver los cortes de caja.
          </div>
        ) : (
          <>
            {error && <div role="alert" className="mb-2 rounded-lg border border-danger px-3 py-2 text-xs text-danger">{error}</div>}
            <div className="flex overflow-hidden rounded-xl border border-line" style={{ height: 'calc(100vh - 190px)', minHeight: 320 }}>
              <div className="flex min-w-0 flex-1 flex-col bg-surface-1">
                <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                  <label htmlFor="cortes-estado" className="text-xs text-content-3">Estado</label>
                  <select id="cortes-estado" value={estado} onChange={(e) => { setSel(null); setEstado(e.target.value as '' | 'ABIERTO' | 'CERRADO'); }}
                    className="rounded-md border border-line bg-surface-2 px-2 py-1 text-xs text-content-1">
                    <option value="">Todos</option>
                    <option value="ABIERTO">Abiertos</option>
                    <option value="CERRADO">Cerrados</option>
                  </select>
                  <span className="ml-auto text-xs text-content-3">{filas.length} turno{filas.length === 1 ? '' : 's'}</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {cargando ? <p className="p-4 text-xs text-content-2">Cargando…</p> : (
                    <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                      <thead className="sticky top-0 bg-surface-1 text-content-3">
                        <tr className="text-left">
                          <th scope="col" className="px-3 py-1.5 font-medium">Turno</th>
                          <th scope="col" className="px-2 py-1.5 font-medium">Cajero</th>
                          <th scope="col" className="px-2 py-1.5 font-medium">Fecha</th>
                          <th scope="col" className="px-2 py-1.5 font-medium">Estado</th>
                          <th scope="col" className="px-3 py-1.5 text-right font-medium">Ventas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filas.map((t) => {
                          const activo = sel?.id === t.id;
                          const abrir = () => setSel(t);
                          return (
                            <tr key={t.id} onClick={abrir} {...activarConTeclado(abrir)} aria-pressed={activo}
                              className={`cursor-pointer border-t border-line text-content-1 ${activo ? 'bg-surface-2' : ''}`}>
                              <td className="truncate px-3 py-1.5">{t.folio ?? `#${t.id.slice(0, 8)}`}</td>
                              <td className="truncate px-2 py-1.5">{nombres[t.cajero] ?? 'Cajero'}</td>
                              <td className="truncate px-2 py-1.5">{formatoFechaHora(t.abiertoEn ?? t.createdAt ?? t.fecha ?? '')}</td>
                              <td className="px-2 py-1.5">{ESTADOS[t.status] ?? t.status}</td>
                              <td className="px-3 py-1.5 text-right">{money(t.totalVentas)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  {!cargando && filas.length === 0 && <p className="p-6 text-center text-xs text-content-2">No hay turnos con ese filtro.</p>}
                </div>
              </div>
              <div className="w-[460px] max-w-[55%] shrink-0 overflow-y-auto border-l border-line bg-surface-2 p-4">
                {!sel ? (
                  <p className="text-sm text-content-2">Elige un turno para ver su corte Z.</p>
                ) : cargandoResumen ? (
                  <p className="text-sm text-content-2">Cargando corte…</p>
                ) : resumen ? (
                  <>
                    <div className="mb-3">
                      <div className="text-base font-medium text-content-1">Turno {sel.folio ?? `#${sel.id.slice(0, 8)}`} · {nombres[sel.cajero] ?? 'Cajero'}</div>
                      <div className="text-xs text-content-3">
                        {ESTADOS[sel.status] ?? sel.status}
                        {cierre?.cerradoPor ? ` · cerró ${cierre.cerradoPor}` : ''}
                      </div>
                    </div>
                    <TiraZ totales={resumen.calculatedTotals} declaracion={resumen.precorteDeclaracion ?? undefined} />
                  </>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
