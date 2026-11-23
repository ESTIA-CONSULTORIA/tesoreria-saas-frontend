import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../core/api/api';
import MainLayout from '../../core/layout/MainLayout';
import { Modal } from '../../core/components/Modal';
import {
  ETIQUETA_CICLO, etiquetaEstado, etiquetaPlan, fechaCorta, mensajeConversion, puedeConvertir, textoVigencia, validarConversion,
  type Ciclo, type FilaPrueba,
} from './pruebasSoporteLogic';

// /soporte/pruebas — solo SOPORTE. Lista las pruebas públicas (sin correo completo ni datos personales) y convierte una a plan de pago.
// Cambiar el plan afecta la facturación del cliente: siempre pide confirmación en un diálogo con el resumen antes de enviar.
type Estado = { tipo: 'cargando' } | { tipo: 'error'; mensaje: string } | { tipo: 'listo'; pruebas: FilaPrueba[]; planes: string[]; diasPrueba: number };

const campo = 'h-9 px-3 rounded-md text-sm border bg-field text-content-1 border-line-field focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))]';

export default function PruebasSoporte() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const [elegida, setElegida] = useState<FilaPrueba | null>(null);
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    setEstado({ tipo: 'cargando' });
    try {
      const r = await api.get('/prueba/admin/lista');
      setEstado({ tipo: 'listo', pruebas: Array.isArray(r.data?.pruebas) ? r.data.pruebas : [], planes: Array.isArray(r.data?.planes) ? r.data.planes : [], diasPrueba: Number(r.data?.diasPrueba) || 30 });
    } catch (err: any) {
      const status = err?.response?.status;
      setEstado({ tipo: 'error', mensaje: status === 404 ? 'La prueba pública está apagada, no hay nada que mostrar.' : status === 403 ? 'Solo SOPORTE puede ver esta pantalla.' : 'No pudimos cargar las pruebas. Inténtalo de nuevo.' });
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  return (
    <MainLayout>
      <div className="max-w-[1100px] w-full mx-auto px-4 py-6">
        <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-content-1">Pruebas públicas</h1>
            <p className="text-sm text-content-2">Negocios que se registraron solos. Convierte uno a plan de pago sin perder sus datos.</p>
          </div>
          <button type="button" onClick={() => void cargar()} className="h-9 px-3 rounded-md text-sm border border-line-field text-content-1 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))]">Actualizar</button>
        </div>

        <div aria-live="polite">{aviso && <p role="status" className="mb-3 text-sm rounded-md border border-line bg-surface-2 px-3 py-2 text-content-1">{aviso}</p>}</div>

        {estado.tipo === 'cargando' && <p className="text-sm text-content-2" role="status">Cargando pruebas…</p>}
        {estado.tipo === 'error' && (
          <div role="alert" className="rounded-lg border border-line bg-surface-1 p-4 text-sm text-content-1">
            <p className="mb-3">{estado.mensaje}</p>
            <button type="button" onClick={() => void cargar()} className="h-9 px-3 rounded-md text-sm font-semibold bg-accent text-on-accent">Reintentar</button>
          </div>
        )}
        {estado.tipo === 'listo' && estado.pruebas.length === 0 && (
          <div className="rounded-lg border border-line bg-surface-1 p-6 text-sm text-content-2 text-center">Todavía no hay pruebas activas. Cuando alguien active la suya aparecerá aquí.</div>
        )}
        {estado.tipo === 'listo' && estado.pruebas.length > 0 && (
          <div className="rounded-lg border border-line bg-surface-1 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Pruebas públicas y su vigencia</caption>
              <thead className="bg-surface-2 text-content-2 text-xs uppercase tracking-wide">
                <tr>
                  <th scope="col" className="text-left px-3 py-2">Negocio</th>
                  <th scope="col" className="text-left px-3 py-2">Giro</th>
                  <th scope="col" className="text-left px-3 py-2">Estado</th>
                  <th scope="col" className="text-left px-3 py-2">Vigencia</th>
                  <th scope="col" className="text-left px-3 py-2">Vence</th>
                  <th scope="col" className="px-3 py-2"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {estado.pruebas.map((f) => (
                  <tr key={f.id} className="border-t border-line">
                    <td className="px-3 py-2 text-content-1"><span className="font-medium">{f.negocio}</span><span className="block text-xs text-content-3">@{f.correoDominio}</span></td>
                    <td className="px-3 py-2 text-content-2 capitalize">{f.giro}</td>
                    <td className="px-3 py-2"><span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold border border-line ${f.estado === 'VENCIDA' ? 'text-danger' : 'text-content-1'}`}>{etiquetaEstado(f.estado)}</span></td>
                    <td className="px-3 py-2 text-content-2">{textoVigencia(f)}{f.extendida ? ' · extendida' : ''}</td>
                    <td className="px-3 py-2 text-content-2">{fechaCorta(f.venceEn)}</td>
                    <td className="px-3 py-2 text-right">
                      {puedeConvertir(f) && <button type="button" onClick={() => { setAviso(''); setElegida(f); }} className="h-8 px-3 rounded-md text-xs font-semibold bg-accent text-on-accent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))]" aria-label={`Convertir ${f.negocio} a plan de pago`}>Convertir…</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {elegida && estado.tipo === 'listo' && (
        <DialogoConversion
          prueba={elegida}
          planes={estado.planes}
          onCerrar={() => setElegida(null)}
          onListo={(plan, ciclo) => { setAviso(`«${elegida.negocio}» ahora tiene el plan ${etiquetaPlan(plan)} (${ETIQUETA_CICLO[ciclo].toLowerCase()}).`); setElegida(null); void cargar(); }}
        />
      )}
    </MainLayout>
  );
}

function DialogoConversion({ prueba, planes, onCerrar, onListo }: { prueba: FilaPrueba; planes: string[]; onCerrar: () => void; onListo: (plan: string, ciclo: Ciclo) => void }) {
  const [plan, setPlan] = useState('');
  const [ciclo, setCiclo] = useState<Ciclo>('monthly');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  async function confirmar() {
    if (enviandoRef.current) return;
    const e = validarConversion(plan, planes);
    if (e) { setError(e); document.getElementById('conv-plan')?.focus(); return; }
    enviandoRef.current = true;
    setEnviando(true);
    setError('');
    try {
      await api.post(`/prueba/admin/${encodeURIComponent(prueba.id)}/convertir`, { plan, ciclo });
      onListo(plan, ciclo);
    } catch (err: any) {
      setError(mensajeConversion(err));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <Modal
      title="Convertir a plan de pago"
      subtitle={prueba.negocio}
      size="sm"
      onClose={enviando ? undefined : onCerrar}
      etiquetaEnter="Convertir"
      footer={(
        <>
          <button type="button" onClick={onCerrar} disabled={enviando} className="h-9 px-4 rounded-md text-sm border border-line-field text-content-1 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))] disabled:opacity-50">Cancelar</button>
          <button type="button" data-primary onClick={() => void confirmar()} disabled={enviando} className="h-9 px-4 rounded-md text-sm font-semibold bg-accent text-on-accent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus))] disabled:opacity-50">{enviando ? 'Convirtiendo…' : 'Convertir ahora'}</button>
        </>
      )}
    >
      <p className="text-sm text-content-2 mb-4">El negocio conserva todos sus datos. Se crea su suscripción y se activan los módulos del plan que su giro permita. No se quita ni se borra nada.</p>

      <label htmlFor="conv-plan" className="block text-xs font-medium text-content-2 mb-1">Plan</label>
      <select id="conv-plan" value={plan} onChange={(e) => { setPlan(e.target.value); setError(''); }} className={`${campo} w-full mb-3`} aria-invalid={!!error} aria-describedby={error ? 'conv-error' : undefined}>
        <option value="">Elige un plan…</option>
        {planes.map((p) => <option key={p} value={p}>{etiquetaPlan(p)}</option>)}
      </select>

      <label htmlFor="conv-ciclo" className="block text-xs font-medium text-content-2 mb-1">Facturación</label>
      <select id="conv-ciclo" value={ciclo} onChange={(e) => setCiclo(e.target.value as Ciclo)} className={`${campo} w-full mb-3`}>
        <option value="monthly">Mensual</option>
        <option value="annual">Anual</option>
      </select>

      <div aria-live="polite">{error && <p id="conv-error" role="alert" className="text-sm rounded-md border border-line bg-surface-2 px-3 py-2 text-danger">{error}</p>}</div>
    </Modal>
  );
}
