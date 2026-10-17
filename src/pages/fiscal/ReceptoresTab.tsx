import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../core/api/api';
import { InputBusqueda } from '../../core/components/InputBusqueda';
import type { Atajo } from '../../core/components/reglasTeclado';
import {
  completarGenerico, FORM_RECEPTOR_VACIO, hayCambios, mensajeErrorApi, normalizarRfc, opcionesRegimen, soloDigitos, textoPagina, validarFormReceptor, validarRfc,
  type FormReceptor,
} from './fiscalLogic';
import { Aviso, btn, CampoRfc, Estado, etiqueta, inp, Leyenda, useAtajos } from './ui';

interface Receptor extends FormReceptor {
  id: string;
  regimenNombre: string | null;
  usoCfdiNombre: string | null;
  validadoSat: boolean;
  esExtranjero: boolean;
}
const POR_PAGINA = 15;
const IDB = 'fiscal-rec-q';
const deReceptor = (r: Receptor): FormReceptor => ({
  rfc: r.rfc, nombreFiscal: r.nombreFiscal, codigoPostal: r.codigoPostal, regimenFiscal: r.regimenFiscal, usoCfdiDefault: r.usoCfdiDefault ?? '', email: r.email ?? '',
});

export default function ReceptoresTab({ regimenes, usos, alGuardar }: { regimenes: Record<string, string>; usos: Record<string, string>; alGuardar: () => void }) {
  const [lista, setLista] = useState<Receptor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [cursor, setCursor] = useState(0);
  const [editandoId, setEditandoId] = useState<string | null>(null); // null = nuevo
  const [original, setOriginal] = useState<FormReceptor>(FORM_RECEPTOR_VACIO);
  const [form, setForm] = useState<FormReceptor>(FORM_RECEPTOR_VACIO);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const tabla = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await api.get<Receptor[]>('/facturacion/receptores');
      setLista(r.data);
    } catch (e) {
      setMsg({ ok: false, texto: mensajeErrorApi(e, 'No se pudieron cargar los receptores.') });
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? lista.filter((r) => r.nombreFiscal.toLowerCase().includes(t) || r.rfc.toLowerCase().includes(t)) : lista;
  }, [lista, q]);
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const abrir = (r: Receptor | null) => {
    const f = r ? deReceptor(r) : FORM_RECEPTOR_VACIO;
    setEditandoId(r?.id ?? null);
    setOriginal(f);
    setForm(f);
    setConfirmarBorrar(false);
    setMsg(null);
  };
  useEffect(() => {
    if (!cargando) tabla.current?.focus();
  }, [cargando]);

  const rfc = useMemo(() => validarRfc(form.rfc), [form.rfc]);
  const sinCambios = !hayCambios(form, original);
  const opcionesUso = Object.entries(usos);

  const guardar = useCallback(async () => {
    const errores = validarFormReceptor(form);
    if (errores.length) return setMsg({ ok: false, texto: errores[0] });
    const rfcN = normalizarRfc(form.rfc);
    const repetido = lista.find((r) => r.rfc === rfcN && r.codigoPostal === form.codigoPostal && r.id !== editandoId);
    if (repetido) return setMsg({ ok: false, texto: `Ya está registrado: ${repetido.nombreFiscal}. Búscalo en la lista para editarlo.` });
    const cuerpo = { ...form, rfc: rfcN, nombreFiscal: form.nombreFiscal.trim(), usoCfdiDefault: form.usoCfdiDefault || null, email: form.email.trim() || null };
    try {
      if (editandoId) await api.put(`/facturacion/receptores/${editandoId}`, cuerpo);
      else await api.post('/facturacion/receptores', cuerpo);
      setMsg({ ok: true, texto: editandoId ? 'Receptor actualizado.' : 'Receptor creado.' });
      abrir(null);
      await cargar();
      alGuardar();
    } catch (e) {
      setMsg({ ok: false, texto: mensajeErrorApi(e, 'No se pudo guardar.') });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, lista, editandoId, cargar, alGuardar]);

  const eliminar = async () => {
    if (!editandoId) return;
    try {
      await api.delete(`/facturacion/receptores/${editandoId}`);
      setMsg({ ok: true, texto: 'Receptor eliminado.' });
      abrir(null);
      await cargar();
      alGuardar();
    } catch (e) {
      setMsg({ ok: false, texto: mensajeErrorApi(e, 'No se pudo eliminar.') });
    }
  };

  const atajos: Atajo[] = [
    { tecla: 'F2', etiqueta: 'Nuevo', accion: () => (abrir(null), document.getElementById('fiscal-receptor-rfc')?.focus()) },
    { tecla: 'F4', etiqueta: 'Guardar', accion: guardar, deshabilitado: sinCambios },
    {
      tecla: 'Escape',
      etiqueta: 'Cancelar',
      accion: () => (confirmarBorrar ? setConfirmarBorrar(false) : (abrir(null), tabla.current?.focus())),
      deshabilitado: sinCambios && editandoId === null && !confirmarBorrar,
    },
  ];
  useAtajos(atajos);

  const teclaTabla = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') (e.preventDefault(), setCursor((c) => Math.min(visibles.length - 1, c + 1)));
    else if (e.key === 'ArrowUp') (e.preventDefault(), setCursor((c) => Math.max(0, c - 1)));
    else if (e.key === 'PageDown') (e.preventDefault(), setPagina((p) => Math.min(paginas, p + 1)), setCursor(0));
    else if (e.key === 'PageUp') (e.preventDefault(), setPagina((p) => Math.max(1, p - 1)), setCursor(0));
    else if (e.key === 'Enter' && visibles[cursor]) {
      e.preventDefault();
      abrir(visibles[cursor]);
      document.getElementById('fiscal-receptor-rfc')?.focus();
    } else if (e.key === 'Delete' && visibles[cursor]) {
      e.preventDefault();
      abrir(visibles[cursor]);
      setConfirmarBorrar(true);
    } else if (e.key === '/') (e.preventDefault(), document.getElementById(IDB)?.focus());
  };

  if (cargando) return <p className="text-sm text-slate-400">Cargando receptores…</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-3">
        <InputBusqueda
          id="fiscal-rec-q"
          name="fiscal-receptores-q"
          aria-label="Buscar receptor por nombre o RFC"
          placeholder="Buscar por nombre o RFC  ( / )"
          className={`${inp} w-72`}
          value={q}
          onChange={(e) => (setQ(e.target.value), setPagina(1), setCursor(0))}
          onKeyDown={(e) => e.key === 'ArrowDown' && (e.preventDefault(), tabla.current?.focus())}
        />
        <span className="text-xs text-slate-400">{filtrados.length ? `${filtrados.length} receptor${filtrados.length === 1 ? '' : 'es'}` : 'Sin receptores'}</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
        <div ref={tabla} tabIndex={0} onKeyDown={teclaTabla} role="grid" aria-label="Receptores fiscales" className="col-span-8 min-h-0 overflow-y-auto rounded border border-slate-800 outline-none focus:border-blue-500">
          <table className="w-full table-fixed text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr className="h-8 border-b border-slate-800">
                <th className="w-[26%] px-2">Nombre fiscal</th>
                <th className="w-[17%] px-2">RFC</th>
                <th className="w-[8%] px-2">CP</th>
                <th className="w-[27%] px-2">Régimen</th>
                <th className="w-[22%] px-2">SAT</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((r, i) => (
                <tr
                  key={r.id}
                  role="row"
                  aria-selected={i === cursor}
                  className={`h-[30px] cursor-pointer whitespace-nowrap border-b border-slate-900 ${i === cursor ? 'bg-blue-900/40' : 'hover:bg-slate-800/50'}`}
                  onClick={() => (setCursor(i), abrir(r))}
                >
                  <td className="truncate px-2">{r.nombreFiscal}</td>
                  <td className="truncate px-2 font-mono">{r.rfc}</td>
                  <td className="px-2 font-mono">{r.codigoPostal}</td>
                  <td className="truncate px-2" title={r.regimenNombre ?? ''}>{r.regimenNombre ?? r.regimenFiscal}</td>
                  <td className="px-2 text-xs">
                    <Estado completo={r.validadoSat} textoSi="Validado" textoNo="Sin validar con el SAT" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibles.length ? <p className="p-3 text-sm text-slate-400">Aún no hay receptores. Pulsa F2 para crear el primero.</p> : null}
        </div>

        <form
          className="col-span-4 flex min-h-0 flex-col gap-1 rounded border border-slate-800 p-2"
          onSubmit={(e) => (e.preventDefault(), void guardar())}
          aria-label={editandoId ? 'Editar receptor' : 'Nuevo receptor'}
        >
          <h2 className="text-sm font-semibold">{editandoId ? 'Editar receptor' : 'Nuevo receptor'}</h2>
          <CampoRfc id="fiscal-receptor-rfc" valor={form.rfc} onCambio={(v) => setForm(completarGenerico({ ...form, rfc: v }))} resultado={rfc} />
          <div>
            <label htmlFor="fiscal-receptor-nombre" className={etiqueta}>Nombre fiscal</label>
            <input id="fiscal-receptor-nombre" className={inp} maxLength={254} value={form.nombreFiscal} onChange={(e) => setForm({ ...form, nombreFiscal: e.target.value.toUpperCase() })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="fiscal-receptor-cp" className={etiqueta}>CP fiscal</label>
              <input id="fiscal-receptor-cp" className={`${inp} font-mono`} inputMode="numeric" value={form.codigoPostal} onChange={(e) => setForm({ ...form, codigoPostal: soloDigitos(e.target.value, 5) })} />
            </div>
            <div className="col-span-2">
              <label htmlFor="fiscal-receptor-uso" className={etiqueta}>Uso de CFDI</label>
              <select id="fiscal-receptor-uso" className={inp} value={form.usoCfdiDefault} onChange={(e) => setForm({ ...form, usoCfdiDefault: e.target.value })}>
                <option value="">Sin uso por defecto</option>
                {opcionesUso.map(([c, n]) => (<option key={c} value={c}>{`${c} · ${n}`}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="fiscal-receptor-regimen" className={etiqueta}>Régimen fiscal</label>
            <select id="fiscal-receptor-regimen" className={inp} value={form.regimenFiscal} onChange={(e) => setForm({ ...form, regimenFiscal: e.target.value })}>
              <option value="">Elige el régimen…</option>
              {opcionesRegimen(regimenes, rfc.tipo).map((o) => (<option key={o.codigo} value={o.codigo}>{o.texto}</option>))}
            </select>
          </div>
          <div>
            <label htmlFor="fiscal-receptor-email" className={etiqueta}>Correo para enviar la factura</label>
            <input id="fiscal-receptor-email" type="email" className={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="mt-auto flex items-center gap-2 pt-1">
            <button type="submit" className={`${btn} bg-blue-600 hover:bg-blue-500 disabled:opacity-40`} disabled={sinCambios}>Guardar</button>
            {editandoId && !confirmarBorrar ? <button type="button" className={`${btn} bg-slate-700 hover:bg-red-700`} onClick={() => setConfirmarBorrar(true)}>Eliminar</button> : null}
            {confirmarBorrar ? (
              <button type="button" data-autofocus className={`${btn} bg-red-700 hover:bg-red-600`} onClick={() => void eliminar()}>
                Confirmar: eliminar a «{form.nombreFiscal}»
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="flex min-h-[24px] items-center justify-between gap-3 text-xs text-slate-400">
        <div className="min-w-0 flex-1">{msg ? <Aviso ok={msg.ok} texto={msg.texto} /> : null}</div>
        <span>{textoPagina(pagina, paginas, filtrados.length, 'receptor', 'receptores')}</span>
      </div>
      <Leyenda atajos={atajos} extra={['↑↓ Moverse', 'Enter Editar', 'Supr Eliminar', 'AvPág/RePág Página']} />
    </div>
  );
}
