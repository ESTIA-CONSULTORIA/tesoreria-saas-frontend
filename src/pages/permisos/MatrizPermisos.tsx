import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../core/api/api';
import {
  ACCIONES, NOMBRE_ACCION, agrupar, cantidadCambios, conCambio, cuerpoGuardar, estaAlgoMarcado, estaTodoMarcado, moduloCompleto, valorActual,
  type Accion, type Celda, type ModuloInfo, type Valores,
} from './matrizLogic';

interface Respuesta {
  modulos: ModuloInfo[];
  roles: Array<{ code: string; name: string }>;
  celdas: Record<string, Record<string, Celda>>;
  protegidos: { rol: string; modulos: string[] };
}

interface Props { rolCode: string; rolNombre: string; descripcion?: string }

const mensajeDe = (e: any, porDefecto: string): string => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(' ') : m || porDefecto;
};

// Matriz de permisos DEL NEGOCIO para un rol: lo que se marca aquí manda en el servidor (guard global). Agrupada por tema, con nombres
// de módulo (no códigos), «módulo completo», indicador de lo que cambió antes de guardar y «Restaurar valores del rol». Teclado primero:
// todo son casillas y botones nativos, en orden; sin scroll horizontal (dos columnas cuando hay ancho).
export default function MatrizPermisos({ rolCode, rolNombre, descripcion }: Props) {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [borrador, setBorrador] = useState<Record<string, Partial<Valores>>>({});
  const [confirmaRestaurar, setConfirmaRestaurar] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const r = await api.get('/permisos');
      setDatos(r.data);
    } catch (e: any) {
      const m = mensajeDe(e, 'No se pudo cargar la matriz de permisos.');
      setError(/Indica el negocio/i.test(m) ? 'Elige un negocio en la barra superior para ver y cambiar sus permisos.' : m);
      setDatos(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { setBorrador({}); setAviso(''); setConfirmaRestaurar(false); }, [rolCode]);

  const celdas = datos?.celdas?.[rolCode];
  const grupos = useMemo(() => agrupar(datos?.modulos ?? []), [datos]);
  const columnas = useMemo(() => {
    const cols: Array<typeof grupos> = [[], []];
    const filas = [0, 0];
    for (const g of grupos) { const i = filas[0] <= filas[1] ? 0 : 1; cols[i].push(g); filas[i] += g.modulos.length + 1; }
    return cols;
  }, [grupos]);
  const pendientes = cantidadCambios(borrador);
  const protegido = (modulo: string) => datos?.protegidos?.rol === rolCode && datos.protegidos.modulos.includes(modulo);

  function cambiar(modulo: string, accion: Accion, valor: boolean) {
    if (!celdas) return;
    setAviso('');
    setBorrador((b) => ({ ...b, [modulo]: conCambio(celdas[modulo], b[modulo], accion, valor) }));
  }
  function completo(modulo: string, marcar: boolean) {
    if (!celdas) return;
    setAviso('');
    setBorrador((b) => ({ ...b, [modulo]: moduloCompleto(celdas[modulo], b[modulo], marcar) }));
  }

  async function guardar() {
    if (!celdas || pendientes === 0) return;
    setGuardando(true);
    setError('');
    try {
      const r = await api.put(`/permisos/${encodeURIComponent(rolCode)}`, { cambios: cuerpoGuardar(celdas, borrador) });
      setDatos(r.data);
      setBorrador({});
      setAviso('Permisos guardados. Ya aplican a este rol en tu negocio.');
    } catch (e: any) {
      setError(mensajeDe(e, 'No se pudieron guardar los permisos.'));
    } finally {
      setGuardando(false);
    }
  }

  async function restaurar() {
    setGuardando(true);
    setError('');
    try {
      const r = await api.post(`/permisos/${encodeURIComponent(rolCode)}/restaurar`);
      setDatos(r.data);
      setBorrador({});
      setConfirmaRestaurar(false);
      setAviso(`Se restauraron los valores originales del rol ${rolNombre}.`);
    } catch (e: any) {
      setError(mensajeDe(e, 'No se pudieron restaurar los permisos.'));
    } finally {
      setGuardando(false);
    }
  }

  const hayPersonalizados = !!celdas && Object.values(celdas).some((c) => c.modificado);

  if (cargando) return <div role="status" className="p-5 text-sm !text-content-2">Cargando permisos…</div>;
  if (error && !datos) {
    return (
      <div role="alert" className="p-5 text-sm !text-content-1">
        <p className="mb-3">{error}</p>
        <button onClick={() => void cargar()} className="rounded-lg border !border-line px-3 py-2 text-sm font-medium !text-content-1">Reintentar</button>
      </div>
    );
  }
  if (!celdas) return <div role="status" className="p-5 text-sm !text-content-2">Este rol no tiene permisos configurables en tu negocio.</div>;

  const boton = 'rounded-lg border !border-line px-3 py-1.5 text-sm font-medium !text-content-1 disabled:opacity-50';

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-1">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b !border-line px-5 py-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold !text-content-1">{rolNombre}</h3>
          <p className="text-sm !text-content-2">{descripcion ? `${descripcion} · ` : ''}Lo que marques aquí aplica de inmediato en tu negocio.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span aria-live="polite" className="text-sm font-medium !text-content-1">
            {pendientes > 0 ? `${pendientes} módulo${pendientes === 1 ? '' : 's'} con cambios sin guardar` : 'Sin cambios pendientes'}
          </span>
          <button onClick={() => void guardar()} disabled={pendientes === 0 || guardando} className={`${boton} !bg-btn !text-on-solid`}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
          <button onClick={() => { setBorrador({}); setAviso(''); }} disabled={pendientes === 0 || guardando} className={boton}>Descartar</button>
          {!confirmaRestaurar ? (
            <button onClick={() => setConfirmaRestaurar(true)} disabled={!hayPersonalizados || guardando} className={boton}>Restaurar valores del rol</button>
          ) : (
            <span role="group" aria-label="Confirmar restaurar" className="flex items-center gap-2 text-sm !text-content-1">
              ¿Restaurar los valores originales de {rolNombre}?
              <button onClick={() => void restaurar()} disabled={guardando} className={boton}>Sí, restaurar</button>
              <button onClick={() => setConfirmaRestaurar(false)} className={boton}>No</button>
            </span>
          )}
        </div>
      </div>

      {(error || aviso) && (
        <p role={error ? 'alert' : 'status'} className="px-5 py-2 text-sm font-medium !text-content-1">{error || aviso}</p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-x-7 overflow-y-auto px-5 py-3">
        {columnas.map((col, ci) => (
        <div key={ci} className="min-w-0">
        {col.map((g) => (
          <section key={g.titulo} aria-label={g.titulo} className="mb-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide !text-content-2">{g.titulo}</h4>
            <div role="table" aria-label={`Permisos de ${rolNombre}: ${g.titulo}`}>
              <div role="row" className="grid items-center border-b !border-line py-1 text-xs font-semibold !text-content-2" style={{ gridTemplateColumns: 'minmax(0,1fr) repeat(4, 52px) 64px' }}>
                <span role="columnheader">Módulo</span>
                {ACCIONES.map((a) => <span role="columnheader" key={a} className="text-center">{NOMBRE_ACCION[a]}</span>)}
                <span role="columnheader" className="text-center">Todo</span>
              </div>
              {g.modulos.map((m) => {
                const celda = celdas[m.codigo];
                if (!celda) return null;
                const v = valorActual(celda, borrador[m.codigo]);
                const cambio = Object.keys(borrador[m.codigo] ?? {}).length > 0;
                const todo = estaTodoMarcado(celda, v);
                const algo = estaAlgoMarcado(v);
                const bloqueado = protegido(m.codigo);
                return (
                  <div role="row" key={m.codigo} className="grid items-center border-b !border-line py-1" style={{ gridTemplateColumns: 'minmax(0,1fr) repeat(4, 52px) 64px' }}>
                    <div role="cell" className="min-w-0 pr-2">
                      <span className="block truncate text-sm font-medium !text-content-1" title={m.descripcion}>{m.nombre}</span>
                      {(cambio || celda.modificado || bloqueado) && (
                        <span className="block text-xs !text-content-2">{cambio ? '● Cambió, sin guardar' : celda.modificado ? '● Personalizado' : 'Protegido'}</span>
                      )}
                    </div>
                    {ACCIONES.map((a) => {
                      const disponible = celda.defecto[a];
                      const obligatorio = bloqueado && (a === 'ver' || a === 'editar') && disponible;
                      return (
                        <div role="cell" key={a} className="flex justify-center">
                          <input
                            type="checkbox"
                            aria-label={`${m.nombre}: ${NOMBRE_ACCION[a]}`}
                            title={!disponible ? 'No disponible para este rol' : obligatorio ? 'Este acceso no se puede quitar al Administrador' : undefined}
                            checked={v[a]}
                            disabled={!disponible || obligatorio || guardando}
                            onChange={(e) => cambiar(m.codigo, a, e.target.checked)}
                            className="h-4 w-4"
                          />
                        </div>
                      );
                    })}
                    <div role="cell" className="flex justify-center">
                      <input
                        type="checkbox"
                        aria-label={`${m.nombre}: módulo completo`}
                        title="Marcar o desmarcar todo el módulo"
                        checked={todo}
                        ref={(el) => { if (el) el.indeterminate = algo && !todo; }}
                        disabled={bloqueado || guardando || !ACCIONES.some((a) => celda.defecto[a])}
                        onChange={(e) => completo(m.codigo, e.target.checked)}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        </div>
        ))}
      </div>
    </div>
  );
}
