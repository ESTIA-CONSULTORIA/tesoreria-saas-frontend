import type { KeyboardEvent } from 'react';

// Propiedades para que un contenedor clicable (fila, tarjeta) se use también con el teclado: entra en el orden de Tab, anuncia «botón»
// y se activa con Enter o Espacio. Uso: <div {...activarConTeclado(() => abrir(x))} onClick={() => abrir(x)}> (el onClick sigue siendo del llamador).
export function activarConTeclado(alActivar: () => void): { role: 'button'; tabIndex: 0; onKeyDown: (e: KeyboardEvent<HTMLElement>) => void } {
  return {
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e) => {
      if (e.target !== e.currentTarget) return; // un campo o botón interno conserva su propio teclado
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        alActivar();
      }
    },
  };
}
