// Teclado numérico único del ERP (puro, con spec). Disposición de teclado físico y de calculadora: 7-8-9 arriba, 0 abajo,
// y UN solo glifo de borrar. Antes el Cobro usaba 7-8-9 arriba y el Corte Lite, la cocina, el mesero y el login usaban 1-2-3.
import { normalizarMonto } from '../utils/monto';

export type TeclaNumerica = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'borrar';

export const GLIFO_BORRAR = '⌫';

/** Filas del teclado. `.` solo cuando el campo admite decimales; si no, la celda queda vacía para no mover el 0. */
export function filasTeclado(permitirPunto: boolean): (TeclaNumerica | '')[][] {
  return [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    [permitirPunto ? '.' : '', '0', 'borrar'],
  ];
}

/** Tecla del teclado físico → tecla del teclado en pantalla (null si no es numérica). */
export function teclaDeEvento(key: string, permitirPunto: boolean): TeclaNumerica | null {
  if (key >= '0' && key <= '9' && key.length === 1) return key as TeclaNumerica;
  if (key === 'Backspace') return 'borrar';
  if (permitirPunto && (key === '.' || key === ',')) return '.';
  return null;
}

/** Aplica una tecla a un monto (texto). Mismas reglas que el campo de monto del cobro: un punto, 2 decimales, sin ceros a la izquierda. */
export function aplicarTeclaMonto(valor: string, tecla: TeclaNumerica): string {
  if (tecla === 'borrar') return valor.slice(0, -1);
  if (tecla === '.' && valor.includes('.')) return valor;
  const siguiente = tecla === '.' && valor === '' ? '0.' : valor + tecla;
  return normalizarMonto(siguiente);
}

/** Aplica una tecla a un NIP (solo dígitos, longitud fija). */
export function aplicarTeclaNip(valor: string, tecla: TeclaNumerica, longitud: number): string {
  if (tecla === 'borrar') return valor.slice(0, -1);
  if (tecla === '.' || valor.length >= longitud) return valor;
  return valor + tecla;
}
