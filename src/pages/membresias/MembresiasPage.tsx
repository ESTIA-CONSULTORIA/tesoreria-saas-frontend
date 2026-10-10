import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../core/api/api';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useBrandingStore } from '../../core/store/useBrandingStore';
import { dinero, mensajeError } from '../mesas/mesasLogic';
import { etiquetaTasa, TASAS_IVA, type IvaConfig } from '../../core/utils/iva';
import {
  armarCobro, CLASE_SITUACION, ETIQUETA_SITUACION, fechaCorta, pestanasVisibles, PLAN_FORM_VACIO, planAForm, periodoTexto,
  precioDelPlan, textoSituacion, validarPlanForm, type FormaPagoMembresia, type Plan, type PlanForm, type Situacion,
} from './membresiasLogic';

// Gimnasio: socios, cobro y renovación de membresías (venta normal del POS), check-in, alertas, planes y reportes. Todo lo
// configurable (planes, precios, IVA, beneficios, días de aviso) se captura aquí; el servidor calcula precio, IVA y vigencia.
type Pestana = 'socios' | 'checkin' | 'alertas' | 'planes' | 'reportes';
const ETIQUETA_PESTANA: Record<Pestana, string> = { socios: 'Socios', checkin: 'Check-in', alertas: 'Alertas', planes: 'Planes', reportes: 'Reportes' };

interface SocioFila {
  id: string; numeroSocio: string; nombre: string; apellidos?: string | null; telefono?: string | null; email?: string | null;
  estado: 'ACTIVO' | 'BAJA'; tieneNip?: boolean; situacion: Situacion;
}

const inp = 'w-full rounded bg-slate-800 px-3 py-2 text-white';
const btn = 'rounded-lg px-4 py-2 text-sm font-semibold';

export default function MembresiasPage() {
  const user = useAuthStore((s) => s.user);
  const branchId = useAuthStore((s) => s.branchId);
  const ivaTasaDefault = useBrandingStore((s) => s.ivaTasaDefault);
  const preciosIncluyenIva = useBrandingStore((s) => s.preciosIncluyenIva);
  const membresiasOn = useBrandingStore((s) => s.membresiasOn);
  const cfg: IvaConfig = useMemo(() => ({ ivaTasaDefault, preciosIncluyenIva }), [ivaTasaDefault, preciosIncluyenIva]);
  const pestanas = pestanasVisibles(user?.roleCode);
  const [tab, setTab] = useState<Pestana>('socios');
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const gestion = pestanas.includes('planes');

  if (!user) return <div className="p-6 text-slate-300">Sin sesión.</div>;
  if (!['ADMIN', 'GERENTE', 'RECEPCION', 'SOPORTE'].includes(user.roleCode ?? '')) {
    return <div className="p-6 text-slate-300">Tu rol no tiene acceso a Membresías. Pide a un gerente.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 text-white">
      <h1 className="mb-1 text-2xl font-bold">Membresías</h1>
      {!membresiasOn && (
        <p className="mb-3 rounded bg-amber-900/30 p-3 text-sm text-amber-200">
          El cobro de membresías desde el POS no está activo para este negocio. Un administrador debe activar la capacidad
          «membresías» (Parámetros del POS); mientras tanto puedes dar de alta socios y planes.
        </p>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        {pestanas.map((p) => (
          <button key={p} onClick={() => { setTab(p); setMsg(null); }}
            className={`${btn} ${tab === p ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
            {ETIQUETA_PESTANA[p]}
          </button>
        ))}
      </div>
      {msg && <p className={`mb-3 text-sm ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.texto}</p>}

      {tab === 'socios' && <SociosTab cfg={cfg} gestion={gestion} setMsg={setMsg} sucursalId={user.branchId || branchId || localStorage.getItem('active_branch_id') || ''} userId={user.id} />}
      {tab === 'checkin' && <CheckinTab setMsg={setMsg} />}
      {tab === 'alertas' && <AlertasTab gestion={gestion} setMsg={setMsg} />}
      {tab === 'planes' && gestion && <PlanesTab cfg={cfg} setMsg={setMsg} />}
      {tab === 'reportes' && gestion && <ReportesTab setMsg={setMsg} />}
    </div>
  );
}

type SetMsg = (m: { ok: boolean; texto: string } | null) => void;

// ───────────────────────────── socios ─────────────────────────────
function SociosTab({ cfg, gestion, setMsg, sucursalId, userId }: { cfg: IvaConfig; gestion: boolean; setMsg: SetMsg; sucursalId: string; userId: string }) {
  const [socios, setSocios] = useState<SocioFila[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [q, setQ] = useState('');
  const [nuevo, setNuevo] = useState<Record<string, string> | null>(null);
  const [cobrando, setCobrando] = useState<SocioFila | null>(null);
  const [detalle, setDetalle] = useState<any | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api.get('/membresias/socios'), api.get('/membresias/planes', { params: { activos: 'true' } })]);
      setSocios(Array.isArray(s.data) ? s.data : []);
      setPlanes(Array.isArray(p.data) ? p.data : []);
    } catch (e) {
      setMsg({ ok: false, texto: mensajeError(e) });
    }
  }, [setMsg]);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = socios.filter((s) => !q.trim() || `${s.numeroSocio} ${s.nombre} ${s.apellidos ?? ''} ${s.telefono ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));

  async function guardarNuevo() {
    if (!nuevo?.nombre?.trim()) { setMsg({ ok: false, texto: 'Escribe el nombre del socio.' }); return; }
    try {
      await api.post('/membresias/socios', {
        nombre: nuevo.nombre, apellidos: nuevo.apellidos || null, telefono: nuevo.telefono || null, email: nuevo.email || null,
        numeroSocio: nuevo.numeroSocio || undefined, nip: nuevo.nip || undefined,
      });
      setNuevo(null);
      setMsg({ ok: true, texto: 'Socio guardado.' });
      await cargar();
    } catch (e) { setMsg({ ok: false, texto: mensajeError(e) }); }
  }

  async function accion(ruta: string, ok: string, cuerpo: object = {}) {
    try {
      await api.post(ruta, cuerpo);
      setMsg({ ok: true, texto: ok });
      await cargar();
    } catch (e) { setMsg({ ok: false, texto: mensajeError(e) }); }
  }

  async function verDetalle(s: SocioFila) {
    try { setDetalle((await api.get(`/membresias/socios/${s.id}`)).data); } catch (e) { setMsg({ ok: false, texto: mensajeError(e) }); }
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <input className={inp} placeholder="Buscar por número, nombre o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className={`${btn} whitespace-nowrap bg-blue-600`} onClick={() => setNuevo({ nombre: '', apellidos: '', telefono: '', email: '', numeroSocio: '', nip: '' })}>+ Nuevo socio</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-800 text-left"><tr>
            <th className="px-3 py-2">N.º</th><th className="px-3 py-2">Socio</th><th className="px-3 py-2">Membresía</th><th className="px-3 py-2">Vigencia</th><th className="px-3 py-2 text-right">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-800">
            {visibles.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">No hay socios.</td></tr>}
            {visibles.map((s) => {
              const m = s.situacion.periodo;
              return (
                <tr key={s.id} className="hover:bg-slate-800/50">
                  <td className="px-3 py-2">{s.numeroSocio}</td>
                  <td className="px-3 py-2">
                    <button className="font-medium underline-offset-2 hover:underline" onClick={() => verDetalle(s)}>{s.nombre} {s.apellidos ?? ''}</button>
                    {s.estado === 'BAJA' && <span className="ml-2 rounded bg-slate-700 px-2 py-0.5 text-xs">Baja</span>}
                    <div className="text-xs text-slate-400">{s.telefono ?? ''}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${CLASE_SITUACION[s.situacion.estado]}`}>{ETIQUETA_SITUACION[s.situacion.estado]}</span>
                    <div className="text-xs text-slate-400">{m?.planNombre ?? ''}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-300">{textoSituacion(s.situacion)}</td>
                  <td className="space-x-1 px-3 py-2 text-right">
                    {s.estado === 'ACTIVO' && (
                      <button className={`${btn} bg-green-700 py-1`} onClick={() => setCobrando(s)}>
                        {s.situacion.estado === 'SIN_MEMBRESIA' ? 'Cobrar' : 'Renovar'}
                      </button>
                    )}
                    {s.situacion.estado === 'VIGENTE' && m?.id && (
                      <button className={`${btn} bg-slate-700 py-1`} onClick={() => accion(`/membresias/${m.id}/congelar`, 'Membresía congelada.')}>Congelar</button>
                    )}
                    {s.situacion.estado === 'CONGELADA' && m?.id && (
                      <button className={`${btn} bg-sky-700 py-1`} onClick={() => accion(`/membresias/${m.id}/descongelar`, 'Membresía reactivada.')}>Descongelar</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {nuevo && (
        <Modal titulo="Nuevo socio" onCerrar={() => setNuevo(null)}>
          {([['nombre', 'Nombre *'], ['apellidos', 'Apellidos'], ['telefono', 'Teléfono'], ['email', 'Correo'],
            ['numeroSocio', 'Número de socio (vacío = consecutivo)'], ['nip', 'NIP de entrada, 4 a 6 dígitos (opcional)']] as const).map(([k, l]) => (
            <label key={k} className="mb-3 block text-sm text-slate-300">{l}
              <input className={`${inp} mt-1`} value={nuevo[k] ?? ''} onChange={(e) => setNuevo({ ...nuevo, [k]: e.target.value })} />
            </label>
          ))}
          <button className={`${btn} w-full bg-blue-600`} onClick={guardarNuevo}>Guardar socio</button>
        </Modal>
      )}

      {cobrando && (
        <CobrarModal socio={cobrando} planes={planes} cfg={cfg} sucursalId={sucursalId} userId={userId} setMsg={setMsg}
          onCerrar={() => setCobrando(null)} onListo={async () => { setCobrando(null); await cargar(); }} />
      )}

      {detalle && (
        <Modal titulo={`Socio #${detalle.numeroSocio} · ${detalle.nombre}`} onCerrar={() => setDetalle(null)}>
          <p className="mb-2 text-sm text-slate-300">{textoSituacion(detalle.situacion)}</p>
          <h4 className="mb-1 mt-3 text-xs font-semibold uppercase text-slate-400">Membresías</h4>
          {(detalle.membresias ?? []).length === 0 && <p className="text-sm text-slate-400">Sin membresías.</p>}
          {(detalle.membresias ?? []).map((m: any) => (
            <div key={m.id} className="flex justify-between border-b border-slate-800 py-1 text-sm">
              <span>{m.planNombre} · {fechaCorta(m.fechaInicio)} → {fechaCorta(m.fechaFin)}</span>
              <span className="text-slate-400">{m.estado}{m.folioVenta ? ` · ${m.folioVenta}` : ''} · {dinero(m.precioPagado)}</span>
            </div>
          ))}
          <h4 className="mb-1 mt-4 text-xs font-semibold uppercase text-slate-400">Últimas entradas</h4>
          {(detalle.checkins ?? []).length === 0 && <p className="text-sm text-slate-400">Sin entradas.</p>}
          {(detalle.checkins ?? []).map((c: any) => (
            <div key={c.id} className="flex justify-between border-b border-slate-800 py-1 text-sm">
              <span>{new Date(c.fechaHora).toLocaleString('es-MX')}</span>
              <span className={c.resultado === 'PERMITIDO' ? 'text-green-400' : 'text-red-400'}>{c.resultado}{c.motivo ? ` · ${c.motivo}` : ''}</span>
            </div>
          ))}
          {gestion && detalle.membresias?.some((m: any) => m.estado !== 'CANCELADA') && (
            <CancelarMembresia membresias={detalle.membresias} setMsg={setMsg} onListo={async () => { setDetalle(null); await cargar(); }} />
          )}
        </Modal>
      )}
    </div>
  );
}

function CancelarMembresia({ membresias, setMsg, onListo }: { membresias: any[]; setMsg: SetMsg; onListo: () => Promise<void> }) {
  const [id, setId] = useState('');
  const [motivo, setMotivo] = useState('');
  return (
    <div className="mt-4 rounded border border-red-900/50 p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase text-red-300">Cancelar una membresía (sin devolución de dinero)</h4>
      <select className={inp} value={id} onChange={(e) => setId(e.target.value)}>
        <option value="">Elige el periodo…</option>
        {membresias.filter((m) => m.estado !== 'CANCELADA').map((m) => <option key={m.id} value={m.id}>{m.planNombre} · {fechaCorta(m.fechaInicio)} → {fechaCorta(m.fechaFin)}</option>)}
      </select>
      <input className={`${inp} mt-2`} placeholder="Motivo (obligatorio)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <button className={`${btn} mt-2 w-full bg-red-700 disabled:opacity-40`} disabled={!id || !motivo.trim()}
        onClick={async () => {
          try { await api.post(`/membresias/${id}/cancelar`, { motivo }); setMsg({ ok: true, texto: 'Membresía cancelada.' }); await onListo(); }
          catch (e) { setMsg({ ok: false, texto: mensajeError(e) }); }
        }}>
        Cancelar membresía
      </button>
      <p className="mt-1 text-xs text-slate-500">Para regresar el dinero usa la devolución del POS: cancela la membresía sola.</p>
    </div>
  );
}

function CobrarModal({ socio, planes, cfg, sucursalId, userId, setMsg, onCerrar, onListo }: {
  socio: SocioFila; planes: Plan[]; cfg: IvaConfig; sucursalId: string; userId: string; setMsg: SetMsg; onCerrar: () => void; onListo: () => Promise<void>;
}) {
  const [planId, setPlanId] = useState(planes[0]?.id ?? '');
  const [forma, setForma] = useState<FormaPagoMembresia>('EFECTIVO');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const plan = planes.find((p) => p.id === planId);
  const precio = plan ? precioDelPlan(plan, cfg) : null;

  async function cobrar() {
    if (!plan) return;
    setOcupado(true);
    setError('');
    try {
      // El cobro necesita un turno abierto del cajero (entra al corte como cualquier venta del POS).
      const t = await api.get('/pos/shifts/open', { params: { cajero: userId, sucursalId } });
      const turno = t.data && typeof t.data === 'object' && t.data.id ? t.data : null;
      if (!turno) { setError('No hay turno abierto: abre turno en el POS antes de cobrar.'); return; }
      const cuerpo = armarCobro({ plan, socioId: socio.id, forma, turnoId: turno.id, sucursalId: sucursalId || turno.sucursalId, cajero: userId, cfg });
      const r = await api.post('/pos/sales', cuerpo);
      setMsg({ ok: true, texto: `Cobrado ${dinero(r.data?.total)} · folio ${r.data?.folio}. La membresía de ${socio.nombre} quedó registrada.` });
      await onListo();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Modal titulo={`${socio.situacion.estado === 'SIN_MEMBRESIA' ? 'Cobrar' : 'Renovar'} · ${socio.nombre}`} onCerrar={onCerrar}>
      {planes.length === 0 ? (
        <p className="text-sm text-amber-300">No hay planes activos. Crea uno en la pestaña Planes.</p>
      ) : (
        <>
          <label className="mb-3 block text-sm text-slate-300">Plan
            <select className={`${inp} mt-1`} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {periodoTexto(p.periodoTipo, p.periodoCantidad)}</option>)}
            </select>
          </label>
          {precio && (
            <div className="mb-3 rounded bg-slate-900 p-3 text-sm">
              <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{dinero(precio.base)}</span></div>
              <div className="flex justify-between text-slate-400"><span>IVA</span><span>{dinero(precio.impuestos)}</span></div>
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{dinero(precio.total)}</span></div>
              <p className="mt-1 text-xs text-slate-500">El servidor confirma el precio y el IVA al cobrar.</p>
            </div>
          )}
          <label className="mb-3 block text-sm text-slate-300">Forma de pago
            <select className={`${inp} mt-1`} value={forma} onChange={(e) => setForma(e.target.value as FormaPagoMembresia)}>
              <option value="EFECTIVO">Efectivo</option><option value="DEBITO">Tarjeta de débito</option>
              <option value="CREDITO">Tarjeta de crédito</option><option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </label>
          {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
          <button className={`${btn} w-full bg-green-700 disabled:opacity-40`} disabled={ocupado || !plan} onClick={cobrar}>
            {ocupado ? 'Cobrando…' : `Cobrar ${precio ? dinero(precio.total) : ''}`}
          </button>
        </>
      )}
    </Modal>
  );
}

// ───────────────────────────── check-in ─────────────────────────────
function CheckinTab({ setMsg }: { setMsg: SetMsg }) {
  const [valor, setValor] = useState('');
  const [modo, setModo] = useState<'numero' | 'nip'>('numero');
  const [resultado, setResultado] = useState<any | null>(null);
  const [recientes, setRecientes] = useState<any[]>([]);

  const cargar = useCallback(async () => {
    try { setRecientes((await api.get('/membresias/checkins')).data ?? []); } catch { /* la lista es informativa */ }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function registrar() {
    if (!valor.trim()) return;
    try {
      const r = await api.post('/membresias/checkin', modo === 'numero' ? { numero: valor.trim() } : { nip: valor.trim() });
      setResultado(r.data);
      setValor('');
      await cargar();
    } catch (e) { setMsg({ ok: false, texto: mensajeError(e) }); }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-3 flex gap-2">
        {(['numero', 'nip'] as const).map((m) => (
          <button key={m} className={`${btn} ${modo === m ? 'bg-blue-600' : 'bg-slate-800'}`} onClick={() => { setModo(m); setValor(''); }}>
            {m === 'numero' ? 'Número de socio' : 'NIP'}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input autoFocus className={`${inp} text-2xl`} inputMode="numeric" value={valor} type={modo === 'nip' ? 'password' : 'text'}
          placeholder={modo === 'numero' ? 'N.º de socio' : 'NIP'} onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && registrar()} />
        <button className={`${btn} bg-blue-600`} onClick={registrar}>Entrar</button>
      </div>
      {resultado && (
        <div className={`mt-4 rounded-xl p-5 ${resultado.permitido ? 'bg-green-900/40' : 'bg-red-900/40'}`}>
          <div className="text-3xl font-bold">{resultado.permitido ? '✔ Adelante' : '✖ No puede entrar'}</div>
          {resultado.socio && <div className="mt-1 text-lg">#{resultado.socio.numeroSocio} · {resultado.socio.nombre} {resultado.socio.apellidos ?? ''}</div>}
          {resultado.motivo && <div className="mt-1 text-red-200">{resultado.motivo}</div>}
          {resultado.permitido && <div className="mt-1 text-sm text-green-200">Vigente hasta {fechaCorta(resultado.vigenciaHasta)}</div>}
          {resultado.aviso && <div className="mt-1 text-amber-300">{resultado.aviso}</div>}
        </div>
      )}
      <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-400">Entradas recientes</h3>
      <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900 text-sm">
        {recientes.length === 0 && <p className="p-3 text-slate-400">Sin entradas en los últimos 7 días.</p>}
        {recientes.slice(0, 15).map((c) => (
          <div key={c.id} className="flex justify-between px-3 py-2">
            <span>{new Date(c.fechaHora).toLocaleString('es-MX')} · {c.metodo}</span>
            <span className={c.resultado === 'PERMITIDO' ? 'text-green-400' : 'text-red-400'}>{c.resultado}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────── alertas ─────────────────────────────
function AlertasTab({ gestion, setMsg }: { gestion: boolean; setMsg: SetMsg }) {
  const [data, setData] = useState<any | null>(null);
  const [aviso, setAviso] = useState('');
  const [gracia, setGracia] = useState('');

  const cargar = useCallback(async () => {
    try {
      const r = (await api.get('/membresias/alertas')).data;
      setData(r);
      setAviso(String(r.diasAviso));
      setGracia(String(r.diasGracia));
    } catch (e) { setMsg({ ok: false, texto: mensajeError(e) }); }
  }, [setMsg]);
  useEffect(() => { cargar(); }, [cargar]);

  async function guardarConfig() {
    const tid = localStorage.getItem('tenant_id');
    if (!tid) return;
    try {
      await api.put(`/tenant-settings/${tid}`, { membresiasDiasAviso: Number(aviso), membresiasDiasGracia: Number(gracia) });
      setMsg({ ok: true, texto: 'Días de aviso y de gracia guardados.' });
      await cargar();
    } catch (e) { setMsg({ ok: false, texto: mensajeError(e) }); }
  }

  if (!data) return <p className="text-slate-400">Cargando…</p>;
  const lista = (titulo: string, filas: any[], col: (f: any) => string) => (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-semibold text-slate-300">{titulo} ({filas.length})</h3>
      <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900 text-sm">
        {filas.length === 0 && <p className="p-3 text-slate-400">Nadie por ahora.</p>}
        {filas.map((f) => (
          <div key={f.socioId} className="flex flex-wrap justify-between gap-2 px-3 py-2">
            <span>#{f.numeroSocio} · {f.nombre}</span>
            <span className="text-slate-400">{f.telefono ?? f.email ?? ''}</span>
            <span>{col(f)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {lista(`Por vencer en ${data.diasAviso} días o menos`, data.porVencer, (f) => (f.diasRestantes === 0 ? 'vence hoy' : `vence en ${f.diasRestantes} d · ${fechaCorta(f.venceEl)}`))}
      {lista(`En mora (vencidos${data.diasGracia ? ` hace más de ${data.diasGracia} d` : ''})`, data.mora, (f) => `venció hace ${f.diasVencida} d · ${fechaCorta(f.vencioEl)}`)}
      {gestion && (
        <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
          <h3 className="mb-2 font-semibold">Configurar alertas</h3>
          <label className="mb-2 block text-slate-300">Avisar con cuántos días de anticipación
            <input className={`${inp} mt-1`} type="number" min={0} max={90} value={aviso} onChange={(e) => setAviso(e.target.value)} />
          </label>
          <label className="mb-3 block text-slate-300">Días de gracia antes de contar a un socio en mora
            <input className={`${inp} mt-1`} type="number" min={0} max={90} value={gracia} onChange={(e) => setGracia(e.target.value)} />
          </label>
          <button className={`${btn} bg-blue-600`} onClick={guardarConfig}>Guardar</button>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────── planes ─────────────────────────────
function PlanesTab({ cfg, setMsg }: { cfg: IvaConfig; setMsg: SetMsg }) {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [form, setForm] = useState<PlanForm | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try { setPlanes((await api.get('/membresias/planes')).data ?? []); } catch (e) { setMsg({ ok: false, texto: mensajeError(e) }); }
  }, [setMsg]);
  useEffect(() => { cargar(); }, [cargar]);

  async function guardar() {
    if (!form) return;
    const v = validarPlanForm(form);
    if (!v.ok) { setMsg({ ok: false, texto: v.error }); return; }
    try {
      if (editId) await api.put(`/membresias/planes/${editId}`, v.body);
      else await api.post('/membresias/planes', v.body);
      setForm(null);
      setEditId(null);
      setMsg({ ok: true, texto: 'Plan guardado.' });
      await cargar();
    } catch (e) { setMsg({ ok: false, texto: mensajeError(e) }); }
  }

  const campo = (k: keyof PlanForm, etiqueta: string, props: Record<string, unknown> = {}) => (
    <label className="mb-3 block text-sm text-slate-300">{etiqueta}
      <input className={`${inp} mt-1`} value={String(form![k])} onChange={(e) => setForm({ ...form!, [k]: e.target.value })} {...props} />
    </label>
  );

  return (
    <div>
      <button className={`${btn} mb-3 bg-blue-600`} onClick={() => { setEditId(null); setForm({ ...PLAN_FORM_VACIO }); }}>+ Nuevo plan</button>
      <div className="grid gap-3 md:grid-cols-2">
        {planes.length === 0 && <p className="text-slate-400">Aún no hay planes. Crea el primero.</p>}
        {planes.map((p) => {
          const pr = precioDelPlan(p, cfg);
          return (
            <div key={p.id} className={`rounded-xl border p-4 ${p.activo ? 'border-slate-800 bg-slate-900' : 'border-slate-800 bg-slate-900/40 opacity-70'}`}>
              <div className="flex justify-between">
                <h3 className="text-lg font-semibold">{p.nombre}</h3>
                <span className="text-lg font-bold">{dinero(pr.total)}</span>
              </div>
              <div className="text-sm text-slate-400">
                {periodoTexto(p.periodoTipo, p.periodoCantidad)} · IVA {p.tasaIva ? etiquetaTasa(p.tasaIva as any) : `del negocio (${etiquetaTasa(cfg.ivaTasaDefault)})`}
                {p.diasCongelacionMax > 0 ? ` · congela hasta ${p.diasCongelacionMax} d` : ''}
              </div>
              {p.beneficios?.descuentoPct ? <div className="mt-1 text-sm text-green-300">Beneficio: {p.beneficios.descuentoPct}% en compras del POS</div> : null}
              {(p.beneficios?.notas ?? []).map((n) => <div key={n} className="text-xs text-slate-400">• {n}</div>)}
              <div className="mt-3 flex items-center gap-2">
                <button className={`${btn} bg-slate-700 py-1`} onClick={() => { setEditId(p.id); setForm(planAForm(p)); }}>Editar</button>
                {!p.activo && <span className="text-xs text-slate-400">Desactivado</span>}
              </div>
            </div>
          );
        })}
      </div>

      {form && (
        <Modal titulo={editId ? 'Editar plan' : 'Nuevo plan'} onCerrar={() => { setForm(null); setEditId(null); }}>
          {campo('nombre', 'Nombre *')}
          {campo('descripcion', 'Descripción')}
          {campo('precio', cfg.preciosIncluyenIva ? 'Precio (ya incluye IVA) *' : 'Precio (sin IVA) *', { type: 'number', step: '0.01', min: 0 })}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="text-sm text-slate-300">Cada
              <input className={`${inp} mt-1`} type="number" min={1} value={form.periodoCantidad} onChange={(e) => setForm({ ...form, periodoCantidad: e.target.value })} />
            </label>
            <label className="text-sm text-slate-300">Periodo
              <select className={`${inp} mt-1`} value={form.periodoTipo} onChange={(e) => setForm({ ...form, periodoTipo: e.target.value as PlanForm['periodoTipo'] })}>
                <option value="DIAS">Días</option><option value="MESES">Meses</option><option value="ANOS">Años</option>
              </select>
            </label>
          </div>
          <label className="mb-3 block text-sm text-slate-300">IVA de este plan
            <select className={`${inp} mt-1`} value={form.tasaIva} onChange={(e) => setForm({ ...form, tasaIva: e.target.value })}>
              <option value="">Usar el del negocio ({etiquetaTasa(cfg.ivaTasaDefault)})</option>
              {TASAS_IVA.map((t) => <option key={t} value={t}>{etiquetaTasa(t)}</option>)}
            </select>
          </label>
          {campo('diasCongelacionMax', 'Días que puede congelar (0 = no se puede)', { type: 'number', min: 0 })}
          {campo('descuentoPct', 'Beneficio: % de descuento en compras del POS (tope según el rol que cobra)', { type: 'number', min: 0, max: 100 })}
          <label className="mb-3 block text-sm text-slate-300">Otros beneficios (uno por renglón)
            <textarea className={`${inp} mt-1`} rows={3} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </label>
          <label className="mb-3 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Plan activo (se puede cobrar)
          </label>
          <button className={`${btn} w-full bg-blue-600`} onClick={guardar}>Guardar plan</button>
        </Modal>
      )}
    </div>
  );
}

// ───────────────────────────── reportes ─────────────────────────────
function ReportesTab({ setMsg }: { setMsg: SetMsg }) {
  const hoy = new Date().toLocaleDateString('en-CA');
  const [resumen, setResumen] = useState<any | null>(null);
  const [grupo, setGrupo] = useState<string>('');
  const [detalle, setDetalle] = useState<any[]>([]);
  const [desde, setDesde] = useState(`${hoy.slice(0, 8)}01`);
  const [hasta, setHasta] = useState(hoy);
  const [ingresos, setIngresos] = useState<any | null>(null);

  const cargarResumen = useCallback(async (estado?: string) => {
    try {
      const r = (await api.get('/membresias/reportes/membresias', { params: estado ? { estado } : {} })).data;
      setResumen(r);
      setDetalle(r.detalle ?? []);
    } catch (e) { setMsg({ ok: false, texto: mensajeError(e) }); }
  }, [setMsg]);
  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  async function cargarIngresos() {
    try { setIngresos((await api.get('/membresias/reportes/ingresos', { params: { desde, hasta } })).data); }
    catch (e) { setMsg({ ok: false, texto: mensajeError(e) }); }
  }

  const tarjetas: Array<[string, string, number | undefined]> = resumen ? [
    ['vigentes', 'Activas', resumen.conteo.vigentes], ['por-vencer', `Por vencer (${resumen.diasAviso} d)`, resumen.conteo.porVencer],
    ['vencidas', 'Vencidas', resumen.conteo.vencidas], ['congeladas', 'Congeladas', resumen.conteo.congeladas],
    ['sin-membresia', 'Sin membresía', resumen.conteo.sinMembresia],
  ] : [];

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {tarjetas.map(([clave, etiqueta, n]) => (
          <button key={clave} onClick={() => { setGrupo(clave); cargarResumen(clave); }}
            className={`rounded-xl border p-4 text-left ${grupo === clave ? 'border-blue-500 bg-slate-800' : 'border-slate-800 bg-slate-900'}`}>
            <div className="text-3xl font-bold">{n ?? 0}</div>
            <div className="text-xs text-slate-400">{etiqueta}</div>
          </button>
        ))}
      </div>
      {grupo && (
        <div className="mb-6 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900 text-sm">
          {detalle.length === 0 && <p className="p-3 text-slate-400">Nadie en este grupo.</p>}
          {detalle.map((d) => (
            <div key={d.socioId} className="flex flex-wrap justify-between gap-2 px-3 py-2">
              <span>#{d.numeroSocio} · {d.nombre}</span>
              <span className="text-slate-400">{d.plan ?? ''} {d.telefono ? `· ${d.telefono}` : ''}</span>
              <span>{d.venceEl ? fechaCorta(d.venceEl) : ''}</span>
            </div>
          ))}
        </div>
      )}

      <h3 className="mb-2 text-sm font-semibold text-slate-300">Ingresos por concepto</h3>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="text-sm text-slate-300">Desde<input type="date" className={`${inp} mt-1`} value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
        <label className="text-sm text-slate-300">Hasta<input type="date" className={`${inp} mt-1`} value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
        <button className={`${btn} bg-blue-600`} onClick={cargarIngresos}>Ver ingresos</button>
      </div>
      {ingresos && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-slate-800 text-left"><tr><th className="px-3 py-2">Concepto</th><th className="px-3 py-2 text-right">Sin IVA</th><th className="px-3 py-2 text-right">IVA</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {ingresos.conceptos.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">Sin ventas en ese periodo.</td></tr>}
              {ingresos.conceptos.map((c: any) => (
                <tr key={c.concepto}><td className="px-3 py-2">{c.concepto}</td><td className="px-3 py-2 text-right">{dinero(c.base)}</td><td className="px-3 py-2 text-right">{dinero(c.impuestos)}</td><td className="px-3 py-2 text-right font-medium">{dinero(c.total)}</td></tr>
              ))}
              <tr className="bg-slate-800 font-bold"><td className="px-3 py-2">Total</td><td className="px-3 py-2 text-right">{dinero(ingresos.total.base)}</td><td className="px-3 py-2 text-right">{dinero(ingresos.total.impuestos)}</td><td className="px-3 py-2 text-right">{dinero(ingresos.total.total)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-slate-800 p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <button className="text-slate-400 hover:text-white" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
