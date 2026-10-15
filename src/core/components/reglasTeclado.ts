// Reglas de teclado de las ventanas del POS (puras, sin DOM, con spec). ModalPOS las aplica; las pantallas solo declaran sus
// atajos. Criterio de diseño: todo el POS se opera con teclado y mouse (no solo táctil) y con un lector de código de barras,
// que escribe como un teclado y termina con Enter.

export interface Atajo {
  /** Nombre de `KeyboardEvent.key`: 'F2', 'F4', 'Enter'… (las teclas de función no chocan con escribir montos). */
  tecla: string;
  etiqueta: string;
  accion: () => void;
  /** Un atajo deshabilitado no actúa y se muestra atenuado. */
  deshabilitado?: boolean;
}

/** Teclas de función que el navegador usa (buscar, recargar, barra de direcciones, ayuda): se bloquean solo si hay atajo. */
export const TECLAS_FUNCION = new Set(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']);

export function atajoDeTecla(atajos: Atajo[], tecla: string): Atajo | undefined {
  return atajos.find((a) => a.tecla === tecla);
}

/** Leyenda de la barra de atajos: Esc primero si la ventana se puede cancelar, luego los atajos en el orden dado. */
export function leyendaAtajos(atajos: Atajo[], puedeCancelar: boolean, etiquetaEnter?: string): string[] {
  const partes = atajos.map((a) => `${a.tecla} ${a.etiqueta}`);
  if (etiquetaEnter) partes.unshift(`Enter ${etiquetaEnter}`);
  if (puedeCancelar) partes.push('Esc Cancelar');
  return partes;
}

// confirmar: Enter pulsa el botón principal · siguiente: pasa al campo que sigue y en el último confirma · avanzar: solo pasa
// al siguiente (acciones que no deben dispararse sin querer, como cerrar el turno).
export type ModoEnter = 'confirmar' | 'siguiente' | 'avanzar';

/** Qué hace Enter dentro de un campo de la ventana. Un textarea y un botón conservan su Enter nativo. */
export function accionEnter(p: {
  tag: string;
  tipo?: string;
  modo: ModoEnter;
  hayCampoSiguiente: boolean;
  defaultPrevented: boolean;
}): 'confirmar' | 'siguiente' | 'nada' {
  if (p.defaultPrevented) return 'nada';
  const tag = p.tag.toLowerCase();
  if (tag === 'textarea' || tag === 'button' || tag === 'a') return 'nada';
  if (tag !== 'input') return 'nada'; // un select usa Enter para abrir su lista
  if (p.tipo === 'checkbox' || p.tipo === 'radio' || p.tipo === 'button' || p.tipo === 'submit') return 'nada';
  if (p.modo !== 'confirmar' && p.hayCampoSiguiente) return 'siguiente';
  return p.modo === 'avanzar' ? 'nada' : 'confirmar';
}

/** Índice al que va el foco con Tab / Shift+Tab dentro de la ventana (circular: el foco no se escapa al fondo). */
export function indiceTab(actual: number, total: number, atras: boolean): number {
  if (total <= 0) return -1;
  if (actual < 0) return atras ? total - 1 : 0;
  return atras ? (actual - 1 + total) % total : (actual + 1) % total;
}

export const SELECTOR_ENFOCABLES =
  'input:not([disabled]):not([type="hidden"]):not([readonly]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
