// Reglas de las ventanas del POS (y del ERP). Una sola fuente para que ninguna ventana vuelva a nacer "en vertical":
//  - ancho hasta 90vw y alto hasta 90vh (a 1366×768 son 1229×691 px);
//  - a 1366×768 NINGUNA ventana de caja requiere desplazamiento: el contenido se reparte en columnas (el scroll interno del
//    cuerpo es solo la red de seguridad para contenido dinámico, como listas largas);
//  - encabezado y botones de acción FIJOS: nunca salen de pantalla por mucho contenido que haya.
export type TamanoModal = 'sm' | 'md' | 'lg' | 'xl';

/** Tope de ancho por tamaño (px). Siempre además limitado a 90vw. */
export const ANCHO_MAX_PX: Record<TamanoModal, number> = { sm: 480, md: 760, lg: 1000, xl: 1240 };

// Clases literales (Tailwind no resuelve nombres armados dinámicamente).
export const CLASE_ANCHO: Record<TamanoModal, string> = {
  sm: 'max-w-[480px]',
  md: 'max-w-[760px]',
  lg: 'max-w-[1000px]',
  xl: 'max-w-[1240px]',
};

/**
 * Capa ÚNICA de todas las ventanas. La barra superior del ERP vive en z-index 100 dentro de un contenedor propio
 * (MainLayout), así que un overlay en z-50 dentro de la página queda debajo de ella. `Modal` se pinta en un portal
 * colgado de <body> con esta capa, por encima de la barra y de sus menús.
 */
export const CAPA_MODAL = 200;
export const CAPA_BARRA_SUPERIOR = 100;

export const CLASES_MODAL = {
  overlay: 'fixed inset-0 z-[200] flex items-center justify-center bg-scrim/60 p-3',
  panel: 'flex max-h-[90vh] w-[90vw] flex-col overflow-hidden rounded-xl border !border-line !bg-surface-1 !text-content-1 shadow-2xl',
  header: 'shrink-0 border-b !border-line px-5 py-3',
  body: 'min-h-0 flex-1 overflow-y-auto px-5 py-3',
  footer: 'flex shrink-0 gap-2 border-t !border-line !bg-surface-1 px-5 py-3',
} as const;

/** Apariencia de la ventana: `sistema` usa los tokens de la skin; `papel` es para las pantallas Lite, que pintan sobre papel claro (tokens papel-*). */
export type AparienciaModal = 'sistema' | 'papel';

export const CLASES_MODAL_PAPEL = {
  panel: 'flex max-h-[90vh] w-[90vw] flex-col overflow-hidden rounded-xl border !border-papel-linea !bg-papel !text-tinta-1 shadow-2xl',
  header: 'shrink-0 border-b !border-papel-linea-2 px-5 py-3',
  footer: 'flex shrink-0 gap-2 border-t !border-papel-linea-2 !bg-papel px-5 py-3',
  leyenda: 'shrink-0 border-t !border-papel-linea-2 px-5 py-1.5 text-[11px] !text-tinta-3',
  subtitulo: 'text-xs !text-tinta-3',
  cerrar: 'text-2xl leading-none !text-tinta-3 hover:!text-tinta-1',
} as const;

export function clasePanel(size: TamanoModal, apariencia: AparienciaModal = 'sistema'): string {
  return `${apariencia === 'papel' ? CLASES_MODAL_PAPEL.panel : CLASES_MODAL.panel} ${CLASE_ANCHO[size]}`;
}

/** Ancho real que ocupa una ventana en un viewport dado: min(90vw, tope del tamaño). */
export function anchoEfectivo(size: TamanoModal, viewportAncho: number): number {
  return Math.min(Math.floor(viewportAncho * 0.9), ANCHO_MAX_PX[size]);
}

/** Alto máximo de una ventana en un viewport dado (90vh). */
export function altoMaximo(viewportAlto: number): number {
  return Math.floor(viewportAlto * 0.9);
}
