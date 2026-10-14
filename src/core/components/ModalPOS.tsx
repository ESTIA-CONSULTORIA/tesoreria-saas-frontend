import { useEffect, type ReactNode } from 'react';
import { CLASES_MODAL, clasePanel, type TamanoModal } from './reglasModal';

// Ventana compartida del POS/ERP. Reglas en ./reglasModal.ts: hasta 90vw × 90vh, cabecera y botones fijos, cuerpo en columnas.
// El que la usa reparte el contenido en columnas (grid lg:grid-cols-N) y pasa los botones en `footer`.
interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  size?: TamanoModal;
  /** Botones de acción: siempre visibles abajo. */
  footer?: ReactNode;
  /** Se llama con Escape y con la X. Sin él no hay X ni Escape. */
  onClose?: () => void;
  children: ReactNode;
}

export function ModalPOS({ title, subtitle, size = 'md', footer, onClose, children }: Props) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={CLASES_MODAL.overlay} role="dialog" aria-modal="true">
      <div className={clasePanel(size)} data-modal-size={size}>
        <div className={`${CLASES_MODAL.header} flex items-start justify-between gap-3`}>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">{title}</h3>
            {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
          </div>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Cerrar" className="text-2xl leading-none text-slate-400 hover:text-white">
              ×
            </button>
          ) : null}
        </div>
        <div className={CLASES_MODAL.body}>{children}</div>
        {footer ? <div className={CLASES_MODAL.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}
