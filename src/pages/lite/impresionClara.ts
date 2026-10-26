// Colores de lo que se imprime desde una ventana nueva (el corte del día y el ticket de cocina/barra). Esa ventana no tiene las variables de la skin
// y siempre es papel claro con tinta oscura, así que son hex fijos a propósito (por eso este módulo está en DEFINEN_COLORES de coloresFijos.ts).
export const IMPRESION = {
  tinta: '#111',
  tintaSuave: '#666',
  tintaTenue: '#999',
  linea: '#999',
} as const;
