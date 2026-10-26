import type { ReactNode } from 'react';

// Pie estándar de toda ventana: lo informativo (totales, diferencia) a la izquierda, y a la derecha la acción secundaria
// (Cancelar) seguida de la principal. Siempre en ese orden, en todas las ventanas.
interface Props {
  /** Resumen vivo (p. ej. diferencia del corte); ocupa el espacio sobrante a la izquierda. */
  resumen?: ReactNode;
  secundario?: ReactNode;
  principal: ReactNode;
}

export function ModalFooter({ resumen, secundario, principal }: Props) {
  return (
    <div className="flex w-full items-center gap-3">
      {resumen ? <div className="min-w-0 flex-1">{resumen}</div> : <div className="flex-1" />}
      {secundario}
      {principal}
    </div>
  );
}
