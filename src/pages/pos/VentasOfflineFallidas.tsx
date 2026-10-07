import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { api } from '../../core/api/api';
import { useAuthStore } from '../../core/store/useAuthStore';
import { getFailedSaleOperations, markOperationResolved, offlineDb, type PendingOperation } from '../../core/offline/db';
import {
  accionRegistrar, cobradoDelPayload, dinero, esDelTenant, motivoDescarteValido, motivoVisible, MOTIVO_MIN,
  type EvaluacionVenta,
} from './ventasOfflineLogic';

// Ventas hechas sin conexión que el servidor rechazó al sincronizar (casi siempre porque el precio subió y lo cobrado ya no
// cubre el total). Solo ADMIN y GERENTE. La lista sale de la cola de ESTE dispositivo. Registrar = al PRECIO VIGENTE (el del
// cliente nunca se acepta; si el cobro no alcanza, el gerente confirma la diferencia y queda como cortesía autorizada por él).
// Descartar exige motivo. Toda resolución queda en el servidor con quién la hizo.
const base = '/pos/sales/offline-fallidas';
const btn = 'rounded-lg px-4 py-2 text-sm font-semibold min-h-[44px] disabled:opacity-40';

const mensaje = (e: unknown, respaldo: string): string => {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(m) && m.length) return m.join('. ');
  if (typeof m === 'string' && m) return m;
  return (e as { response?: unknown })?.response ? respaldo : 'Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.';
};

export default function VentasOfflineFallidas() {
  const user = useAuthStore((s) => s.user);
  const tenantId = useAuthStore((s) => s.tenantId) || user?.tenantId || localStorage.getItem('tenant_id');
  const fallidas = useLiveQuery(() => getFailedSaleOperations(), [], [] as PendingOperation[]);
  const resueltas = useLiveQuery(
    async () => (await offlineDb.pendingOperations.toArray()).filter((o) => o.type === 'SALE' && o.resolution).sort((a, b) => (b.resolution!.at > a.resolution!.at ? 1 : -1)).slice(0, 20),
    [],
    [] as PendingOperation[],
  );
  const propias = fallidas.filter((op) => esDelTenant(op, tenantId));

  const [evals, setEvals] = useState<Record<number, EvaluacionVenta | { error: string }>>({});
  const [errores, setErrores] = useState<Record<number, string>>({});
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [confirmar, setConfirmar] = useState<PendingOperation | null>(null);
  const [descartar, setDescartar] = useState<PendingOperation | null>(null);
  const [motivo, setMotivo] = useState('');

  const evaluar = useCallback(async (op: PendingOperation) => {
    try {
      const r = await api.post(`${base}/evaluar`, { payload: op.payload });
      setEvals((m) => ({ ...m, [op.id!]: r.data }));
    } catch (e) {
      setEvals((m) => ({ ...m, [op.id!]: { error: mensaje(e, 'No se pudo evaluar la venta.') } }));
    }
  }, []);

  useEffect(() => {
    for (const op of propias) if (op.id !== undefined && !evals[op.id]) evaluar(op);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propias.map((o) => o.id).join(',')]);

  if (user?.roleCode !== 'ADMIN' && user?.roleCode !== 'GERENTE') {
    return <div className="p-6 text-slate-300">Esta pantalla es solo para administradores y gerentes.</div>;
  }

  async function registrar(op: PendingOperation, confirmarDiferencia: boolean) {
    setOcupado(op.id!);
    setErrores((m) => ({ ...m, [op.id!]: '' }));
    try {
      const r = await api.post(`${base}/registrar`, { payload: op.payload, confirmarDiferencia });
      await markOperationResolved(op.id!, 'synced', { tipo: r.data?.yaRegistrada ? 'YA_REGISTRADA' : 'REGISTRADA', por: user?.email, at: new Date().toISOString() });
      setConfirmar(null);
    } catch (e) {
      setErrores((m) => ({ ...m, [op.id!]: mensaje(e, 'No se pudo registrar la venta.') }));
    } finally {
      setOcupado(null);
    }
  }

  async function descartarVenta(op: PendingOperation) {
    const ev = evals[op.id!] as EvaluacionVenta | undefined;
    setOcupado(op.id!);
    setErrores((m) => ({ ...m, [op.id!]: '' }));
    try {
      await api.post(`${base}/descartar`, {
        folio: op.payload.folio,
        motivo: motivo.trim(),
        resumen: { cobrado: cobradoDelPayload(op.payload), totalCliente: op.payload.total ?? null, totalNuevo: ev && 'totalNuevo' in ev ? ev.totalNuevo : null, cajero: op.payload.cajero ?? null },
      });
      await markOperationResolved(op.id!, 'discarded', { tipo: 'DESCARTADA', por: user?.email, motivo: motivo.trim(), at: new Date().toISOString() });
      setDescartar(null);
      setMotivo('');
    } catch (e) {
      setErrores((m) => ({ ...m, [op.id!]: mensaje(e, 'No se pudo descartar la venta.') }));
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <h1 className="text-xl font-bold">Ventas offline fallidas</h1>
      <p className="mb-4 max-w-3xl text-sm text-slate-400">
        Ventas hechas sin conexión que el servidor rechazó al sincronizar. Aquí se registran al <b>precio vigente</b> (nunca al precio con el que se
        cobró) o se descartan con motivo. Cada resolución queda registrada con tu nombre. La lista es de este dispositivo.
      </p>

      {propias.length === 0 && <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">No hay ventas fallidas en este dispositivo. 🎉</p>}

      <div className="space-y-4">
        {propias.map((op) => {
          const raw = evals[op.id!];
          const ev = raw && !('error' in raw) ? raw : null;
          const accion = accionRegistrar(ev);
          const cobrado = cobradoDelPayload(op.payload);
          return (
            <section key={op.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-sm">{op.payload.folio}</div>
                  <div className="text-xs text-slate-400">
                    {op.payload.clientTimestamp ? new Date(op.payload.clientTimestamp).toLocaleString('es-MX') : 'sin fecha'} · cajero {op.payload.cajero ?? '—'}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div>Cobrado: <b>{dinero(cobrado)}</b></div>
                  <div className="text-slate-400">Total al cobrar: {dinero(op.payload.total ?? null)}</div>
                  <div>Total nuevo: <b>{ev ? dinero(ev.totalNuevo) : '…'}</b></div>
                  {ev && ev.diferencia !== null && ev.diferencia > 0.01 && <div className="text-amber-300">Faltan {dinero(ev.diferencia)}</div>}
                </div>
              </div>

              <p className="mt-2 rounded-lg bg-red-950/60 p-2 text-sm text-red-200"><b>Motivo:</b> {motivoVisible(op, ev)}</p>
              {raw && 'error' in raw && <p role="alert" className="mt-2 text-sm text-red-300">{raw.error}</p>}
              {errores[op.id!] && <p role="alert" className="mt-2 rounded-lg bg-red-950 p-2 text-sm text-red-200">{errores[op.id!]}</p>}

              {ev && ev.items.length > 0 && (
                <table className="mt-3 w-full text-left text-xs">
                  <thead className="text-slate-400"><tr><th>Producto</th><th>Cant.</th><th>Precio cobrado</th><th>Precio vigente</th></tr></thead>
                  <tbody>
                    {ev.items.map((it, i) => (
                      <tr key={i} className="border-t border-slate-800">
                        <td className="py-1">{it.nombre || it.productoId}</td><td>{it.cantidad}</td><td>{dinero(it.precioCliente)}</td>
                        <td className={it.precioCliente !== it.precioVigente ? 'text-amber-300' : ''}>{dinero(it.precioVigente)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <details className="mt-3 text-xs text-slate-400">
                <summary className="cursor-pointer">Venta guardada en el dispositivo (payload)</summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950 p-2">{JSON.stringify(op.payload, null, 2)}</pre>
              </details>

              <div className="mt-3 flex flex-wrap gap-2">
                {accion === 'registrar' && (
                  <button disabled={ocupado === op.id} className={`${btn} bg-green-700`} onClick={() => registrar(op, false)}>Registrar al precio vigente</button>
                )}
                {accion === 'confirmar' && (
                  <button disabled={ocupado === op.id} className={`${btn} bg-amber-700`} onClick={() => setConfirmar(op)}>Registrar y confirmar diferencia…</button>
                )}
                {accion === 'ya_registrada' && (
                  <button disabled={ocupado === op.id} className={`${btn} bg-slate-700`} onClick={() => registrar(op, false)}>Ya está en el servidor: marcar resuelta</button>
                )}
                {accion === 'no_disponible' && <span className="self-center text-xs text-slate-400">No se puede registrar: revisa el motivo o descártala.</span>}
                <button disabled={ocupado === op.id} className={`${btn} bg-red-900`} onClick={() => { setDescartar(op); setMotivo(''); }}>Descartar…</button>
                <button disabled={ocupado === op.id} className={`${btn} bg-slate-800`} onClick={() => evaluar(op)}>Reevaluar</button>
              </div>
            </section>
          );
        })}
      </div>

      {resueltas.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Resueltas en este dispositivo</h2>
          <ul className="space-y-1 text-xs text-slate-300">
            {resueltas.map((op) => (
              <li key={op.id} className="rounded-lg border border-slate-800 bg-slate-900 p-2">
                <span className="font-mono">{op.payload.folio}</span> · {op.resolution!.tipo === 'DESCARTADA' ? 'descartada' : op.resolution!.tipo === 'YA_REGISTRADA' ? 'ya estaba registrada' : 'registrada al precio vigente'} por {op.resolution!.por ?? '—'} ·{' '}
                {new Date(op.resolution!.at).toLocaleString('es-MX')}{op.resolution!.motivo ? ` · motivo: ${op.resolution!.motivo}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {confirmar && (() => {
        const ev = evals[confirmar.id!] as EvaluacionVenta | undefined;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <h3 className="text-lg font-bold">Confirmar la diferencia</h3>
              <p className="text-sm text-slate-300">
                Se registra al precio vigente: total <b>{dinero(ev?.totalNuevo)}</b>. Lo cobrado fue <b>{dinero(cobradoDelPayload(confirmar.payload))}</b>, así que faltan{' '}
                <b>{dinero(ev?.diferencia)}</b>. Al confirmar, esa diferencia se absorbe como <b>cortesía autorizada por ti</b> y queda registrada con tu nombre.
              </p>
              {errores[confirmar.id!] && <p role="alert" className="rounded-lg bg-red-950 p-2 text-sm text-red-200">{errores[confirmar.id!]}</p>}
              <div className="flex gap-2">
                <button className={`${btn} flex-1 bg-slate-800`} onClick={() => setConfirmar(null)}>Volver</button>
                <button disabled={ocupado === confirmar.id} className={`${btn} flex-1 bg-amber-700`} onClick={() => registrar(confirmar, true)}>Confirmo la diferencia</button>
              </div>
            </div>
          </div>
        );
      })()}

      {descartar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-bold">Descartar la venta {descartar.payload.folio}</h3>
            <p className="text-sm text-slate-300">La venta no se registrará. Queda anotado quién la descartó y el motivo.</p>
            {errores[descartar.id!] && <p role="alert" className="rounded-lg bg-red-950 p-2 text-sm text-red-200">{errores[descartar.id!]}</p>}
            <textarea className="min-h-[88px] w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-base" placeholder={`Motivo (obligatorio, mínimo ${MOTIVO_MIN} caracteres)`} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <div className="flex gap-2">
              <button className={`${btn} flex-1 bg-slate-800`} onClick={() => setDescartar(null)}>Volver</button>
              <button disabled={ocupado === descartar.id || !motivoDescarteValido(motivo)} className={`${btn} flex-1 bg-red-800`} onClick={() => descartarVenta(descartar)}>Descartar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
