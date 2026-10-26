import { GLIFO_BORRAR, filasTeclado, type TeclaNumerica } from './reglasTecladoNumerico';

// Teclado numérico único: 7-8-9 arriba, 0 abajo y un solo glifo de borrar. No roba el foco del campo (el teclado físico sigue
// escribiendo en él) y sus teclas quedan fuera del Tab: quien usa teclado escribe, quien usa pantalla toca.
// `papel`: pantallas Lite, que pintan sobre papel claro con los tokens papel-*.
interface Props {
  onTecla: (t: TeclaNumerica) => void;
  /** Muestra el punto decimal (montos). Sin él, la celda queda vacía y el 0 no se mueve (NIP). */
  permitirPunto?: boolean;
  tamano?: 'normal' | 'grande';
  apariencia?: 'sistema' | 'papel';
  deshabilitado?: boolean;
  className?: string;
}

const TECLA: Record<'sistema' | 'papel', string> = {
  sistema: 'border !border-line !bg-surface-2 !text-content-1 hover:!bg-surface-3',
  papel: 'border border-papel-linea bg-papel-soft text-tinta-1',
};

export function TecladoNumerico({ onTecla, permitirPunto = false, tamano = 'normal', apariencia = 'sistema', deshabilitado = false, className = '' }: Props) {
  const celda = tamano === 'grande' ? 'py-5 text-2xl' : 'py-3 text-xl';
  return (
    <div role="group" aria-label="Teclado numérico" className={`grid grid-cols-3 gap-2 ${className}`}>
      {filasTeclado(permitirPunto).flat().map((t, i) =>
        t === '' ? (
          <span key={i} aria-hidden="true" />
        ) : (
          <button
            key={t}
            type="button"
            tabIndex={-1}
            disabled={deshabilitado}
            aria-label={t === 'borrar' ? 'Borrar' : t === '.' ? 'Punto decimal' : t}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onTecla(t)}
            className={`rounded-xl font-medium transition active:scale-95 disabled:opacity-50 ${celda} ${TECLA[apariencia]}`}
          >
            {t === 'borrar' ? GLIFO_BORRAR : t}
          </button>
        ),
      )}
    </div>
  );
}
