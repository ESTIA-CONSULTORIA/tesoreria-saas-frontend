import { useMemo, useState } from 'react';
import { useBrandingStore } from '../../core/store/useBrandingStore';
import type { IvaConfig } from '../../core/utils/iva';
import type { FormaPago, MesasApi, Producto } from './mesasApi';
import {
  accionesVisibles, construirItem, desgloseIva, dinero, etiquetaIva, indicesPorCobrar, itemsVivos, mensajeError,
  type Cuenta, type ItemCuenta, type Mesa, type PoliticasMesas,
} from './mesasLogic';

// Panel de una mesa: abrir cuenta (mesa libre) o trabajar la cuenta abierta (agregar y quitar ítems, cobrar,
// dividir, cancelar). Los botones se muestran según política y rol; el backend decide siempre y su mensaje se
// muestra tal cual.
interface Props {
  mesa: Mesa;
  cuenta: Cuenta | undefined;
  productos: Producto[];
  politicas: PoliticasMesas | null;
  api: MesasApi;
  sucursalId: string | null;
  usuario: string;
  onCambio: () => Promise<void>;
  onCerrar: () => void;
}

const btn = 'rounded-lg px-4 py-3 text-sm font-semibold min-h-[48px]';
const FORMAS: Array<{ v: FormaPago; l: string }> = [
  { v: 'EFECTIVO', l: 'Efectivo' }, { v: 'DEBITO', l: 'Débito' }, { v: 'CREDITO', l: 'Crédito' }, { v: 'TRANSFERENCIA', l: 'Transferencia' },
];
type Modo = 'completo' | 'parcial' | 'items';

export default function PanelCuenta({ mesa, cuenta, productos, politicas, api, sucursalId, usuario, onCambio, onCerrar }: Props) {
  const [carrito, setCarrito] = useState<ItemCuenta[]>([]);
  // IVA del negocio: la tasa de cada producto (o la del negocio) y si los precios ya lo incluyen. Es solo la vista previa;
  // el servidor fija precio, IVA y total de la cuenta.
  const ivaTasaDefault = useBrandingStore((s) => s.ivaTasaDefault);
  const preciosIncluyenIva = useBrandingStore((s) => s.preciosIncluyenIva);
  const ivaCfg: IvaConfig = useMemo(() => ({ ivaTasaDefault, preciosIncluyenIva }), [ivaTasaDefault, preciosIncluyenIva]);
  const [busca, setBusca] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [modo, setModo] = useState<Modo>('completo');
  const [forma, setForma] = useState<FormaPago>('EFECTIVO');
  const [monto, setMonto] = useState('');
  const [recibido, setRecibido] = useState('');
  const [sel, setSel] = useState<number[]>([]);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');

  const acc = accionesVisibles(politicas, cuenta ?? null);
  const visibles = useMemo(
    () => productos.filter((p) => p.name.toLowerCase().includes(busca.trim().toLowerCase())).slice(0, 60),
    [productos, busca],
  );

  async function run(fn: () => Promise<unknown>, alExito?: () => void) {
    setOcupado(true);
    setError('');
    try {
      await fn();
      await onCambio();
      alExito?.();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }

  const agregar = (p: Producto) => {
    setCarrito((c) => {
      const i = c.findIndex((x) => x.productoId === p.id);
      if (i < 0) return [...c, construirItem(p, 1, ivaCfg)];
      const copia = [...c];
      copia[i] = construirItem({ id: p.id, name: p.name, price: p.price, tasaIva: p.tasaIva }, copia[i].cantidad + 1, ivaCfg);
      return copia;
    });
  };
  const restar = (id: string) =>
    setCarrito((c) =>
      c.flatMap((x) =>
        x.productoId !== id ? [x] : x.cantidad <= 1 ? [] : [construirItem({ id, name: x.nombre, price: x.precioUnitario, tasaIva: x.tasaIva }, x.cantidad - 1, ivaCfg)],
      ),
    );

  const abrir = () =>
    run(
      () => api.abrirCuenta({ tableId: mesa.id, sucursalId: sucursalId ?? '', items: carrito, total: desgloseIva(carrito, ivaCfg).total, cajero: usuario }),
      () => setCarrito([]),
    );
  const sumar = () => run(() => api.agregarItems(cuenta!.id, carrito), () => setCarrito([]));

  const montoNum = Number(monto);
  const recibidoNum = Number(recibido);
  const saldo = cuenta?.saldoPendiente ?? 0;
  const montoACobrar = modo === 'completo' ? saldo : modo === 'parcial' ? montoNum : undefined;
  const cambio =
    forma === 'EFECTIVO' && montoACobrar && recibidoNum > montoACobrar ? Math.round((recibidoNum - montoACobrar) * 100) / 100 : 0;

  const cobrar = () => {
    const body: Parameters<MesasApi['cobrar']>[1] = { formaPago: forma };
    if (modo === 'parcial') body.monto = montoNum;
    if (modo === 'items') body.itemIndexes = sel;
    if (forma === 'EFECTIVO' && recibidoNum > 0 && modo !== 'items') {
      body.montoRecibido = recibidoNum;
      body.cambio = cambio;
    }
    return run(
      () => api.cobrar(cuenta!.id, body),
      () => {
        setCobrando(false);
        setMonto('');
        setRecibido('');
        setSel([]);
      },
    );
  };

  const sinCuenta = !cuenta;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 sm:items-center">
      <div className="relative flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-950 text-white sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 p-4">
          <div>
            <h2 className="text-lg font-bold">
              Mesa {mesa.number}
              {cuenta?.folio ? ` · ${cuenta.folio}` : ''}
            </h2>
            <p className="text-xs text-slate-400">{sinCuenta ? 'Mesa libre: arma la cuenta y ábrela.' : `Atiende: ${cuenta?.cajero ?? '—'}`}</p>
          </div>
          <button className={`${btn} bg-slate-800`} onClick={onCerrar}>Cerrar</button>
        </header>

        {error && !cobrando && !cancelando && (
          <div role="alert" className="border-b border-red-900 bg-red-950 px-4 py-3 text-sm text-red-200">{error}</div>
        )}

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2">
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Cuenta</h3>
            {cuenta && (
              <ul className="mb-3 space-y-2">
                {cuenta.items.map((it, i) =>
                  it.anulado ? null : (
                    <li key={i} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 p-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{it.cantidad} × {it.nombre}</div>
                        <div className="text-xs text-slate-400">
                          {dinero(it.subtotal)}
                          {it.notaCocinaId ? ' · enviado a cocina/barra' : ''}
                          {(cuenta.formasPago ?? []).some((p) => (p.itemIndexes ?? []).includes(i)) ? ' · cobrado' : ''}
                        </div>
                      </div>
                      {acc.quitarItem(it, i) && (
                        <button
                          disabled={ocupado}
                          className={`${btn} bg-red-900 text-red-100 disabled:opacity-40`}
                          onClick={() => run(() => api.quitarItem(cuenta.id, i))}
                        >
                          Quitar
                        </button>
                      )}
                    </li>
                  ),
                )}
                {itemsVivos(cuenta).length === 0 && <li className="text-sm text-slate-400">La cuenta no tiene ítems.</li>}
              </ul>
            )}
            {cuenta && (
              <div className="mb-3 rounded-lg bg-slate-900 p-3 text-sm">
                {cuenta.impuestos !== undefined && (
                  <div className="flex justify-between text-slate-400"><span>Subtotal + IVA</span><span>{dinero(cuenta.subtotal)} + {dinero(cuenta.impuestos)}</span></div>
                )}
                <div className="flex justify-between"><span>Total</span><b>{dinero(cuenta.total)}</b></div>
                <div className="flex justify-between text-slate-400"><span>Pagado</span><span>{dinero(cuenta.pagado)}</span></div>
                <div className="flex justify-between text-amber-300"><span>Saldo</span><b>{dinero(cuenta.saldoPendiente)}</b></div>
              </div>
            )}

            {carrito.length > 0 && (
              <div className="mb-3 rounded-lg border border-blue-900 bg-blue-950/40 p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase text-blue-300">{sinCuenta ? 'Por abrir' : 'Por agregar'}</h4>
                {carrito.map((it) => (
                  <div key={it.productoId} className="flex items-center justify-between py-1 text-sm">
                    <span>{it.cantidad} × {it.nombre}</span>
                    <span className="flex items-center gap-2">
                      {dinero(it.subtotal)}
                      <button className="h-10 w-10 rounded-lg bg-slate-800" onClick={() => restar(it.productoId)} aria-label="Restar">−</button>
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex justify-between text-xs text-slate-300">
                  <span>
                    Subtotal {dinero(desgloseIva(carrito, ivaCfg).subtotal)} + {etiquetaIva(carrito, ivaCfg)} {dinero(desgloseIva(carrito, ivaCfg).iva)}
                    {ivaCfg.preciosIncluyenIva ? ' (precios con IVA incluido)' : ''}
                  </span>
                </div>
                <button
                  disabled={ocupado || (sinCuenta && !sucursalId)}
                  className={`${btn} mt-2 w-full bg-blue-600 disabled:opacity-40`}
                  onClick={sinCuenta ? abrir : sumar}
                >
                  {sinCuenta ? `Abrir cuenta · ${dinero(desgloseIva(carrito, ivaCfg).total)}` : `Agregar a la cuenta · ${dinero(desgloseIva(carrito, ivaCfg).total)}`}
                </button>
                {sinCuenta && !sucursalId && <p className="mt-1 text-xs text-amber-300">Falta la sucursal de la sesión.</p>}
              </div>
            )}

            {cuenta && (
              <div className="flex flex-wrap gap-2">
                {acc.cobrar && (
                  <button disabled={ocupado} className={`${btn} bg-green-700 disabled:opacity-40`} onClick={() => { setModo('completo'); setCobrando(true); }}>
                    Cobrar
                  </button>
                )}
                {acc.dividir && (
                  <button disabled={ocupado} className={`${btn} bg-indigo-700 disabled:opacity-40`} onClick={() => { setModo('parcial'); setCobrando(true); }}>
                    Dividir
                  </button>
                )}
                {acc.cancelar && (
                  <button disabled={ocupado} className={`${btn} bg-red-900 disabled:opacity-40`} onClick={() => setCancelando(true)}>
                    Cancelar cuenta
                  </button>
                )}
                {!acc.cobrar && <p className="w-full text-xs text-slate-400">El cobro de esta cuenta se hace en caja.</p>}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Productos</h3>
            <input
              className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-base"
              placeholder="Buscar producto"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {visibles.map((p) => (
                <button key={p.id} className="min-h-[72px] rounded-lg border border-slate-700 bg-slate-900 p-2 text-left active:bg-slate-800" onClick={() => agregar(p)}>
                  <div className="text-sm font-medium leading-tight">{p.name}</div>
                  <div className="text-xs text-slate-400">{dinero(p.price)}</div>
                </button>
              ))}
              {visibles.length === 0 && <p className="col-span-full text-sm text-slate-400">Sin productos.</p>}
            </div>
          </section>
        </div>

        {cobrando && cuenta && (
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
            <div className="w-full max-w-md space-y-3 rounded-t-2xl border border-slate-700 bg-slate-900 p-5 sm:rounded-2xl">
              <h3 className="text-lg font-bold">{modo === 'completo' ? 'Cobrar cuenta' : 'Dividir cuenta'} · saldo {dinero(saldo)}</h3>
              {error && <div role="alert" className="rounded-lg bg-red-950 p-2 text-sm text-red-200">{error}</div>}
              {acc.dividir && (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {(['completo', 'parcial', 'items'] as Modo[])
                    .filter((m) => (m === 'completo' ? acc.cobrar : true))
                    .map((m) => (
                      <button key={m} className={`${btn} ${modo === m ? 'bg-blue-600' : 'bg-slate-800'}`} onClick={() => setModo(m)}>
                        {m === 'completo' ? 'Completa' : m === 'parcial' ? 'Por monto' : 'Por ítems'}
                      </button>
                    ))}
                </div>
              )}
              {modo === 'parcial' && (
                <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-base" inputMode="decimal" placeholder="Monto a cobrar" value={monto} onChange={(e) => setMonto(e.target.value)} />
              )}
              {modo === 'items' && (
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {indicesPorCobrar(cuenta).map((i) => (
                    <label key={i} className="flex items-center gap-3 rounded-lg bg-slate-950 p-3 text-sm">
                      <input type="checkbox" className="h-5 w-5" checked={sel.includes(i)} onChange={(e) => setSel(e.target.checked ? [...sel, i] : sel.filter((x) => x !== i))} />
                      {cuenta.items[i].cantidad} × {cuenta.items[i].nombre} · {dinero(cuenta.items[i].subtotal)}
                    </label>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {FORMAS.map((f) => (
                  <button key={f.v} className={`${btn} ${forma === f.v ? 'bg-blue-600' : 'bg-slate-800'}`} onClick={() => setForma(f.v)}>{f.l}</button>
                ))}
              </div>
              {forma === 'EFECTIVO' && modo !== 'items' && (
                <div>
                  <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-base" inputMode="decimal" placeholder="Recibido (opcional)" value={recibido} onChange={(e) => setRecibido(e.target.value)} />
                  {cambio > 0 && <p className="mt-1 text-sm text-green-300">Cambio: {dinero(cambio)}</p>}
                </div>
              )}
              <div className="flex gap-2">
                <button className={`${btn} flex-1 bg-slate-800`} onClick={() => { setCobrando(false); setError(''); }}>Volver</button>
                <button
                  disabled={ocupado || (modo === 'parcial' && !(montoNum > 0)) || (modo === 'items' && sel.length === 0)}
                  className={`${btn} flex-1 bg-green-700 disabled:opacity-40`}
                  onClick={cobrar}
                >
                  Confirmar cobro
                </button>
              </div>
            </div>
          </div>
        )}

        {cancelando && cuenta && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <h3 className="text-lg font-bold">Cancelar la cuenta de la mesa {mesa.number}</h3>
              {error && <div role="alert" className="rounded-lg bg-red-950 p-2 text-sm text-red-200">{error}</div>}
              <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-base" placeholder="Motivo (obligatorio)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              <div className="flex gap-2">
                <button className={`${btn} flex-1 bg-slate-800`} onClick={() => { setCancelando(false); setError(''); }}>Volver</button>
                <button
                  disabled={ocupado || !motivo.trim()}
                  className={`${btn} flex-1 bg-red-800 disabled:opacity-40`}
                  onClick={() => run(() => api.cancelar(cuenta.id, motivo.trim()), () => { setCancelando(false); onCerrar(); })}
                >
                  Cancelar cuenta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
