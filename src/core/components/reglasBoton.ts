// Variantes del botón estándar. El color sale del ROL de la acción (principal, peligro, éxito…), no de la ventana en la que vive:
// antes "Retirar" era amarillo, "Guardar precorte" morado y "Depositar" gris. Solo tokens de las skins: ninguna variante trae color fijo.
export type VarianteBoton = 'principal' | 'secundario' | 'peligro' | 'exito' | 'advertencia' | 'fantasma';
export type TamanoBoton = 'sm' | 'md' | 'lg';

export const CLASES_VARIANTE: Record<VarianteBoton, string> = {
  principal: '!bg-btn !text-on-solid hover:!bg-btn-hover',
  secundario: 'border !border-line !bg-surface-2 !text-content-1 hover:!bg-surface-3',
  peligro: '!bg-danger-solid !text-on-solid hover:brightness-110',
  exito: '!bg-ok-solid !text-on-solid hover:brightness-110',
  advertencia: '!bg-warn-solid !text-on-solid hover:brightness-110',
  fantasma: 'bg-transparent !text-content-2 hover:!bg-surface-2',
};

/** Sobre papel claro (pantallas Lite) los neutros usan los tokens papel-*; los de color (principal, peligro…) ya llevan su propio texto. */
export const CLASES_NEUTRO_PAPEL: Partial<Record<VarianteBoton, string>> = {
  secundario: 'border border-papel-linea bg-papel-soft text-tinta-1 hover:bg-papel-linea-2',
  fantasma: 'bg-transparent text-tinta-2 hover:bg-papel-linea-2',
};

export const CLASES_TAMANO_BOTON: Record<TamanoBoton, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'min-w-[8rem] px-6 py-2.5 text-sm',
  lg: 'min-w-[10rem] px-8 py-3.5 text-base',
};

/** Las acciones que confirman (todas menos secundario y fantasma): Enter y el foco inicial las encuentran por `data-primary`. */
export function esVariantePrincipal(v: VarianteBoton): boolean {
  return v !== 'secundario' && v !== 'fantasma';
}
