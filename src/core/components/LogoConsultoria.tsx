import type { CSSProperties } from 'react';

/**
 * Logo de ESTIA Consultoría (cuadrado, fondo azul marino). Fuente: public/marca/logo-estia-consultoria-original.jpg (1600×1600).
 * Se sirven recortes cuadrados de 256/512/1024 px (WebP) y el navegador elige el que da al menos el doble del tamaño mostrado.
 * - Sobre fondo oscuro (`recuadro` = false): los bordes se funden con el fondo, sin que se note un cuadro.
 * - Sobre fondo claro (`recuadro` = true): se muestra como recuadro redondeado oscuro, con borde y margen.
 * Siempre se respeta la proporción 1:1 (no se deforma).
 */
export interface LogoConsultoriaProps {
  /** Lado mostrado en px (ancho = alto). */
  lado: number;
  recuadro?: boolean;
  style?: CSSProperties;
}

const BASE = '/marca/logo-estia-consultoria';
// Difumina solo el borde (9 %): el dibujo ocupa del 11 % al 90 % del recorte. Solo importa el alfa.
const GRADIENTE = 'linear-gradient(to right, transparent 0, black 9%, black 91%, transparent 100%), linear-gradient(to bottom, transparent 0, black 9%, black 91%, transparent 100%)';

export default function LogoConsultoria({ lado, recuadro = false, style }: LogoConsultoriaProps) {
  const estilo: CSSProperties = {
    width: lado,
    height: lado,
    display: 'block',
    flexShrink: 0,
    objectFit: 'contain',
    ...(recuadro
      ? { borderRadius: Math.max(8, Math.round(lado * 0.2)), border: '1px solid rgb(var(--border))' }
      : { WebkitMaskImage: GRADIENTE, maskImage: GRADIENTE, WebkitMaskComposite: "source-in", maskComposite: "intersect" }),
    ...style,
  };
  return (
    <img
      src={`${BASE}-512.webp`}
      srcSet={`${BASE}-256.webp 256w, ${BASE}-512.webp 512w, ${BASE}-1024.webp 1024w`}
      sizes={`${lado * 2}px`}
      width={lado}
      height={lado}
      alt="Logotipo de ESTIA Consultoría"
      decoding="async"
      style={estilo}
    />
  );
}
