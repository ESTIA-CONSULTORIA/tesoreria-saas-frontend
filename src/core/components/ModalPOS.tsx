import { useEffect, useRef, type ReactNode } from 'react';
import { CLASES_MODAL, clasePanel, type TamanoModal } from './reglasModal';
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

// Ventana compartida del POS/ERP. Reglas en ./reglasModal.ts: hasta 90vw × 90vh, cabecera y botones fijos, cuerpo en columnas.
// Teclado por defecto (ver ./reglasTeclado.ts): foco inicial en el primer campo (o en el que tenga data-autofocus), Tab que
// no se escapa de la ventana, Esc cancela (si hay onClose), Enter en un campo pulsa el botón principal (data-primary, o el
// último botón del pie) y los atajos que declare cada pantalla (F2, F4…) con su leyenda visible. Al cerrar, el foco vuelve
// a donde estaba.
// El que la usa reparte el contenido en columnas (grid lg:grid-cols-N) y pasa los botones en `footer`.
interface Props {
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
  children: ReactNode;
}

export function ModalPOS({ title, subtitle, size = 'md', footer, onClose, atajos = [], enterModo = 'confirmar', etiquetaEnter, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  // Siempre los valores vigentes sin re-registrar el listener en cada render (los atajos traen funciones nuevas cada vez).
  const vivo = useRef({ onClose, atajos });
  vivo.current = { onClose, atajos };

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
      const { onClose: cerrar, atajos: lista } = vivo.current;
      if (e.key === 'Escape') {
        // Un diálogo abierto encima (confirmación, otro modal) atiende su propio Escape: solo actúa el último.
        const dialogos = document.querySelectorAll('[role="dialog"]');
        if (dialogos.length && dialogos[dialogos.length - 1] !== panel.current?.parentElement) return;
        if (cerrar) {
          e.preventDefault();
          cerrar();
        }
        return;
      }
      if (TECLAS_FUNCION.has(e.key)) {
        const a = atajoDeTecla(lista, e.key);
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
  }, [enterModo]);

  const leyenda = leyendaAtajos(atajos, !!onClose, etiquetaEnter);

  return (
    <div className={CLASES_MODAL.overlay} role="dialog" aria-modal="true">
      <div ref={panel} className={clasePanel(size)} data-modal-size={size}>
        <div className={`${CLASES_MODAL.header} flex items-start justify-between gap-3`}>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">{title}</h3>
            {subtitle ? <p className="text-xs !text-content-3">{subtitle}</p> : null}
          </div>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Cerrar" className="text-2xl leading-none !text-content-3 hover:text-content-1">
              ×
            </button>
          ) : null}
        </div>
        <div className={CLASES_MODAL.body}>{children}</div>
        {footer ? <div data-pos-footer className={CLASES_MODAL.footer}>{footer}</div> : null}
        {leyenda.length > 0 ? (
          <div className="shrink-0 border-t !border-line px-5 py-1.5 text-[11px] !text-content-3" aria-label="Atajos de teclado">
            {leyenda.map((t, i) => (
              <span key={t}>
                {i > 0 ? <span className="mx-2 text-content-3">·</span> : null}
                <kbd className="font-sans">{t.split(' ')[0]}</kbd> {t.split(' ').slice(1).join(' ')}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
