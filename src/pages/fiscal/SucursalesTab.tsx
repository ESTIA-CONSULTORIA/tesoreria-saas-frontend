import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../core/api/api';
import type { Atajo } from '../../core/components/reglasTeclado';
import { esCodigoPostal, mensajeErrorApi, soloDigitos } from './fiscalLogic';
import { Aviso, Estado, inp, Leyenda, useAtajos } from './ui';

interface Fila {
  branchId: string;
  sucursal: string;
  companyId: string;
  empresa: string;
  codigoPostalExpedicion: string | null;
  completo: boolean;
}
const POR_PAGINA = 15;

export default function SucursalesTab({ alGuardar }: { alGuardar: () => void }) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cursor, setCursor] = useState(0);
  const [editando, setEditando] = useState<string | null>(null); // texto del CP en edición
  const [copiar, setCopiar] = useState<{ cp: string; destinos: Fila[] } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const tabla = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await api.get<Fila[]>('/facturacion/sucursales');
      setFilas(r.data);
    } catch (e) {
      setMsg({ ok: false, texto: mensajeErrorApi(e, 'No se pudieron cargar las sucursales.') });
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const pagina = Math.floor(cursor / POR_PAGINA);
  const visibles = filas.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);
  const actual = filas[cursor];

  useEffect(() => {
    if (editando === null) tabla.current?.focus();
    else campo.current?.select();
  }, [editando, cargando]);

  const iniciarEdicion = () => actual && setEditando(actual.codigoPostalExpedicion ?? '');

  const confirmarEdicion = async () => {
    if (editando === null || !actual) return;
    if (!esCodigoPostal(editando)) return setMsg({ ok: false, texto: 'El código postal debe ser de 5 dígitos.' });
    try {
      await api.put(`/facturacion/sucursal/${actual.branchId}`, { codigoPostalExpedicion: editando });
      const nuevas = filas.map((f) => (f.branchId === actual.branchId ? { ...f, codigoPostalExpedicion: editando, completo: true } : f));
      setFilas(nuevas);
      setEditando(null);
      setMsg({ ok: true, texto: `Código postal de «${actual.sucursal}» guardado.` });
      // Pasa a la siguiente sucursal sin código postal.
      const sig = nuevas.findIndex((f, i) => i > cursor && !f.completo);
      if (sig >= 0) setCursor(sig);
      alGuardar();
    } catch (e) {
      setMsg({ ok: false, texto: mensajeErrorApi(e, 'No se pudo guardar.') });
    }
  };

  const prepararCopia = () => {
    const cp = actual?.codigoPostalExpedicion;
    if (!actual || !cp) return setMsg({ ok: false, texto: 'Elige una sucursal que ya tenga código postal para copiarlo.' });
    const destinos = filas.filter((f) => f.companyId === actual.companyId && !f.completo);
    if (!destinos.length) return setMsg({ ok: false, texto: `Todas las sucursales de «${actual.empresa}» ya tienen código postal.` });
    setCopiar({ cp, destinos });
  };

  const aplicarCopia = async () => {
    if (!copiar) return;
    try {
      for (const d of copiar.destinos) await api.put(`/facturacion/sucursal/${d.branchId}`, { codigoPostalExpedicion: copiar.cp });
      setMsg({ ok: true, texto: `Se copió ${copiar.cp} a ${copiar.destinos.length} sucursal${copiar.destinos.length === 1 ? '' : 'es'}.` });
      setCopiar(null);
      await cargar();
      alGuardar();
    } catch (e) {
      setCopiar(null);
      setMsg({ ok: false, texto: mensajeErrorApi(e, 'No se pudo copiar a todas.') });
      await cargar();
    }
  };

  const atajos: Atajo[] = [
    { tecla: 'F2', etiqueta: 'Editar CP', accion: iniciarEdicion, deshabilitado: !actual || editando !== null },
    { tecla: 'F5', etiqueta: 'Copiar a todas', accion: prepararCopia, deshabilitado: !actual || editando !== null },
    { tecla: 'Escape', etiqueta: 'Cancelar', accion: () => (copiar ? setCopiar(null) : setEditando(null)), deshabilitado: editando === null && !copiar },
  ];
  useAtajos(atajos);

  const teclaTabla = (e: React.KeyboardEvent) => {
    if (editando !== null) return;
    if (copiar) {
      if (e.key === 'Enter') {
        e.preventDefault();
        void aplicarCopia();
      }
      return;
    }
    if (e.key === 'ArrowDown') (e.preventDefault(), setCursor((c) => Math.min(filas.length - 1, c + 1)));
    else if (e.key === 'ArrowUp') (e.preventDefault(), setCursor((c) => Math.max(0, c - 1)));
    else if (e.key === 'PageDown') (e.preventDefault(), setCursor((c) => Math.min(filas.length - 1, c + POR_PAGINA)));
    else if (e.key === 'PageUp') (e.preventDefault(), setCursor((c) => Math.max(0, c - POR_PAGINA)));
    else if (e.key === 'Enter') (e.preventDefault(), iniciarEdicion());
  };

  if (cargando) return <p className="text-sm text-slate-400">Cargando sucursales…</p>;
  if (!filas.length) return <p className="text-sm text-slate-400">No hay sucursales activas. Crea una en Sucursales para capturar su código postal de expedición.</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-xs text-slate-400">Código postal del lugar donde se expiden las facturas de cada sucursal. Por ahora solo se valida el formato (5 dígitos).</p>
      <div ref={tabla} tabIndex={0} onKeyDown={teclaTabla} role="grid" aria-label="Sucursales y código postal de expedición" className="min-h-0 flex-1 rounded border border-slate-800 outline-none focus:border-blue-500">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-400">
            <tr className="h-8 border-b border-slate-800">
              <th className="px-3">Empresa</th>
              <th className="px-3">Sucursal</th>
              <th className="w-56 px-3">Código postal de expedición</th>
              <th className="w-32 px-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f, i) => {
              const idx = pagina * POR_PAGINA + i;
              const sel = idx === cursor;
              return (
                <tr key={f.branchId} role="row" aria-selected={sel} className={`h-[30px] cursor-pointer border-b border-slate-900 ${sel ? 'bg-blue-900/40' : 'hover:bg-slate-800/50'}`} onClick={() => setCursor(idx)}>
                  <td className="px-3">{f.empresa}</td>
                  <td className="px-3">{f.sucursal}</td>
                  <td className="px-3">
                    {sel && editando !== null ? (
                      <input
                        ref={campo}
                        aria-label={`Código postal de ${f.sucursal}`}
                        className={`${inp} w-28 font-mono`}
                        inputMode="numeric"
                        value={editando}
                        onChange={(e) => setEditando(soloDigitos(e.target.value, 5))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.preventDefault(), void confirmarEdicion());
                        }}
                      />
                    ) : (
                      (f.codigoPostalExpedicion ?? '—')
                    )}
                  </td>
                  <td className="px-3">
                    <Estado completo={f.completo} textoNo="Falta CP" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex min-h-[28px] items-center justify-between gap-3 text-xs text-slate-400">
        <div className="min-w-0 flex-1">
          {copiar ? (
            <Aviso ok texto={`Copiar ${copiar.cp} a ${copiar.destinos.length} sucursal${copiar.destinos.length === 1 ? '' : 'es'} de «${actual?.empresa}» sin código postal: Enter confirma, Esc cancela.`} />
          ) : msg ? (
            <Aviso ok={msg.ok} texto={msg.texto} />
          ) : null}
        </div>
        <span>{`Sucursal ${cursor + 1} de ${filas.length}`}</span>
      </div>
      <Leyenda atajos={atajos} extra={['↑↓ Moverse', 'Enter Editar / confirmar']} />
    </div>
  );
}
