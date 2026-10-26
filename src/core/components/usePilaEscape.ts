import { useCallback, useEffect, useRef } from 'react';

// Esc cierra SOLO la ventana de arriba. Cada ventana abierta se apunta en esta pila al montarse y se quita al desmontarse; al pulsar
// Esc actúa la última. Sirve igual para `Modal` y para los formularios heredados que pintan su propio overlay (los `Create*`), que
// mostraban "ESC para cerrar" sin atender la tecla. Devuelve `esSuperior()`: `Modal` lo usa para que los atajos (F4, Tab, Enter)
// de una ventana de abajo no actúen mientras hay otra encima.
const pila: symbol[] = [];

export function usePilaEscape(alEscape: (() => void) | undefined, activa = true): () => boolean {
  const vivo = useRef(alEscape);
  vivo.current = alEscape;
  const yo = useRef<symbol>(Symbol('ventana'));

  useEffect(() => {
    if (!activa) return;
    const id = yo.current;
    pila.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || pila[pila.length - 1] !== id) return;
      const cerrar = vivo.current;
      if (!cerrar) return;
      e.preventDefault();
      cerrar();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const i = pila.indexOf(id);
      if (i >= 0) pila.splice(i, 1);
    };
  }, [activa]);

  return useCallback(() => pila[pila.length - 1] === yo.current, []);
}

/** Cuántas ventanas hay abiertas (para pruebas). */
export function ventanasAbiertas(): number {
  return pila.length;
}
