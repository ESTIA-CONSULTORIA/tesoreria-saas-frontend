import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/** Alto que queda desde la parte superior del elemento hasta el fondo de la ventana (px), sin números fijos de barras. */
export function alturaRestante(ventanaAlto: number, arriba: number, minimo = 320): number {
  return Math.max(minimo, Math.floor(ventanaAlto - arriba));
}

/**
 * Devuelve [ref, alto]. Pon `ref` en el contenedor de página y `height: alto` (o un respaldo mientras es null):
 * así la página ocupa exactamente lo que queda bajo la barra superior y la subnavegación, sin scroll de documento.
 */
export function useAlturaRestante<T extends HTMLElement>(): [React.RefObject<T | null>, number | null] {
  const ref = useRef<T | null>(null);
  const [alto, setAlto] = useState<number | null>(null);
  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAlto(alturaRestante(window.innerHeight, el.getBoundingClientRect().top + window.scrollY));
  }, []);
  useLayoutEffect(() => {
    medir();
    window.addEventListener('resize', medir);
    // La barra superior puede cambiar de alto (subnavegación que aparece/desaparece)
    const padre = ref.current?.parentElement;
    const ro = padre && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    if (padre) ro?.observe(padre);
    return () => { window.removeEventListener('resize', medir); ro?.disconnect(); };
  }, [medir]);
  return [ref, alto];
}

