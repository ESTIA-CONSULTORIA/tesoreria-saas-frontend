import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../core/api/api';
import { InputBusqueda } from '../../core/components/InputBusqueda';
import { ModalPOS } from '../../core/components/ModalPOS';
import type { Atajo } from '../../core/components/reglasTeclado';
import {
  FORM_PRODUCTO_VACIO, formDeSugerencia, MENSAJE_CLAVE_CONTADOR, mensajeErrorApi, paginaAnterior, paginaSiguiente, soloDigitos, textoIva, textoObjetoImp, textoPagina,
  UNIDADES_COMUNES, validarFormProducto, type FormProducto, type SugerenciaCategoria,
} from './fiscalLogic';
import { Aviso, btn, Estado, etiqueta, inp, Leyenda, useAtajos } from './ui';

interface Item {
  productId: string;
  producto: string;
  categoria: string;
  tasaIva: string | null;
  esServicio: boolean;
  claveProdServ: string | null;
  claveUnidad: string | null;
  unidadNombre: string | null;
  objetoImp: string | null;
  completo: boolean;
}
interface Pagina {
  page: number;
  paginas: number;
  total: number;
  items: Item[];
}
interface Sugerencias {
  giroNombre: string;
  nota: string;
  categorias: SugerenciaCategoria[];
}
type Plantilla = Pick<FormProducto, 'claveUnidad' | 'unidadNombre' | 'objetoImp'>;
const SIN_CATEGORIA = 'SIN_CATEGORIA';
const IDB = 'fiscal-prod-q';

/** Lo que se propone para un producto sin claves: unidad por tipo y objeto de impuesto 02; NUNCA la clave de producto/servicio. */
function propuesta(i: Item, plantilla: Plantilla | null): FormProducto {
  if (plantilla) return { claveProdServ: '', ...plantilla };
  return { claveProdServ: '', claveUnidad: i.esServicio ? 'E48' : 'H87', unidadNombre: i.esServicio ? 'Servicio' : 'Pieza', objetoImp: '02' };
}
const deItem = (i: Item, plantilla: Plantilla | null): FormProducto =>
  i.completo ? { claveProdServ: i.claveProdServ ?? '', claveUnidad: i.claveUnidad ?? '', unidadNombre: i.unidadNombre ?? '', objetoImp: i.objetoImp ?? '' } : propuesta(i, plantilla);

export default function ProductosTab({ objetos, alGuardar }: { objetos: Record<string, string>; alGuardar: () => void }) {
  const [q, setQ] = useState('');
  const [qAplicada, setQAplicada] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estado, setEstado] = useState('PENDIENTES');
  const [page, setPage] = useState(1);
  const [datos, setDatos] = useState<Pagina>({ page: 1, paginas: 1, total: 0, items: [] });
  const [cargando, setCargando] = useState(true);
  const [cursor, setCursor] = useState(0);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<FormProducto>(FORM_PRODUCTO_VACIO);
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null);
  const [sug, setSug] = useState<Sugerencias | null>(null);
  const [verSug, setVerSug] = useState(false);
  const [filaSug, setFilaSug] = useState(0);
  const [loteConfirmar, setLoteConfirmar] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const tabla = useRef<HTMLDivElement>(null);
  const actual: Item | undefined = datos.items[cursor];

  // La búsqueda espera 250 ms después de dejar de escribir.
  useEffect(() => {
    const t = setTimeout(() => (setQAplicada(q), setPage(1)), 250);
    return () => clearTimeout(t);
  }, [q]);

  const cargar = useCallback(async () => {
    try {
      const r = await api.get<Pagina>('/facturacion/productos', { params: { q: qAplicada || undefined, categoria: categoria || undefined, estado, page } });
      setDatos(r.data);
      setCursor((c) => Math.min(c, Math.max(0, r.data.items.length - 1)));
    } catch (e) {
      setMsg({ ok: false, texto: mensajeErrorApi(e, 'No se pudieron cargar los productos.') });
    } finally {
      setCargando(false);
    }
  }, [qAplicada, categoria, estado, page]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cargarSugerencias = useCallback(async () => {
    try {
      const r = await api.get<Sugerencias>('/facturacion/sugerencias');
      setSug(r.data);
      return r.data;
    } catch (e) {
      setMsg({ ok: false, texto: mensajeErrorApi(e, 'No se pudieron cargar las sugerencias.') });
      return null;
    }
  }, []);
  useEffect(() => {
    void cargarSugerencias();
  }, [cargarSugerencias]);

  // El formulario sigue al producto bajo el cursor.
  const idActual = actual?.productId;
  useEffect(() => {
    if (actual) setForm(deItem(actual, plantilla));
    else setForm(FORM_PRODUCTO_VACIO);
    setLoteConfirmar(false);
    // Solo al cambiar de producto o recargar sus datos, no con cada tecla del formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idActual, actual?.claveProdServ, actual?.claveUnidad, actual?.objetoImp, plantilla]);

  useEffect(() => {
    if (!cargando && !verSug) tabla.current?.focus();
  }, [cargando, verSug]);

  const errores = validarFormProducto(form);

  const guardarUno = useCallback(async () => {
    if (!actual) return;
    if (errores.length) return setMsg({ ok: false, texto: errores[0] });
    try {
      await api.put(`/facturacion/producto/${actual.productId}`, {
        claveProdServ: form.claveProdServ.trim(),
        claveUnidad: form.claveUnidad.trim().toUpperCase(),
        unidadNombre: form.unidadNombre.trim() || null,
        objetoImp: form.objetoImp,
      });
      setPlantilla({ claveUnidad: form.claveUnidad.trim().toUpperCase(), unidadNombre: form.unidadNombre.trim(), objetoImp: form.objetoImp });
      setMsg({ ok: true, texto: `«${actual.producto}» guardado.` });
      // En "Pendientes" el producto sale de la lista y el cursor queda en el siguiente; en las demás vistas se avanza una fila.
      if (estado !== 'PENDIENTES') setCursor((c) => Math.min(datos.items.length - 1, c + 1));
      await cargar();
      void cargarSugerencias();
      alGuardar();
      tabla.current?.focus();
    } catch (e) {
      setMsg({ ok: false, texto: mensajeErrorApi(e, 'No se pudo guardar.') });
    }
  }, [actual, errores, form, estado, datos.items.length, cargar, cargarSugerencias, alGuardar]);

  const pedirLote = () => {
    if (!marcados.size) return setMsg({ ok: false, texto: 'Marca productos con la barra espaciadora (o Ctrl+A para toda la página).' });
    if (errores.length) return setMsg({ ok: false, texto: errores[0] });
    setLoteConfirmar(true);
  };
  const aplicarLote = async () => {
    try {
      const r = await api.put<{ cambiados: number }>('/facturacion/productos/lote', {
        productIds: Array.from(marcados),
        claveProdServ: form.claveProdServ.trim(),
        claveUnidad: form.claveUnidad.trim().toUpperCase(),
        unidadNombre: form.unidadNombre.trim() || null,
        objetoImp: form.objetoImp,
      });
      setMsg({ ok: true, texto: `Se actualizaron ${r.data.cambiados} producto${r.data.cambiados === 1 ? '' : 's'}.` });
      setMarcados(new Set());
      setLoteConfirmar(false);
      await cargar();
      void cargarSugerencias();
      alGuardar();
    } catch (e) {
      setLoteConfirmar(false);
      setMsg({ ok: false, texto: mensajeErrorApi(e, 'No se pudo aplicar al lote.') });
    }
  };

  const abrirSugerencias = async () => {
    const s = sug ?? (await cargarSugerencias());
    if (!s) return;
    if (!s.categorias.length) return setMsg({ ok: true, texto: 'No hay productos pendientes: no hay nada que sugerir.' });
    setFilaSug(0);
    setVerSug(true);
  };
  const aceptarSugerencia = (s: SugerenciaCategoria) => {
    const f = formDeSugerencia(s);
    setPlantilla({ claveUnidad: f.claveUnidad, unidadNombre: f.unidadNombre, objetoImp: f.objetoImp });
    setCategoria(s.categoriaId ?? SIN_CATEGORIA);
    setEstado('PENDIENTES');
    setPage(1);
    setCursor(0);
    setVerSug(false);
    setMsg({ ok: true, texto: `Unidad y objeto de impuesto sugeridos para «${s.categoria}». La clave de producto/servicio la entrega tu contador.` });
  };

  const atajos: Atajo[] = [
    { tecla: 'F3', etiqueta: 'Buscar', accion: () => document.getElementById(IDB)?.focus() },
    { tecla: 'F4', etiqueta: 'Guardar y seguir', accion: guardarUno, deshabilitado: !actual },
    { tecla: 'F6', etiqueta: 'Sugerir por giro', accion: abrirSugerencias },
    { tecla: 'F7', etiqueta: 'Aplicar a marcadas', accion: pedirLote, deshabilitado: !marcados.size },
    { tecla: 'Escape', etiqueta: 'Volver a la lista', accion: () => (loteConfirmar ? setLoteConfirmar(false) : tabla.current?.focus()) },
  ];
  useAtajos(atajos, !verSug);

  const teclaTabla = (e: React.KeyboardEvent) => {
    const n = datos.items.length;
    if (e.key === 'ArrowDown') (e.preventDefault(), setCursor((c) => Math.min(n - 1, c + 1)));
    else if (e.key === 'ArrowUp') (e.preventDefault(), setCursor((c) => Math.max(0, c - 1)));
    else if (e.key === 'PageDown') (e.preventDefault(), setPage((p) => paginaSiguiente(p, datos.paginas)), setCursor(0));
    else if (e.key === 'PageUp') (e.preventDefault(), setPage((p) => paginaAnterior(p)), setCursor(0));
    else if (e.key === ' ' && actual) {
      e.preventDefault();
      setMarcados((m) => {
        const s = new Set(m);
        if (s.has(actual.productId)) s.delete(actual.productId);
        else s.add(actual.productId);
        return s;
      });
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setMarcados((m) => new Set([...m, ...datos.items.map((i) => i.productId)]));
    } else if (e.key === 'Enter' && actual) {
      e.preventDefault();
      document.getElementById('fiscal-prod-clave')?.focus();
    } else if (e.key === '/') (e.preventDefault(), document.getElementById(IDB)?.focus());
  };

  const categoriasFiltro = [{ id: SIN_CATEGORIA, nombre: 'Sin categoría' }, ...(sug?.categorias.filter((c) => c.categoriaId).map((c) => ({ id: c.categoriaId as string, nombre: c.categoria })) ?? [])];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-end gap-3">
        <div>
          <label htmlFor="fiscal-prod-q" className={etiqueta}>Buscar producto</label>
          <InputBusqueda
            id="fiscal-prod-q"
            name="fiscal-productos-q"
            placeholder="Nombre del producto  ( / o F3 )"
            className={`${inp} w-64`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => (e.key === 'ArrowDown' || e.key === 'Enter') && (e.preventDefault(), tabla.current?.focus())}
          />
        </div>
        <div>
          <label htmlFor="fiscal-prod-cat" className={etiqueta}>Categoría</label>
          <select id="fiscal-prod-cat" className={`${inp} w-44`} value={categoria} onChange={(e) => (setCategoria(e.target.value), setPage(1), setCursor(0))}>
            <option value="">Todas</option>
            {categoriasFiltro.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
          </select>
        </div>
        <div>
          <label htmlFor="fiscal-prod-estado" className={etiqueta}>Mostrar</label>
          <select id="fiscal-prod-estado" className={`${inp} w-36`} value={estado} onChange={(e) => (setEstado(e.target.value), setPage(1), setCursor(0))}>
            <option value="PENDIENTES">Pendientes</option>
            <option value="TODOS">Todos</option>
            <option value="COMPLETOS">Completos</option>
          </select>
        </div>
        <span className="pb-1 text-xs text-slate-400">{marcados.size ? `${marcados.size} marcado${marcados.size === 1 ? '' : 's'}` : ''}</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
        <div ref={tabla} tabIndex={0} onKeyDown={teclaTabla} role="grid" aria-label="Productos y sus claves SAT" className="col-span-8 min-h-0 overflow-hidden rounded border border-slate-800 outline-none focus:border-blue-500">
          <table className="w-full table-fixed text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr className="h-8 border-b border-slate-800">
                <th className="w-6 px-1"><span className="sr-only">Marcado</span></th>
                <th className="w-[27%] px-2">Producto</th>
                <th className="w-[17%] px-2">Categoría</th>
                <th className="w-[10%] px-2">IVA</th>
                <th className="w-[15%] px-2">Clave SAT</th>
                <th className="w-[13%] px-2">Unidad</th>
                <th className="px-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {datos.items.map((i, idx) => (
                <tr key={i.productId} role="row" aria-selected={idx === cursor} onClick={() => setCursor(idx)}
                  className={`h-[30px] cursor-pointer border-b border-slate-900 ${idx === cursor ? 'bg-blue-900/40' : 'hover:bg-slate-800/50'}`}>
                  <td className="px-1 text-center" aria-label={marcados.has(i.productId) ? 'Marcado' : 'Sin marcar'}>{marcados.has(i.productId) ? '☑' : '☐'}</td>
                  <td className="truncate px-2" title={i.producto}>{i.producto}</td>
                  <td className="truncate px-2 text-slate-300">{i.categoria}</td>
                  <td className="px-2 text-slate-300">{textoIva(i.tasaIva)}</td>
                  <td className="px-2 font-mono">{i.claveProdServ ?? '—'}</td>
                  <td className="truncate px-2">{i.claveUnidad ? `${i.claveUnidad}${i.unidadNombre ? ` ${i.unidadNombre}` : ''}` : '—'}</td>
                  <td className="px-2 text-xs"><Estado completo={i.completo} textoNo="Falta" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cargando && !datos.items.length ? (
            <p className="p-3 text-sm text-slate-400">{estado === 'PENDIENTES' ? 'No hay productos pendientes con estos filtros.' : 'No hay productos con estos filtros.'}</p>
          ) : null}
        </div>

        <form className="col-span-4 flex min-h-0 flex-col gap-1 rounded border border-slate-800 p-2" aria-label="Claves SAT del producto" onSubmit={(e) => (e.preventDefault(), void guardarUno())}>
          <h2 className="truncate text-sm font-semibold" title={actual?.producto}>{actual ? actual.producto : 'Sin producto seleccionado'}</h2>
          <p className="text-xs text-slate-400">{actual ? `IVA: ${textoIva(actual.tasaIva)} · ${actual.categoria}` : ''}</p>
          <div>
            <label htmlFor="fiscal-prod-clave" className={etiqueta}>Clave de producto/servicio (8 dígitos)</label>
            <input id="fiscal-prod-clave" className={`${inp} font-mono`} inputMode="numeric" disabled={!actual} value={form.claveProdServ} aria-describedby="fiscal-prod-clave-ayuda"
              onChange={(e) => setForm({ ...form, claveProdServ: soloDigitos(e.target.value, 8) })} />
            <p id="fiscal-prod-clave-ayuda" className="mt-0.5 text-xs text-amber-300/80">{MENSAJE_CLAVE_CONTADOR}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="fiscal-prod-unidad" className={etiqueta}>Unidad</label>
              <input id="fiscal-prod-unidad" list="fiscal-unidades" className={`${inp} font-mono uppercase`} maxLength={3} disabled={!actual} value={form.claveUnidad}
                onChange={(e) => {
                  const clave = e.target.value.toUpperCase();
                  const comun = UNIDADES_COMUNES.find((u) => u.clave === clave);
                  setForm({ ...form, claveUnidad: clave, unidadNombre: comun ? comun.nombre : form.unidadNombre });
                }} />
              <datalist id="fiscal-unidades">
                {UNIDADES_COMUNES.map((u) => (<option key={u.clave} value={u.clave}>{u.nombre}</option>))}
              </datalist>
            </div>
            <div className="col-span-2">
              <label htmlFor="fiscal-prod-unidad-nombre" className={etiqueta}>Nombre de la unidad</label>
              <input id="fiscal-prod-unidad-nombre" className={inp} maxLength={40} disabled={!actual} value={form.unidadNombre} onChange={(e) => setForm({ ...form, unidadNombre: e.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="fiscal-prod-objeto" className={etiqueta}>Objeto de impuesto</label>
            <select id="fiscal-prod-objeto" className={inp} disabled={!actual} value={form.objetoImp} onChange={(e) => setForm({ ...form, objetoImp: e.target.value })}>
              <option value="">Elige…</option>
              {Object.keys(objetos).map((c) => (<option key={c} value={c}>{textoObjetoImp(objetos, c)}</option>))}
            </select>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            <button type="submit" className={`${btn} bg-blue-600 hover:bg-blue-500 disabled:opacity-40`} disabled={!actual}>Guardar y seguir</button>
            <button type="button" className={`${btn} bg-slate-700 hover:bg-slate-600 disabled:opacity-40`} disabled={!marcados.size} onClick={pedirLote}>Aplicar a marcadas</button>
          </div>
        </form>
      </div>

      <div className="flex min-h-[28px] items-center justify-between gap-3 text-xs text-slate-400">
        <div className="min-w-0 flex-1">
          {loteConfirmar ? (
            <div className="flex items-center gap-2">
              <Aviso ok texto={`Se cambiarán ${marcados.size} producto${marcados.size === 1 ? '' : 's'} con la clave ${form.claveProdServ} y unidad ${form.claveUnidad}.`} />
              <button type="button" data-autofocus ref={(el) => el?.focus()} className={`${btn} bg-emerald-700 hover:bg-emerald-600`} onClick={() => void aplicarLote()}>Confirmar</button>
              <button type="button" className={`${btn} bg-slate-700`} onClick={() => setLoteConfirmar(false)}>Cancelar</button>
            </div>
          ) : msg ? (
            <Aviso ok={msg.ok} texto={msg.texto} />
          ) : null}
        </div>
        <span>{textoPagina(datos.page, datos.paginas, datos.total)}</span>
      </div>
      <Leyenda atajos={atajos} extra={['↑↓ Moverse', 'Espacio Marcar', 'Ctrl+A Marcar página', 'Enter Editar', 'AvPág/RePág Página']} />

      {verSug && sug ? (
        <ModalPOS
          title={`Sugerencias para ${sug.giroNombre}`}
          subtitle="Unidad y objeto de impuesto por categoría. Nada se guarda hasta que captures la clave de cada producto."
          size="md"
          onClose={() => setVerSug(false)}
          etiquetaEnter="Usar esta sugerencia"
          footer={
            <>
              <button type="button" className={`${btn} bg-slate-700`} onClick={() => setVerSug(false)}>Cerrar</button>
              <button type="button" data-primary className={`${btn} bg-blue-600`} onClick={() => aceptarSugerencia(sug.categorias[filaSug])}>Usar esta sugerencia</button>
            </>
          }
        >
          <p className="mb-2 text-xs text-amber-300/80">{sug.nota}</p>
          <div tabIndex={0} data-autofocus role="listbox" aria-label="Categorías con productos pendientes" className="outline-none"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') (e.preventDefault(), setFilaSug((f) => Math.min(sug.categorias.length - 1, f + 1)));
              else if (e.key === 'ArrowUp') (e.preventDefault(), setFilaSug((f) => Math.max(0, f - 1)));
              else if (e.key === 'Enter') (e.preventDefault(), aceptarSugerencia(sug.categorias[filaSug]));
            }}>
            {sug.categorias.map((c, i) => (
              <div key={c.categoriaId ?? 'sin'} role="option" aria-selected={i === filaSug} onClick={() => setFilaSug(i)}
                className={`flex items-center justify-between rounded px-3 py-1 text-sm ${i === filaSug ? 'bg-blue-900/50' : ''}`}>
                <span>{c.categoria} <span className="text-xs text-slate-400">· {c.productosPendientes} pendiente{c.productosPendientes === 1 ? '' : 's'}</span></span>
                <span className="font-mono text-xs text-slate-300">{c.claveUnidad} {c.unidadNombre} · {c.objetoImp}</span>
              </div>
            ))}
          </div>
        </ModalPOS>
      ) : null}
    </div>
  );
}
