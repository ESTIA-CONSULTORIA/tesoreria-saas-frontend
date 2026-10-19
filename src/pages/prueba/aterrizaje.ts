// Contenido y lógica pura de la página de aterrizaje de /prueba (sin React): textos, bloques, pasos, aviso de «Próximamente» y qué NO incluye
// la prueba según el giro. Se prueba con vitest; la página solo lo dibuja.
import { DIAS_PRUEBA, GIROS_FORM, LIMITES, esCorreoValido, normalizarCorreo } from './pruebaLogic';

/** Correo de contacto público (el mismo que aparece en estiaconsultoria.com). */
export const CORREO_CONTACTO = 'contacto@estiaconsultoria.com';

export const HERO = {
  titulo: 'Controla tu negocio desde un solo sistema.',
  subtitulo: `Caja, inventario, cortes y reportes en una sola pantalla. Prueba ESTIA ${DIAS_PRUEBA} días con un negocio de ejemplo ya configurado para tu giro.`,
  cta: 'Comenzar mi prueba gratuita',
} as const;

/**
 * Capturas de pantalla reales del sistema (marco de monitor). `src: null` = todavía no hay captura: la página muestra el marco con una
 * maqueta neutra (sin texto ni cifras). Para ponerla basta una imagen en public/prueba/ y su ruta aquí; deben ser de tenants de prueba
 * (nunca de clientes) y de 1600×1000 o similar (16:10).
 */
export const CAPTURAS = {
  hero: { src: null as string | null, alt: 'Pantalla de caja de ESTIA con una venta en curso.' },
  caja: { src: null as string | null, alt: 'Corte de caja de ESTIA con el efectivo esperado y el contado.' },
  inventario: { src: null as string | null, alt: 'Inventario de productos y reporte de ventas de ESTIA.' },
  accesos: { src: null as string | null, alt: 'Lista de usuarios de ESTIA con su rol y estado.' },
};

export const BLOQUES = [
  { id: 'caja', titulo: 'Caja sin descuadres', texto: 'Cada venta y cada cobro quedan registrados por usuario. Al cerrar el turno, el corte te muestra el efectivo esperado contra el contado.', captura: 'caja' },
  { id: 'inventario', titulo: 'Inventario y reportes', texto: 'Productos y existencias al día, y reportes de ventas e ingresos para decidir con cifras y no con intuición.', captura: 'inventario' },
  { id: 'accesos', titulo: 'Control de acceso y usuarios', texto: 'Roles para dueño, gerente, recepción y cajero: cada persona ve y hace solo lo que le corresponde.', captura: 'accesos' },
] as const;

export const PASOS_COMO_FUNCIONA = [
  { n: 1, titulo: 'Pide tu prueba', texto: 'Elige tu giro y déjanos tu correo. No pedimos tarjeta.' },
  { n: 2, titulo: 'Actívala desde tu correo', texto: 'Abre el enlace que te enviamos y elige tu contraseña: tu negocio de ejemplo queda listo.' },
  { n: 3, titulo: `Explora ${DIAS_PRUEBA} días`, texto: 'Una guía de 5 pasos te lleva por la caja, las membresías, el check-in y los reportes.' },
] as const;

export const TEXTO_PRUEBA_GRATIS = `Prueba ESTIA ${DIAS_PRUEBA} días sin tarjeta.`;

// ── qué NO incluye, por giro ──
/**
 * Lo que la prueba no tiene. CFDI y tarjeta aplican a toda prueba; «Sin reservas» (canchas en Playtomic) es del gimnasio.
 * Los giros sin plantilla muestran solo lo común: no se promete ni se descarta nada de lo que todavía no existe.
 */
export function limitesDeGiro(giro: string): readonly (typeof LIMITES)[number][] {
  if (giro === 'gimnasio') return LIMITES;
  return LIMITES.filter((l) => l.id !== 'reservas');
}

// ── giros: tarjetas y «Próximamente» ──
export const giroDisponible = (giro: string): boolean => GIROS_FORM.some((g) => g.valor === giro && g.disponible);
export const etiquetaGiro = (giro: string): string => GIROS_FORM.find((g) => g.valor === giro)?.etiqueta ?? giro;

export interface AvisoForm { correo: string; giro: string; aceptaAviso: boolean; captcha: string }
export type CampoAviso = 'giro' | 'correo' | 'aceptaAviso' | 'captcha';
export const ORDEN_CAMPOS_AVISO: CampoAviso[] = ['giro', 'correo', 'aceptaAviso', 'captcha'];

/** Solo giros sin plantilla pueden pedir aviso (el gimnasio pide la prueba, no el aviso). */
export function validarAviso(f: AvisoForm): Partial<Record<CampoAviso, string>> {
  const e: Partial<Record<CampoAviso, string>> = {};
  const g = GIROS_FORM.find((x) => x.valor === f.giro);
  if (!g || g.disponible) e.giro = 'Elige un giro para avisarte.';
  if (!f.correo.trim()) e.correo = 'Escribe tu correo.';
  else if (!esCorreoValido(normalizarCorreo(f.correo))) e.correo = 'Escribe un correo válido (nombre@dominio.com).';
  if (!f.aceptaAviso) e.aceptaAviso = 'Debes aceptar el aviso de privacidad para continuar.';
  if (!f.captcha) e.captcha = 'Confirma que eres una persona.';
  return e;
}

/** Cuerpo exacto que espera POST /prueba/avisame. */
export const cuerpoAviso = (f: AvisoForm) => ({
  correo: normalizarCorreo(f.correo),
  giro: f.giro,
  captcha: f.captcha,
  aceptaAviso: f.aceptaAviso === true,
});

export const primerCampoAviso = (e: Partial<Record<CampoAviso, string>>): CampoAviso | null => ORDEN_CAMPOS_AVISO.find((c) => e[c]) ?? null;

export const MENSAJE_AVISO_OK = (giro: string): string => `Listo: te avisaremos por correo cuando la prueba para «${etiquetaGiro(giro)}» esté disponible.`;
