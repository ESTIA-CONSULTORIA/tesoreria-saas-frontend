// Fondo de marca de /prueba y /prueba/activar: el isotipo ESTIA (public/marca/isotipo-plano.svg, de un solo color) repetido en tres tamaños.
// Las posiciones, tamaños y giros son FIJOS (no aleatorios): el fondo se ve igual en cada visita y en cada captura.
// Coordenadas: centro de la marca en % del área visible (fuera de 0–100 = recortada por el borde); tamaño en vmin; giro en grados.

export type TamanoMarca = 'grande' | 'mediano' | 'pequeno';
export interface Marca { tam: TamanoMarca; x: number; y: number; giro: number }

/** Tamaño (vmin) y opacidad por tamaño. Opacidades bajas a propósito: es una textura, no un elemento. */
export const TAMANOS_MARCA: Record<TamanoMarca, { vmin: number; opacidad: number }> = {
  grande: { vmin: 78, opacidad: 0.04 },
  mediano: { vmin: 30, opacidad: 0.055 },
  pequeno: { vmin: 13, opacidad: 0.07 },
};

export const MARCAS_FONDO: readonly Marca[] = [
  { tam: 'grande', x: 4, y: 8, giro: 14 },
  { tam: 'grande', x: 97, y: 96, giro: -18 },
  { tam: 'grande', x: 62, y: -14, giro: 32 },
  { tam: 'mediano', x: 30, y: 98, giro: -10 },
  { tam: 'mediano', x: 90, y: 22, giro: 24 },
  { tam: 'mediano', x: -2, y: 60, giro: -28 },
  { tam: 'mediano', x: 74, y: 74, giro: 8 },
  { tam: 'mediano', x: 48, y: 44, giro: -42 },
  { tam: 'pequeno', x: 18, y: 28, giro: 20 },
  { tam: 'pequeno', x: 42, y: 6, giro: -16 },
  { tam: 'pequeno', x: 66, y: 38, giro: 38 },
  { tam: 'pequeno', x: 94, y: 56, giro: -8 },
  { tam: 'pequeno', x: 10, y: 86, giro: 30 },
  { tam: 'pequeno', x: 56, y: 92, giro: -34 },
  { tam: 'pequeno', x: 99, y: 6, giro: 12 },
  { tam: 'pequeno', x: 30, y: 62, giro: -22 },
];

/** Estilo en línea de una marca (la máscara y el color viven en la clase `.fondo-marca-isotipo`, en prueba.css). */
export function estiloMarca(m: Marca): Record<string, string | number> {
  const t = TAMANOS_MARCA[m.tam];
  return {
    left: `${m.x}%`,
    top: `${m.y}%`,
    width: `${t.vmin}vmin`,
    height: `${t.vmin * (425 / 385)}vmin`,
    opacity: t.opacidad,
    transform: `translate(-50%, -50%) rotate(${m.giro}deg)`,
  };
}

/** ¿La marca se sale por algún borde (su caja, sin contar el giro, cruza 0 o 100 %)? Solo para comprobar que algunas quedan recortadas. */
export const estaRecortada = (m: Marca): boolean => m.x < 0 || m.x > 100 || m.y < 0 || m.y > 100;
