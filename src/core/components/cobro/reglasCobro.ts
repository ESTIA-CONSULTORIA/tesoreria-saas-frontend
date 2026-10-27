// Reglas puras del cobro único (con spec). No calculan dinero: totales, pagado, pendiente y cambio los entrega cada pantalla con su
// propia lógica (POS, mesas, retail). Aquí solo vive lo que las cuatro pantallas comparten: las formas de pago y el teclado.
export type ClaveForma = 'EFECTIVO' | 'TARJETA' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA' | 'CORTESIA';

export interface OpcionForma {
  clave: ClaveForma;
  etiqueta: string;
}

export const ICONO_FORMA: Record<string, string> = { EFECTIVO: '◈', DEBITO: '▣', CREDITO: '◉', TRANSFERENCIA: '⇄', CORTESIA: '✦', TARJETA: '▣' };

/** Teclas del cobro, iguales en toda pantalla que cobra. */
export const TECLAS_COBRO = { efectivo: 'F2', tarjeta: 'F3', spei: 'F6', exacto: 'F8', cobrar: 'F4' } as const;

/**
 * Forma que elige cada tecla: F2 efectivo; F3 tarjeta (si hay débito y crédito, alterna entre ellos empezando por débito; si hay una sola
 * «tarjeta», esa); F6 transferencia/SPEI. Devuelve null si la pantalla no ofrece esa forma (la tecla no hace nada).
 */
export function formaDeAtajo(tecla: 'F2' | 'F3' | 'F6', disponibles: ClaveForma[], activa: ClaveForma | null): ClaveForma | null {
  const hay = (f: ClaveForma) => disponibles.includes(f);
  if (tecla === 'F2') return hay('EFECTIVO') ? 'EFECTIVO' : null;
  if (tecla === 'F6') return hay('TRANSFERENCIA') ? 'TRANSFERENCIA' : null;
  if (hay('DEBITO') && hay('CREDITO')) return activa === 'DEBITO' ? 'CREDITO' : 'DEBITO';
  if (hay('TARJETA')) return 'TARJETA';
  if (hay('DEBITO')) return 'DEBITO';
  return hay('CREDITO') ? 'CREDITO' : null;
}
