import { useCallback, useEffect, useState } from 'react';
import { api } from '../../core/api/api';
import { usePuede } from '../../core/hooks/usePuede';
import { mensajeErrorApi } from './fiscalLogic';

// Facturas del negocio y «Facturar una venta». Mientras no haya un PAC contratado el timbrado es SIMULADO: nada de esto es un CFDI real.
interface Fila { id: string; tipo: string; estado: string; serie?: string | null; folio?: string | number | null; total: number; usoCfdi?: string; ventaId?: string | null; receptor?: string | null; errorMensaje?: string | null; creadaEl: string }
interface VentaLigera { id: string; folio: string; total: number }
interface ReceptorLigero { id: string; nombre?: string; razonSocial?: string; rfc: string }

const ESTADO: Record<string, string> = { TIMBRADO: 'Emitida (simulada)', PENDIENTE: 'En proceso', ERROR_VALIDACION: 'Con error', INCIERTO: 'Por confirmar', CANCELADO: 'Cancelada' };
const dinero = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export default function FacturasTab({ usos }: { usos: Record<string, string> }) {
  const puedeCrear = usePuede('facturacion', 'crear');
  const [filas, setFilas] = useState<Fila[]>([]);
  const [ventas, setVentas] = useState<VentaLigera[]>([]);
  const [receptores, setReceptores] = useState<ReceptorLigero[]>([]);
  const [f, setF] = useState({ ventaId: '', receptorId: '', usoCfdi: 'G03' });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [fa, ve, re] = await Promise.all([
        api.get('/facturacion/facturas'),
        api.get('/pos/sales', { params: { status: 'PAGADA' } }),
        api.get('/facturacion/receptores'),
      ]);
      setFilas(fa.data?.filas ?? []);
      setVentas((Array.isArray(ve.data) ? ve.data : []).slice(0, 50));
      setReceptores(Array.isArray(re.data) ? re.data : []);
    } catch (e) { setMsg({ t: mensajeErrorApi(e, 'No se pudieron cargar las facturas.'), ok: false }); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function facturar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true); setMsg(null);
    try {
      const r = await api.post(`/facturacion/facturas/desde-venta/${f.ventaId}`, { receptorId: f.receptorId, usoCfdi: f.usoCfdi });
      setMsg({ t: r.data?.reutilizada ? 'Esa venta ya tenía factura; se muestra la existente.' : 'Factura generada en modo simulado (sin validez fiscal).', ok: true });
      await cargar();
    } catch (err) { setMsg({ t: mensajeErrorApi(err, 'No se pudo generar la factura.'), ok: false }); }
    finally { setEnviando(false); }
  }

  const campo = 'rounded border border-line bg-surface-1 px-2 py-1 text-sm text-content-1';
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <p role="note" className="rounded border px-3 py-1.5 text-sm text-content-1" style={{ borderColor: 'rgb(var(--warn-solid))' }}>
        Facturación en modo simulado: estas facturas <strong>no tienen validez fiscal</strong> (no están timbradas por un PAC) y no se pueden presentar al SAT ni entregar a clientes como CFDI.
      </p>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`rounded px-2 py-1 text-xs ${msg.ok ? 'text-content-1' : 'text-content-1'}`}>{msg.t}</p>}

      {puedeCrear && (
        <form onSubmit={facturar} aria-label="Facturar una venta" className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-content-3">Venta pagada
            <select required value={f.ventaId} onChange={(e) => setF({ ...f, ventaId: e.target.value })} className={`${campo} mt-1 block w-60`}>
              <option value="">Elegir…</option>
              {ventas.map((v) => <option key={v.id} value={v.id}>{v.folio} · {dinero(Number(v.total))}</option>)}
            </select>
          </label>
          <label className="text-xs text-content-3">Cliente (receptor)
            <select required value={f.receptorId} onChange={(e) => setF({ ...f, receptorId: e.target.value })} className={`${campo} mt-1 block w-60`}>
              <option value="">Elegir…</option>
              {receptores.map((r) => <option key={r.id} value={r.id}>{r.nombre ?? r.razonSocial ?? r.rfc} · {r.rfc}</option>)}
            </select>
          </label>
          <label className="text-xs text-content-3">Uso de CFDI
            <select value={f.usoCfdi} onChange={(e) => setF({ ...f, usoCfdi: e.target.value })} className={`${campo} mt-1 block w-60`}>
              {Object.entries(usos).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}
            </select>
          </label>
          <button type="submit" disabled={enviando} className="rounded border border-line px-3 py-1.5 text-sm font-semibold text-content-1 disabled:opacity-60">{enviando ? 'Generando…' : 'Facturar (simulado)'}</button>
        </form>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Facturas del negocio (simuladas, sin validez fiscal)</caption>
          <thead className="text-xs text-content-3"><tr><th scope="col" className="px-2 py-1">Folio</th><th scope="col">Fecha</th><th scope="col">Cliente</th><th scope="col">Tipo</th><th scope="col">Estado</th><th scope="col" className="text-right">Total</th><th scope="col">Validez</th></tr></thead>
          <tbody>
            {filas.map((x) => (
              <tr key={x.id} className="border-t border-line">
                <td className="px-2 py-1">{[x.serie, x.folio].filter(Boolean).join('-') || '—'}</td>
                <td>{new Date(x.creadaEl).toLocaleDateString('es-MX')}</td>
                <td>{x.receptor ?? '—'}</td>
                <td>{x.tipo === 'E' || x.tipo === 'EGRESO' ? 'Nota de crédito' : 'Factura'}</td>
                <td>{ESTADO[x.estado] ?? x.estado}{x.errorMensaje ? ` — ${x.errorMensaje}` : ''}</td>
                <td className="text-right">{dinero(Number(x.total))}</td>
                <td className="text-content-1 font-semibold">Sin validez fiscal</td>
              </tr>
            ))}
            {filas.length === 0 && <tr><td colSpan={7} className="px-2 py-3 text-content-3">Todavía no hay facturas. Elige una venta pagada y un cliente para generar la primera.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
