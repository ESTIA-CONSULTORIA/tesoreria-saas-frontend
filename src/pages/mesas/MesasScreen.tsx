import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AxiosInstance } from 'axios';
import { mesasApi, type Producto } from './mesasApi';
import {
  cuentaDeMesa, dinero, ESTADO_MESA, mensajeError, MENSAJE_SIN_CONEXION,
  type Area, type Cuenta, type Mesa, type PoliticasMesas,
} from './mesasLogic';
import PanelCuenta from './PanelCuenta';
import ConfigMesas from './ConfigMesas';

// Una sola pantalla para las dos rutas: /mesas (sesión ERP) y /mesero (POS Lite con NIP). Mapa por área con monto y
// mesero, lista de cuentas abiertas y panel de cuenta. Todo va directo al backend: ninguna operación de cuenta
// abierta entra a la cola offline, y sin conexión un banner bloquea la pantalla.
interface Props {
  client: AxiosInstance;
  tenantId: string;
  sucursalId: string | null;
  usuario: string; // email o nombre que se muestra
  puedeConfigurar: boolean; // alta de áreas y mesas: ADMIN / GERENTE con sesión ERP
  onSalir?: () => void;
}

const POLL_MS = 8000;

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export default function MesasScreen({ client, tenantId, sucursalId, usuario, puedeConfigurar, onSalir }: Props) {
  const api = useMemo(() => mesasApi(client), [client]);
  const online = useOnline();
  const [habilitado, setHabilitado] = useState<boolean | null>(null);
  const [politicas, setPoliticas] = useState<PoliticasMesas | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [vista, setVista] = useState<'mapa' | 'cuentas' | 'config'>('mapa');
  const [mesaSel, setMesaSel] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const vivo = useRef(true);

  const cargar = useCallback(async () => {
    try {
      const [a, c] = await Promise.all([api.areas(), api.cuentas(sucursalId ?? undefined)]);
      if (!vivo.current) return;
      setAreas(a);
      setCuentas(c);
      setError('');
    } catch (e) {
      if (vivo.current) setError(mensajeError(e, 'No se pudieron cargar las mesas.'));
    } finally {
      if (vivo.current) setCargando(false);
    }
  }, [api, sucursalId]);

  useEffect(() => {
    vivo.current = true;
    return () => { vivo.current = false; };
  }, []);

  // La pantalla existe solo con la capacidad mesas_cuenta_abierta; sin ella no se llama a nada más.
  useEffect(() => {
    let cancelado = false;
    api.capacidadMesas(tenantId)
      .then((ok) => { if (!cancelado) setHabilitado(ok); })
      .catch(() => { if (!cancelado) setHabilitado(false); });
    return () => { cancelado = true; };
  }, [api, tenantId]);

  useEffect(() => {
    if (!habilitado) return;
    api.politicas().then(setPoliticas).catch(() => setPoliticas(null));
    api.productos().then(setProductos).catch(() => setProductos([]));
    cargar();
    const t = setInterval(() => { if (navigator.onLine) cargar(); }, POLL_MS);
    return () => clearInterval(t);
  }, [habilitado, api, cargar]);

  const mesaActual: Mesa | undefined = useMemo(
    () => areas.flatMap((a) => a.tables ?? []).find((m) => m.id === mesaSel),
    [areas, mesaSel],
  );

  if (habilitado === null) return <div className="p-6 text-slate-300">Cargando…</div>;
  if (!habilitado) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-slate-300">
        <h1 className="mb-2 text-xl font-bold text-white">Mesas no habilitadas</h1>
        <p className="text-sm">Este negocio no tiene activa la capacidad de cuentas abiertas por mesa. Pídele a un administrador que la active.</p>
        {onSalir && <button className="mt-4 rounded-lg bg-slate-800 px-4 py-3 text-sm" onClick={onSalir}>Salir</button>}
      </div>
    );
  }

  const meseroDe = (c?: Cuenta) => (c?.cajero ? c.cajero.split('@')[0] : '');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {!online && (
        <div role="alert" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/90 p-8 text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-amber-300">Sin conexión</h2>
          <p className="max-w-sm text-sm text-slate-200">{MENSAJE_SIN_CONEXION}</p>
          <p className="text-xs text-slate-400">Se reanuda sola cuando vuelva el internet.</p>
        </div>
      )}

      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900 p-3">
        <div className="mr-auto">
          <h1 className="text-lg font-bold">Mesas</h1>
          <p className="text-xs text-slate-400">{usuario}{politicas?.rol ? ` · ${politicas.rol}` : ''}</p>
        </div>
        {(['mapa', 'cuentas'] as const).map((v) => (
          <button key={v} className={`min-h-[44px] rounded-lg px-4 text-sm font-semibold ${vista === v ? 'bg-blue-600' : 'bg-slate-800'}`} onClick={() => setVista(v)}>
            {v === 'mapa' ? 'Mapa' : `Cuentas (${cuentas.length})`}
          </button>
        ))}
        {puedeConfigurar && (
          <button className={`min-h-[44px] rounded-lg px-4 text-sm font-semibold ${vista === 'config' ? 'bg-blue-600' : 'bg-slate-800'}`} onClick={() => setVista('config')}>
            Áreas y mesas
          </button>
        )}
        {onSalir && <button className="min-h-[44px] rounded-lg bg-slate-800 px-4 text-sm" onClick={onSalir}>Salir</button>}
      </header>

      {error && <div role="alert" className="border-b border-red-900 bg-red-950 px-4 py-3 text-sm text-red-200">{error}</div>}
      {cargando && <p className="p-4 text-sm text-slate-400">Cargando mesas…</p>}

      {vista === 'mapa' && (
        <div className="space-y-6 p-4">
          {areas.filter((a) => a.isActive !== false).map((area) => (
            <section key={area.id}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{area.name}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {(area.tables ?? []).filter((m) => m.isActive !== false).sort((a, b) => a.number - b.number).map((m) => {
                  const cuenta = cuentaDeMesa(cuentas, m.id);
                  const est = cuenta ? ESTADO_MESA.OCCUPIED : ESTADO_MESA[m.status] ?? ESTADO_MESA.AVAILABLE;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMesaSel(m.id)}
                      className="min-h-[112px] rounded-xl border-2 p-3 text-left active:opacity-80"
                      style={{ borderColor: est.color, backgroundColor: `${est.color}18` }}
                    >
                      <div className="text-xl font-bold">{m.number}</div>
                      <div className="text-xs" style={{ color: est.color }}>{est.label} · {m.capacity} pax</div>
                      {cuenta && (
                        <>
                          <div className="mt-1 text-sm font-semibold">{dinero(cuenta.saldoPendiente)}</div>
                          <div className="truncate text-xs text-slate-300">{meseroDe(cuenta)}</div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {!cargando && areas.length === 0 && (
            <p className="text-sm text-slate-400">No hay áreas ni mesas configuradas{puedeConfigurar ? ': créalas en “Áreas y mesas”.' : '.'}</p>
          )}
        </div>
      )}

      {vista === 'cuentas' && (
        <ul className="space-y-2 p-4">
          {cuentas.map((c) => {
            const mesa = areas.flatMap((a) => a.tables ?? []).find((m) => m.id === c.tableId);
            return (
              <li key={c.id}>
                <button className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 text-left active:bg-slate-800" onClick={() => setMesaSel(c.tableId)}>
                  <span>
                    <b>Mesa {mesa?.number ?? '?'}</b>
                    <span className="ml-2 text-sm text-slate-400">{meseroDe(c) || 'sin mesero'} · {c.folio}</span>
                  </span>
                  <span className="text-right">
                    <div className="text-sm font-semibold">{dinero(c.saldoPendiente)}</div>
                    <div className="text-xs text-slate-400">de {dinero(c.total)}</div>
                  </span>
                </button>
              </li>
            );
          })}
          {cuentas.length === 0 && !cargando && <li className="text-sm text-slate-400">No hay cuentas abiertas.</li>}
        </ul>
      )}

      {vista === 'config' && puedeConfigurar && (
        <ConfigMesas areas={areas} sucursalId={sucursalId} api={api} onCambio={cargar} onError={setError} />
      )}

      {mesaActual && (
        <PanelCuenta
          key={mesaActual.id + (cuentaDeMesa(cuentas, mesaActual.id)?.id ?? '')}
          mesa={mesaActual}
          cuenta={cuentaDeMesa(cuentas, mesaActual.id)}
          productos={productos}
          politicas={politicas}
          api={api}
          sucursalId={sucursalId}
          usuario={usuario}
          onCambio={cargar}
          onCerrar={() => setMesaSel(null)}
        />
      )}
    </div>
  );
}
