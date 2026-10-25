// Módulos que recibe un negocio de prueba según su giro. ESPEJO de backend/src/prueba-publica/giros-prueba.ts (MODULOS_NUCLEO + MODULOS_POR_GIRO):
// el servidor es quien activa los módulos; esta copia solo sirve para describir la prueba ANTES de que exista el negocio (aterrizaje) y para que la
// guía y la nota de «qué no incluye» salgan de la misma tabla. modulosPrueba.spec.ts y giros-prueba.spec.ts (backend) fijan el MISMO literal:
// si cambia uno, el otro spec falla. DEUDA TÉCNICA: la tienda recibe `costos` solo como vehículo del inventario.

export const MODULOS_NUCLEO = ['dashboard', 'usuarios', 'empresas', 'sucursales', 'configuracion', 'pos', 'configuracion_pos', 'reportes', 'tesoreria'] as const;

export const MODULOS_POR_GIRO: Readonly<Record<string, readonly string[]>> = {
  restaurante: ['costos', 'compras', 'proveedores'],
  retail: ['costos', 'compras', 'proveedores'],
  gimnasio: ['membresias'],
  generico: [],
};

/** Módulos del giro (núcleo + propios). Un giro desconocido se trata como genérico, igual que la guía. */
export function modulosDeGiro(giro: string | null | undefined): string[] {
  const propios = (giro && MODULOS_POR_GIRO[giro]) || MODULOS_POR_GIRO.generico;
  return [...MODULOS_NUCLEO, ...propios];
}

export const tieneModulo = (giro: string | null | undefined, modulo: string): boolean => modulosDeGiro(giro).includes(modulo);
