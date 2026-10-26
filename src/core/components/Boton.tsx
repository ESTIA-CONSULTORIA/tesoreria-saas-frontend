import type { ButtonHTMLAttributes } from 'react';
import { CLASES_NEUTRO_PAPEL, CLASES_TAMANO_BOTON, CLASES_VARIANTE, esVariantePrincipal, type TamanoBoton, type VarianteBoton } from './reglasBoton';

// Botón estándar. El color sale de la variante (rol de la acción). Las variantes que confirman llevan `data-primary` para que
// Enter y el foco inicial de `Modal` las encuentren. `cargando` lo deshabilita y avisa a los lectores de pantalla.
export interface PropsBoton extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  cargando?: boolean;
  /** Ocupa todo el ancho de su contenedor (pantallas táctiles de una columna). */
  completo?: boolean;
  /** `papel`: pantallas Lite (papel claro). Solo cambia los botones neutros. */
  apariencia?: 'sistema' | 'papel';
  /** Por omisión las variantes de color confirman (`data-primary`). `false` para un botón de color DENTRO del cuerpo que no debe ganarle a Enter (Exacto, Agregar pago). */
  confirma?: boolean;
  className?: string;
}

export function Boton({ variante = 'principal', tamano = 'md', cargando = false, completo = false, apariencia = 'sistema', confirma, className = '', disabled, children, type = 'button', ...resto }: PropsBoton) {
  const principal = confirma ?? esVariantePrincipal(variante);
  const colores = (apariencia === 'papel' && CLASES_NEUTRO_PAPEL[variante]) || CLASES_VARIANTE[variante];
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      data-primary={principal ? '' : undefined}
      className={`rounded font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${colores} ${CLASES_TAMANO_BOTON[tamano]} ${completo ? 'w-full' : ''} ${className}`}
      {...resto}
    >
      {children}
    </button>
  );
}
