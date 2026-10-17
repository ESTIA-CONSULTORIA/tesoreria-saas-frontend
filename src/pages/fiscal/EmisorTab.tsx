import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../core/api/api';
import type { Atajo } from '../../core/components/reglasTeclado';
import { hayCambios, mensajeErrorApi, opcionesRegimen, puedeActivarFacturacion, validarFormEmisor, validarRfc, type FormEmisor, type PasoPreparacion, type ResumenFiscal } from './fiscalLogic';
import { Aviso, btn, CampoRfc, etiqueta, inp, Leyenda, useAtajos } from './ui';

interface EmisorApi {
  rfc: string;
  nombreFiscal: string;
  regimenFiscal: string;
  serie: string | null;
  folioActual: number;
  facturacionActiva: boolean;
}
const VACIO: FormEmisor = { rfc: '', nombreFiscal: '', regimenFiscal: '', serie: '' };

export default function EmisorTab({ resumen, regimenes, pasos, alGuardar }: { resumen: ResumenFiscal | null; regimenes: Record<string, string>; pasos: PasoPreparacion[]; alGuardar: () => void }) {
  const empresas = resumen?.empresas ?? [];
  const [companyId, setCompanyId] = useState('');
  const [original, setOriginal] = useState<FormEmisor>(VACIO);
  const [form, setForm] = useState<FormEmisor>(VACIO);
  const [folio, setFolio] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    if (!companyId && empresas.length) setCompanyId(empresas[0].companyId);
  }, [empresas, companyId]);

  useEffect(() => {
    if (!companyId) return;
    let vivo = true;
    setCargando(true);
    setMsg(null);
    api
      .get<EmisorApi | null>(`/facturacion/emisor/${companyId}`)
      .then((r) => {
        if (!vivo) return;
        const e = r.data;
        const f: FormEmisor = e ? { rfc: e.rfc, nombreFiscal: e.nombreFiscal, regimenFiscal: e.regimenFiscal, serie: e.serie ?? '' } : VACIO;
        setOriginal(f);
        setForm(f);
        setFolio(e?.folioActual ?? 1);
      })
      .catch((e) => vivo && setMsg({ ok: false, texto: mensajeErrorApi(e, 'No se pudieron cargar los datos del emisor.') }))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [companyId]);

  useEffect(() => {
    if (!cargando) document.getElementById("fiscal-emisor-rfc")?.focus();
  }, [cargando, companyId]);

  const rfc = useMemo(() => validarRfc(form.rfc), [form.rfc]);
  const sinCambios = !hayCambios(form, original);
  const activar = puedeActivarFacturacion(pasos);

  const guardar = useCallback(async () => {
    const errores = validarFormEmisor(form);
    if (errores.length) return setMsg({ ok: false, texto: errores[0] });
    try {
      await api.put(`/facturacion/emisor/${companyId}`, {
        rfc: form.rfc.trim().toUpperCase(),
        nombreFiscal: form.nombreFiscal.trim(),
        regimenFiscal: form.regimenFiscal,
        serie: form.serie.trim() || null,
      });
      setOriginal(form);
      setMsg({ ok: true, texto: 'Datos del emisor guardados.' });
      alGuardar();
    } catch (e) {
      setMsg({ ok: false, texto: mensajeErrorApi(e, 'No se pudo guardar.') });
    }
  }, [form, companyId, alGuardar]);

  const atajos: Atajo[] = [
    { tecla: 'F4', etiqueta: 'Guardar', accion: guardar, deshabilitado: sinCambios },
    { tecla: 'Escape', etiqueta: 'Descartar', accion: () => setForm(original), deshabilitado: sinCambios },
  ];
  useAtajos(atajos);
  const opciones = opcionesRegimen(regimenes, rfc.tipo);
  const nombreEmpresa = empresas.find((e) => e.companyId === companyId)?.empresa ?? '';

  if (!empresas.length) return <p className="text-sm text-slate-400">Este negocio no tiene empresas todavía. Crea una en Empresas para capturar sus datos fiscales.</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-end gap-3">
        <div className="w-72">
          <label htmlFor="fiscal-empresa" className={etiqueta}>
            Empresa
          </label>
          <select id="fiscal-empresa" className={inp} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            {empresas.map((e) => (
              <option key={e.companyId} value={e.companyId}>
                {e.empresa}
              </option>
            ))}
          </select>
        </div>
        <p className="pb-1 text-xs text-slate-400">Datos de quien emite las facturas de «{nombreEmpresa}».</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-6 gap-y-1 content-start">
        <CampoRfc id="fiscal-emisor-rfc" valor={form.rfc} onCambio={(v) => setForm({ ...form, rfc: v })} resultado={rfc} />
        <div>
          <label htmlFor="fiscal-emisor-regimen" className={etiqueta}>
            Régimen fiscal
          </label>
          <select id="fiscal-emisor-regimen" className={inp} value={form.regimenFiscal} onChange={(e) => setForm({ ...form, regimenFiscal: e.target.value })}>
            <option value="">Elige el régimen…</option>
            {opciones.map((o) => (
              <option key={o.codigo} value={o.codigo}>
                {o.texto}
                {o.sugerido ? '' : ' (no suele aplicar a este RFC)'}
              </option>
            ))}
          </select>
          <p className="mt-0.5 h-4 text-xs text-slate-500">Confírmalo con tu contador. [VALIDAR]</p>
        </div>
        <div className="col-span-2">
          <label htmlFor="fiscal-emisor-nombre" className={etiqueta}>
            Nombre fiscal
          </label>
          <input
            id="fiscal-emisor-nombre"
            className={inp}
            maxLength={254}
            value={form.nombreFiscal}
            onChange={(e) => setForm({ ...form, nombreFiscal: e.target.value.toUpperCase() })}
            aria-describedby="fiscal-emisor-nombre-ayuda"
          />
          <p id="fiscal-emisor-nombre-ayuda" className="mt-0.5 text-xs text-slate-500">
            Tal como aparece en tu Constancia de Situación Fiscal, sin «S.A. de C.V.» ni otro régimen societario. [VALIDAR]
          </p>
        </div>
        <div>
          <label htmlFor="fiscal-emisor-serie" className={etiqueta}>
            Serie
          </label>
          <input id="fiscal-emisor-serie" className={`${inp} uppercase`} maxLength={25} value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <label htmlFor="fiscal-emisor-folio" className={etiqueta}>
            Siguiente folio
          </label>
          <input id="fiscal-emisor-folio" className={`${inp} opacity-60`} value={folio} readOnly tabIndex={-1} aria-describedby="fiscal-emisor-folio-ayuda" />
          <p id="fiscal-emisor-folio-ayuda" className="mt-0.5 text-xs text-slate-500">
            Lo controla el sistema.
          </p>
        </div>
        <div className="col-span-2 mt-1 rounded border border-slate-800 p-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" disabled checked={false} aria-describedby="fiscal-activa-motivo" /> Facturación activa
          </label>
          <p id="fiscal-activa-motivo" className="mt-0.5 text-xs text-slate-400">
            {activar.motivo || 'Lista para activarse.'}
          </p>
        </div>
      </div>

      <div className="flex min-h-[28px] items-center justify-between gap-3">
        <div className="min-w-0 flex-1">{msg ? <Aviso ok={msg.ok} texto={msg.texto} /> : null}</div>
        <button type="button" className={`${btn} bg-blue-600 hover:bg-blue-500 disabled:opacity-40`} disabled={sinCambios} onClick={guardar}>
          Guardar
        </button>
      </div>
      <Leyenda atajos={atajos} extra={['Tab Siguiente campo']} />
    </div>
  );
}
