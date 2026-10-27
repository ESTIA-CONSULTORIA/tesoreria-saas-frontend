import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { normalizarMonto } from '../../utils/monto';
import { AlertaModal } from '../AlertaModal';
import { Boton } from '../Boton';
import { Modal } from '../Modal';
import { ModalFooter } from '../ModalFooter';
import { TecladoNumerico } from '../TecladoNumerico';
import { aplicarTeclaMonto } from '../reglasTecladoNumerico';
import { formaDeAtajo, ICONO_FORMA, TECLAS_COBRO, type ClaveForma, type OpcionForma } from './reglasCobro';
import type { Atajo } from '../reglasTeclado';

// Cobro ÚNICO del ERP (docs/PLAN-MODALES.md §2). Lo usan el POS, las mesas y el cobro rápido de retail. Es presentacional: cada pantalla
// conserva su lógica de precios, IVA, descuentos y validaciones de tarjeta y solo entrega aquí lo ya calculado.
//   xl · 3 columnas: [formas de pago] [importe con teclado] [resumen + datos de la forma elegida]
//   El TOTAL está siempre a la vista: en el subtítulo, en la columna 3 y en el pie (también cuando la ventana hace scroll en pantallas chicas).
//   F2 efectivo · F3 tarjeta · F6 SPEI · F8 exacto · F4 cobrar · Esc cancela. Enter agrega el importe (o cobra si no hay importe pendiente).
//   Tras cobrar, `fase="recibo"` cambia el contenido de ESTA misma ventana por el recibo; no se abre otra.
export interface CampoImporte {
  id: string;
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  placeholder?: string;
  /** El primer campo del POS: monto grande, alineado a la derecha. */
  grande?: boolean;
  /** Enter dentro del campo (el POS agrega el pago con Enter). Sin él, Enter pulsa el botón principal de la ventana. */
  onEnter?: () => void;
  inputRef?: Ref<HTMLInputElement | null>;
}

export interface LineaResumen {
  etiqueta: string;
  valor: string;
  tono?: 'ok' | 'peligro' | 'tenue' | 'normal';
}

interface Props {
  fase?: 'cobro' | 'recibo';
  titulo?: string;
  /** Total ya formateado ("$193.00"): se muestra siempre. */
  totalTexto: string;
  /** Qué es ese total: «Total a cobrar» (POS) o «Saldo a cobrar» (mesas). */
  etiquetaTotal?: string;
  formas: OpcionForma[];
  formaActiva: ClaveForma | null;
  onElegirForma: (f: ClaveForma) => void;
  /** Columna 1 debajo de las formas: pagos agregados, selector de modo de cobro… */
  columnaFormas?: ReactNode;
  /** Columna 2 encima del importe: título de la forma elegida, lista de ítems por cobrar… */
  cuerpoImporte?: ReactNode;
  campos: CampoImporte[];
  /** Columna 2 debajo del teclado: Exacto, + Agregar pago, montos rápidos. Sus botones usan `confirma={false}`. */
  accionesImporte?: ReactNode;
  /** F8. Sin él, la tecla no hace nada. */
  onExacto?: () => void;
  lineas: LineaResumen[];
  /** Columna 3 debajo del resumen: datos de tarjeta, clave SPEI, motivo de cortesía. */
  detalle?: ReactNode;
  error?: string | null;
  textoCancelar?: string;
  onCancel: () => void;
  textoConfirmar?: string;
  onConfirm: () => void;
  /** Por qué no se puede confirmar todavía (se muestra en el pie y deshabilita F4 y el botón). */
  motivoBloqueo?: string | null;
  procesando?: boolean;
  etiquetaEnter?: string;
  /** Contenido del recibo (fase "recibo"). Debe llevar su propio `id="print-area"`. */
  recibo?: ReactNode;
  onCerrarRecibo?: () => void;
  onImprimirRecibo?: () => void;
}

const TONO: Record<NonNullable<LineaResumen['tono']>, string> = { ok: '!text-ok', peligro: '!text-danger', tenue: '!text-content-3', normal: '!text-content-1' };

export function CobroModal(p: Props) {
  const fase = p.fase ?? 'cobro';
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const [activoId, setActivoId] = useState<string | null>(null);
  const activo = p.campos.find((c) => c.id === activoId) ?? p.campos[0];
  const etiquetaTotal = p.etiquetaTotal ?? 'Total a cobrar';
  const bloqueado = !!p.motivoBloqueo || !!p.procesando;
  const disponibles = p.formas.map((f) => f.clave);

  // Foco en el importe al abrir y cada vez que cambia la forma de pago: se teclea sin tocar la pantalla.
  useEffect(() => {
    if (fase !== 'cobro') return;
    const t = setTimeout(() => {
      const el = p.campos[0] ? refs.current[p.campos[0].id] : null;
      el?.focus();
      el?.select();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.formaActiva, fase]);

  // Al pasar al recibo el foco vuelve a un control del recibo (el botón que cobró ya no existe).
  useEffect(() => {
    if (fase !== 'recibo') return;
    const t = setTimeout(() => document.querySelector<HTMLElement>('[data-recibo-autofocus]')?.focus(), 0);
    return () => clearTimeout(t);
  }, [fase]);

  if (fase === 'recibo') {
    return (
      <Modal
        size="sm"
        title="Venta registrada"
        onClose={p.onCerrarRecibo}
        enterModo="avanzar"
        footer={
          <ModalFooter
            secundario={<Boton variante="secundario" data-recibo-autofocus="" onClick={p.onCerrarRecibo}>Cerrar</Boton>}
            principal={<Boton onClick={p.onImprimirRecibo}>Imprimir</Boton>}
          />
        }
      >
        {p.recibo}
      </Modal>
    );
  }

  const elegir = (tecla: 'F2' | 'F3' | 'F6') => {
    const f = formaDeAtajo(tecla, disponibles, p.formaActiva);
    if (f) p.onElegirForma(f);
  };
  const atajos: Atajo[] = [
    { tecla: TECLAS_COBRO.efectivo, etiqueta: 'Efectivo', accion: () => elegir('F2') },
    { tecla: TECLAS_COBRO.tarjeta, etiqueta: 'Tarjeta', accion: () => elegir('F3') },
    { tecla: TECLAS_COBRO.spei, etiqueta: 'SPEI', accion: () => elegir('F6') },
    ...(p.onExacto ? [{ tecla: TECLAS_COBRO.exacto, etiqueta: 'Exacto', accion: p.onExacto }] : []),
    { tecla: TECLAS_COBRO.cobrar, etiqueta: 'Cobrar', accion: p.onConfirm, deshabilitado: bloqueado },
  ];

  const tecla = (t: Parameters<typeof aplicarTeclaMonto>[1]) => {
    if (!activo) return;
    activo.onCambio(aplicarTeclaMonto(activo.valor, t));
    refs.current[activo.id]?.focus();
  };

  return (
    <Modal
      size="xl"
      title={p.titulo ?? 'Cobro'}
      subtitle={`${etiquetaTotal} ${p.totalTexto}`}
      onClose={p.onCancel}
      etiquetaEnter="Agregar pago"
      atajos={atajos}
      footer={
        <ModalFooter
          resumen={
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-sm font-bold !text-content-1" data-testid="cobro-total-pie">{etiquetaTotal} {p.totalTexto}</span>
              {p.motivoBloqueo ? <span role="status" className="text-xs !text-content-2">⚠ {p.motivoBloqueo}</span> : null}
            </div>
          }
          secundario={<Boton variante="secundario" onClick={p.onCancel}>{p.textoCancelar ?? 'Cancelar'}</Boton>}
          principal={<Boton variante="exito" tamano="lg" disabled={bloqueado} cargando={p.procesando} onClick={p.onConfirm}>{p.textoConfirmar ?? 'CONFIRMAR COBRO →'}</Boton>}
        />
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr_1fr]">
        {/* 1 · formas de pago */}
        <div className="flex flex-col gap-2">
          <p className="text-xs !text-content-3">FORMA DE PAGO</p>
          {p.formas.map((f) => (
            <button
              key={f.clave}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => p.onElegirForma(f.clave)}
              aria-pressed={p.formaActiva === f.clave}
              className={`flex h-11 w-full items-center gap-3 rounded-lg px-4 transition-colors ${
                p.formaActiva === f.clave ? '!bg-btn !text-on-solid ring-2 ring-inset ring-accent' : '!bg-surface-2 border !border-line !text-content-1 hover:!bg-surface-3'
              }`}
            >
              <span aria-hidden="true" className="text-xl">{ICONO_FORMA[f.clave]}</span>
              <span className="font-medium">{f.etiqueta}</span>
            </button>
          ))}
          {p.columnaFormas}
        </div>

        {/* 2 · importe con teclado */}
        <div className="flex flex-col">
          {p.cuerpoImporte}
          {p.campos.map((c) =>
            c.grande ? (
              <div key={c.id} className="mb-3 rounded-lg border !border-line !bg-nav px-4 py-2">
                <input
                  ref={(el) => { refs.current[c.id] = el; if (typeof c.inputRef === 'function') c.inputRef(el); else if (c.inputRef) (c.inputRef as { current: HTMLInputElement | null }).current = el; }}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label={c.etiqueta}
                  value={c.valor}
                  placeholder={c.placeholder ?? '0.00'}
                  onFocus={() => setActivoId(c.id)}
                  onChange={(e) => c.onCambio(normalizarMonto(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || !c.onEnter) return;
                    e.preventDefault();
                    c.onEnter();
                  }}
                  className="w-full bg-transparent text-right text-4xl font-bold !text-content-1 outline-none"
                />
              </div>
            ) : (
              <div key={c.id} className="mb-3">
                <label htmlFor={`cobro-${c.id}`} className="mb-1 block text-sm !text-content-3">{c.etiqueta}</label>
                <input
                  id={`cobro-${c.id}`}
                  ref={(el) => { refs.current[c.id] = el; if (typeof c.inputRef === 'function') c.inputRef(el); else if (c.inputRef) (c.inputRef as { current: HTMLInputElement | null }).current = el; }}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={c.valor}
                  placeholder={c.placeholder ?? '0.00'}
                  onFocus={() => setActivoId(c.id)}
                  onChange={(e) => c.onCambio(normalizarMonto(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || !c.onEnter) return;
                    e.preventDefault();
                    c.onEnter();
                  }}
                  className="w-full rounded-lg border !border-line !bg-nav px-3 py-2 text-xl font-semibold !text-content-1"
                />
              </div>
            ),
          )}
          {p.campos.length > 0 ? <TecladoNumerico className="mb-3" permitirPunto onTecla={tecla} /> : null}
          {p.accionesImporte}
        </div>

        {/* 3 · resumen y datos de la forma */}
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border !border-line !bg-nav p-3">
            <p className="text-xs uppercase !text-content-3">{etiquetaTotal === 'Total a cobrar' ? 'Total' : etiquetaTotal}</p>
            <p className="text-4xl font-bold !text-ok" data-testid="cobro-total">{p.totalTexto}</p>
            <div className="mt-2 space-y-1 text-sm">
              {p.lineas.map((l) => (
                <div key={l.etiqueta} className={TONO[l.tono ?? 'normal']}>{l.etiqueta}: {l.valor}</div>
              ))}
            </div>
          </div>
          {p.error ? <AlertaModal>{p.error}</AlertaModal> : null}
          {p.detalle}
        </div>
      </div>
    </Modal>
  );
}
