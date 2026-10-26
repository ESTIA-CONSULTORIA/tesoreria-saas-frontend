import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CLASES_MODAL, CLASES_MODAL_PAPEL, clasePanel, type AparienciaModal, type TamanoModal } from './reglasModal';
import {
  SELECTOR_ENFOCABLES,
  TECLAS_FUNCION,
  accionEnter,
  atajoDeTecla,
  indiceTab,
  leyendaAtajos,
  type Atajo,
  type ModoEnter,
} from './reglasTeclado';
import { usePilaEscape } from './usePilaEscape';

// Ventana única del ERP/POS (antes ModalPOS, que sigue exportándose con ese nombre). Reglas en ./reglasModal.ts: hasta 90vw × 90vh,
// cabecera y pie FIJOS, cuerpo con scroll solo como red de seguridad. Se pinta en un portal colgado de <body> con una capa única
// (CAPA_MODAL), por encima de la barra superior y de sus menús.
// Teclado (./reglasTeclado.ts): foco inicial en el primer campo (o en el que tenga data-autofocus), Tab que no se escapa de la
// ventana, Esc cancela solo en la ventana de arriba (si hay onClose), Enter en un campo pulsa el botón principal (data-primary, o el
// último botón del pie) y los atajos que declare cada pantalla (F2, F4…) con su leyenda visible. Al cerrar, el foco vuelve a donde
// estaba. Los atajos solo actúan en la ventana de arriba: una ventana de abajo no reacciona mientras hay otra encima.
// El que la usa reparte el contenido en columnas (grid lg:grid-cols-N) y pasa los botones en `footer` (ver ModalFooter).
export interface PropsModal {
  title: ReactNode;
  subtitle?: ReactNode;
  size?: TamanoModal;
  /** Botones de acción: siempre visibles abajo. */
  footer?: ReactNode;
  /** Se llama con Escape y con la X. Sin él no hay X ni Escape. */
  onClose?: () => void;
  /** Atajos de teclado de esta ventana; se documentan en la barra inferior. */
  atajos?: Atajo[];
  /** Enter pasa al siguiente campo (conteo de billetes) en vez de confirmar de inmediato. */
  enterModo?: ModoEnter;
  /** Texto de lo que hace Enter, para la barra de atajos (p. ej. "Abrir turno"). */
  etiquetaEnter?: string;
  /** `papel`: ventanas de las pantallas Lite (papel claro con tokens papel-*). Por omisión usa la skin. */
  apariencia?: AparienciaModal;
  children: ReactNode;
}

export function Modal({ title, subtitle, size = 'md', footer, onClose, atajos = [], enterModo = 'confirmar', etiquetaEnter, apariencia = 'sistema', children }: PropsModal) {
  const papel = apariencia === 'papel';
  const panel = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  // Siempre los valores vigentes sin re-registrar el listener en cada render (los atajos traen funciones nuevas cada vez).
  const vivo = useRef({ atajos });
  vivo.current = { atajos };
  const esSuperior = usePilaEscape(onClose);

  // Foco inicial y devolución del foco al cerrar.
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const raiz = panel.current;
      if (!raiz) return;
      const marcado = raiz.querySelector<HTMLElement>('[data-autofocus]');
      const campo = raiz.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select:not([disabled]), textarea:not([disabled])');
      const destino = marcado ?? campo ?? raiz.querySelector<HTMLElement>('[data-primary], button:not([disabled])');
      destino?.focus();
      if (destino instanceof HTMLInputElement && destino.type !== 'checkbox' && destino.type !== 'radio') destino.select?.();
    }, 0);
    return () => {
      clearTimeout(t);
      previo?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || !esSuperior()) return; // Esc lo atiende usePilaEscape
      if (TECLAS_FUNCION.has(e.key)) {
        const a = atajoDeTecla(vivo.current.atajos, e.key);
        if (a) {
          e.preventDefault();
          if (!a.deshabilitado) a.accion();
        }
        return;
      }
      const raiz = panel.current;
      if (!raiz) return;
      if (e.key === 'Tab') {
        const items = Array.from(raiz.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)).filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (items.length === 0) return;
        const destino = indiceTab(items.indexOf(document.activeElement as HTMLElement), items.length, e.shiftKey);
        if (destino >= 0) {
          e.preventDefault();
          items[destino].focus();
        }
        return;
      }
      if (e.key === 'Enter' && raiz.contains(e.target as Node)) {
        const el = e.target as HTMLInputElement;
        const campos = Array.from(raiz.querySelectorAll<HTMLElement>('input:not([disabled]):not([type="hidden"]):not([readonly]), select:not([disabled])'));
        const i = campos.indexOf(el);
        const accion = accionEnter({
          tag: el.tagName ?? '',
          tipo: el.type,
          modo: enterModo,
          hayCampoSiguiente: i >= 0 && i < campos.length - 1,
          defaultPrevented: e.defaultPrevented,
        });
        if (accion === 'siguiente') {
          e.preventDefault();
          campos[i + 1].focus();
          if (campos[i + 1] instanceof HTMLInputElement) (campos[i + 1] as HTMLInputElement).select?.();
        } else if (accion === 'confirmar') {
          const boton =
            raiz.querySelector<HTMLButtonElement>('[data-primary]:not(:disabled)') ??
            (Array.from(raiz.querySelectorAll<HTMLButtonElement>('[data-pos-footer] button')).pop() ?? null);
          if (boton && !boton.disabled) {
            e.preventDefault();
            boton.click();
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enterModo, esSuperior]);

  const leyenda = leyendaAtajos(atajos, !!onClose, etiquetaEnter);

  return createPortal(
    <div className={CLASES_MODAL.overlay} role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
      <div ref={panel} className={clasePanel(size, apariencia)} data-modal-size={size} data-modal-apariencia={apariencia}>
        <div className={`${papel ? CLASES_MODAL_PAPEL.header : CLASES_MODAL.header} flex items-start justify-between gap-3`}>
          <div className="min-w-0">
            <h3 id={idTitulo} className="truncate text-lg font-semibold">{title}</h3>
            {subtitle ? <p className={papel ? CLASES_MODAL_PAPEL.subtitulo : 'text-xs !text-content-3'}>{subtitle}</p> : null}
          </div>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Cerrar" className={papel ? CLASES_MODAL_PAPEL.cerrar : 'text-2xl leading-none !text-content-3 hover:text-content-1'}>
              ×
            </button>
          ) : null}
        </div>
        <div className={CLASES_MODAL.body}>{children}</div>
        {footer ? <div data-pos-footer className={papel ? CLASES_MODAL_PAPEL.footer : CLASES_MODAL.footer}>{footer}</div> : null}
        {leyenda.length > 0 ? (
          <div className={papel ? CLASES_MODAL_PAPEL.leyenda : 'shrink-0 border-t !border-line px-5 py-1.5 text-[11px] !text-content-3'} aria-label="Atajos de teclado">
            {leyenda.map((t, i) => (
              <span key={t}>
                {i > 0 ? <span className="mx-2 text-content-3">·</span> : null}
                <kbd className="font-sans">{t.split(' ')[0]}</kbd> {t.split(' ').slice(1).join(' ')}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
