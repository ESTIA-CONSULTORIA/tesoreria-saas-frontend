import { useMemo, useState } from 'react';
import { useBrandingStore } from '../../core/store/useBrandingStore';
import { esFormaTarjeta, motivoFaltaTarjeta, soloUltimos4 } from '../../core/utils/tarjeta';
import type { IvaConfig } from '../../core/utils/iva';
import { textoAtiende } from '../../core/utils/nombreUsuario';
import { InputBusqueda } from '../../core/components/InputBusqueda';
import { Boton } from '../../core/components/Boton';
import { AlertaModal } from '../../core/components/AlertaModal';
import { Modal } from '../../core/components/Modal';
import { ModalFooter } from '../../core/components/ModalFooter';
import { CobroModal } from '../../core/components/cobro/CobroModal';
import type { ClaveForma } from '../../core/components/cobro/reglasCobro';
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
  nombreMesero?: string; // nombre ya resuelto de quien atiende la cuenta (solo presentación)
  onCambio: () => Promise<void>;
  onCerrar: () => void;
}

const btn = 'rounded-lg px-4 py-3 text-sm font-semibold min-h-[48px]';
const FORMAS: Array<{ v: FormaPago; l: string }> = [
  { v: 'EFECTIVO', l: 'Efectivo' }, { v: 'DEBITO', l: 'Débito' }, { v: 'CREDITO', l: 'Crédito' }, { v: 'TRANSFERENCIA', l: 'Transferencia' },
];
type Modo = 'completo' | 'parcial' | 'items';

export default function PanelCuenta({ mesa, cuenta, productos, politicas, api, sucursalId, usuario, nombreMesero, onCambio, onCerrar }: Props) {
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
  const [ultimos4, setUltimos4] = useState('');
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

  const motivoTarjeta = motivoFaltaTarjeta(forma, ultimos4);
  const cobrar = () => {
    if (motivoTarjeta) return Promise.resolve();
    const body: Parameters<MesasApi['cobrar']>[1] = { formaPago: forma };
    if (modo === 'parcial') body.monto = montoNum;
    if (modo === 'items') body.itemIndexes = sel;
    if (esFormaTarjeta(forma)) body.ultimos4Digitos = ultimos4;
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
        setUltimos4('');
        setSel([]);
      },
    );
  };

  const sinCuenta = !cuenta;

  return (
    <Modal
      size="xl"
      title={`Mesa ${mesa.number}${cuenta?.folio ? ` · ${cuenta.folio}` : ''}`}
      subtitle={textoAtiende(sinCuenta, nombreMesero)}
      onClose={onCerrar}
      enterModo="avanzar"
      footer={<ModalFooter principal={<Boton variante="secundario" onClick={onCerrar}>Cerrar</Boton>} />}
    >
      {error && !cobrando && !cancelando ? <AlertaModal className="mb-3">{error}</AlertaModal> : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide !text-content-3">Cuenta</h3>
            {cuenta && (
              <ul className="mb-3 space-y-2">
                {cuenta.items.map((it, i) =>
                  it.anulado ? null : (
                    <li key={i} className="flex items-center gap-2 rounded-lg border !border-line !bg-nav p-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{it.cantidad} × {it.nombre}</div>
                        <div className="text-xs !text-content-3">
                          {dinero(it.subtotal)}
                          {it.notaCocinaId ? ' · enviado a cocina/barra' : ''}
                          {(cuenta.formasPago ?? []).some((p) => (p.itemIndexes ?? []).includes(i)) ? ' · cobrado' : ''}
                        </div>
                      </div>
                      {acc.quitarItem(it, i) && (
                        <button
                          disabled={ocupado}
                          className={`${btn} !bg-danger-soft !text-danger disabled:opacity-40`}
                          onClick={() => run(() => api.quitarItem(cuenta.id, i))}
                        >
                          Quitar
                        </button>
                      )}
                    </li>
                  ),
                )}
                {itemsVivos(cuenta).length === 0 && <li className="text-sm !text-content-3">La cuenta no tiene ítems.</li>}
              </ul>
            )}
            {cuenta && (
              <div className="mb-3 rounded-lg !bg-nav p-3 text-sm">
                {cuenta.impuestos !== undefined && (
                  <div className="flex justify-between !text-content-3"><span>Subtotal + IVA</span><span>{dinero(cuenta.subtotal)} + {dinero(cuenta.impuestos)}</span></div>
                )}
                <div className="flex justify-between"><span>Total</span><b>{dinero(cuenta.total)}</b></div>
                <div className="flex justify-between !text-content-3"><span>Pagado</span><span>{dinero(cuenta.pagado)}</span></div>
                <div className="flex justify-between text-tono-amber-300"><span>Saldo</span><b>{dinero(cuenta.saldoPendiente)}</b></div>
              </div>
            )}

            {carrito.length > 0 && (
              <div className="mb-3 rounded-lg border border-tono-blue-900 bg-tono-blue-950/40 p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase !text-link">{sinCuenta ? 'Por abrir' : 'Por agregar'}</h4>
                {carrito.map((it) => (
                  <div key={it.productoId} className="flex items-center justify-between py-1 text-sm">
                    <span>{it.cantidad} × {it.nombre}</span>
                    <span className="flex items-center gap-2">
                      {dinero(it.subtotal)}
                      <button className="h-10 w-10 rounded-lg !bg-surface-1" onClick={() => restar(it.productoId)} aria-label="Restar">−</button>
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex justify-between text-xs !text-content-2">
                  <span>
                    Subtotal {dinero(desgloseIva(carrito, ivaCfg).subtotal)} + {etiquetaIva(carrito, ivaCfg)} {dinero(desgloseIva(carrito, ivaCfg).iva)}
                    {ivaCfg.preciosIncluyenIva ? ' (precios con IVA incluido)' : ''}
                  </span>
                </div>
                <Boton
                  tamano="lg"
                  completo
                  confirma={false}
                  className="mt-2"
                  disabled={ocupado || (sinCuenta && !sucursalId)}
                  onClick={sinCuenta ? abrir : sumar}
                >
                  {sinCuenta ? `Abrir cuenta · ${dinero(desgloseIva(carrito, ivaCfg).total)}` : `Agregar a la cuenta · ${dinero(desgloseIva(carrito, ivaCfg).total)}`}
                </Boton>
                {sinCuenta && !sucursalId && <p className="mt-1 text-xs text-tono-amber-300">Falta la sucursal de la sesión.</p>}
              </div>
            )}

            {cuenta && (
              <div className="flex flex-wrap gap-2">
                {acc.cobrar && (
                  <Boton variante="exito" tamano="lg" confirma={false} disabled={ocupado} onClick={() => { setModo('completo'); setCobrando(true); }}>
                    Cobrar
                  </Boton>
                )}
                {acc.dividir && (
                  <Boton tamano="lg" confirma={false} disabled={ocupado} onClick={() => { setModo('parcial'); setCobrando(true); }}>
                    Dividir
                  </Boton>
                )}
                {acc.cancelar && (
                  <Boton variante="peligro" tamano="lg" confirma={false} disabled={ocupado} onClick={() => setCancelando(true)}>
                    Cancelar cuenta
                  </Boton>
                )}
                {!acc.cobrar && <p className="w-full text-xs !text-content-3">El cobro de esta cuenta se hace en caja.</p>}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide !text-content-3">Productos</h3>
            <InputBusqueda
              name="mesas-buscar-producto"
              aria-label="Buscar producto"
              className="mb-2 w-full rounded-lg border !border-line !bg-nav px-3 py-3 text-base"
              placeholder="Buscar producto"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {visibles.map((p) => (
                <button key={p.id} className="min-h-[72px] rounded-lg border !border-line !bg-nav p-2 text-left active:bg-tono-slate-800" onClick={() => agregar(p)}>
                  <div className="text-sm font-medium leading-tight">{p.name}</div>
                  <div className="text-xs !text-content-3">{dinero(p.price)}</div>
                </button>
              ))}
              {visibles.length === 0 && <p className="col-span-full text-sm !text-content-3">Sin productos.</p>}
            </div>
          </section>
      </div>

        {cobrando && cuenta && (
          <CobroModal
            titulo={modo === 'completo' ? 'Cobrar cuenta' : 'Dividir cuenta'}
            etiquetaTotal="Saldo a cobrar"
            totalTexto={dinero(saldo)}
            formas={FORMAS.map((f) => ({ clave: f.v as ClaveForma, etiqueta: f.l }))}
            formaActiva={forma}
            onElegirForma={(f) => { setForma(f as FormaPago); setUltimos4(''); }}
            columnaFormas={
              acc.dividir ? (
                <>
                  <p className="mt-1 text-xs !text-content-3">CUÁNTO COBRAR</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['completo', 'parcial', 'items'] as Modo[])
                      .filter((m) => (m === 'completo' ? acc.cobrar : true))
                      .map((m) => (
                        <Boton key={m} variante={modo === m ? 'principal' : 'secundario'} confirma={false} tamano="sm" aria-pressed={modo === m} onClick={() => setModo(m)}>
                          {m === 'completo' ? 'Completa' : m === 'parcial' ? 'Por monto' : 'Por ítems'}
                        </Boton>
                      ))}
                  </div>
                </>
              ) : undefined
            }
            cuerpoImporte={
              modo === 'items' ? (
                <div className="mb-3 max-h-56 space-y-1 overflow-y-auto">
                  {indicesPorCobrar(cuenta).map((i) => (
                    <label key={i} className="flex items-center gap-3 rounded-lg !bg-nav p-3 text-sm">
                      <input type="checkbox" className="h-5 w-5" checked={sel.includes(i)} onChange={(e) => setSel(e.target.checked ? [...sel, i] : sel.filter((x) => x !== i))} />
                      {cuenta.items[i].cantidad} × {cuenta.items[i].nombre} · {dinero(cuenta.items[i].subtotal)}
                    </label>
                  ))}
                </div>
              ) : modo === 'completo' && forma !== 'EFECTIVO' ? (
                <p className="mb-3 text-sm !text-content-3">Se cobra el saldo completo de la cuenta.</p>
              ) : undefined
            }
            campos={[
              ...(modo === 'parcial' ? [{ id: 'monto', etiqueta: 'Monto a cobrar', valor: monto, onCambio: setMonto, grande: true }] : []),
              ...(forma === 'EFECTIVO' && modo !== 'items' ? [{ id: 'recibido', etiqueta: 'Recibido (opcional)', valor: recibido, onCambio: setRecibido, grande: modo !== 'parcial' }] : []),
            ]}
            onExacto={
              modo === 'items'
                ? undefined
                : () => {
                    if (modo === 'parcial') setMonto(String(saldo));
                    else if (forma === 'EFECTIVO') setRecibido(String(saldo));
                  }
            }
            lineas={[
              { etiqueta: 'Total de la cuenta', valor: dinero(cuenta.total) },
              { etiqueta: 'Pagado', valor: dinero(cuenta.pagado), tono: 'ok' },
              { etiqueta: 'Saldo', valor: dinero(saldo), tono: saldo > 0 ? 'peligro' : 'tenue' },
              ...(cambio > 0 ? [{ etiqueta: 'Cambio', valor: dinero(cambio), tono: 'ok' as const }] : []),
            ]}
            detalle={
              esFormaTarjeta(forma) ? (
                <div>
                  <label htmlFor="mesa-ultimos4" className="mb-1 block text-sm !text-content-3">Últimos 4 dígitos de la tarjeta *</label>
                  <input
                    id="mesa-ultimos4"
                    className="w-full rounded-lg border !border-line !bg-nav px-3 py-3 text-base"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    placeholder="1234"
                    value={ultimos4}
                    onChange={(e) => setUltimos4(soloUltimos4(e.target.value))}
                  />
                </div>
              ) : undefined
            }
            error={error || null}
            textoCancelar="Volver"
            onCancel={() => { setCobrando(false); setError(''); }}
            textoConfirmar="Confirmar cobro"
            onConfirm={cobrar}
            procesando={ocupado}
            motivoBloqueo={motivoTarjeta ?? (modo === 'parcial' && !(montoNum > 0) ? 'Escribe el monto a cobrar' : modo === 'items' && sel.length === 0 ? 'Elige al menos un ítem' : null)}
          />
        )}

        {cancelando && cuenta && (
          <Modal
            size="sm"
            title={`Cancelar la cuenta de la mesa ${mesa.number}`}
            onClose={() => { setCancelando(false); setError(''); }}
            footer={
              <ModalFooter
                secundario={<Boton variante="secundario" onClick={() => { setCancelando(false); setError(''); }}>Volver</Boton>}
                principal={
                  <Boton
                    variante="peligro"
                    disabled={ocupado || !motivo.trim()}
                    onClick={() => run(() => api.cancelar(cuenta.id, motivo.trim()), () => { setCancelando(false); onCerrar(); })}
                  >
                    Cancelar cuenta
                  </Boton>
                }
              />
            }
          >
            {error ? <AlertaModal className="mb-3">{error}</AlertaModal> : null}
            <label htmlFor="mesa-motivo-cancelar" className="mb-1 block text-sm !text-content-3">Motivo (obligatorio) *</label>
            <input
              id="mesa-motivo-cancelar"
              className="w-full rounded-lg border !border-line !bg-bg px-3 py-3 text-base"
              placeholder="¿Por qué se cancela la cuenta?"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              data-autofocus=""
            />
            {!motivo.trim() ? <p className="mt-1 text-xs !text-content-3">Escribe el motivo para poder cancelar la cuenta.</p> : null}
          </Modal>
        )}
    </Modal>
  );
}
