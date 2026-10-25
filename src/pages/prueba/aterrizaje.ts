// Contenido y lógica pura de la página de aterrizaje de /prueba (sin React): textos, bloques, pasos, aviso de «Próximamente» y qué NO incluye
// la prueba según el giro. Se prueba con vitest; la página solo lo dibuja.
import { DIAS_PRUEBA, GIROS_FORM, LIMITES } from './pruebaLogic';
import { MODULOS_POR_GIRO, tieneModulo } from './modulosPrueba';

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
export interface LimiteGiro { id: string; titulo: string; detalle: string }

const CFDI_Y_TARJETA: readonly LimiteGiro[] = LIMITES.filter((l) => l.id !== 'reservas');
const SIN_COMPRAS: LimiteGiro = { id: 'compras', titulo: 'Sin compras ni inventario', detalle: 'La prueba de este giro no incluye Compras, Proveedores ni Costos. La caja, la tesorería y los reportes sí.' };
const SIN_NOMINA: LimiteGiro = { id: 'nomina', titulo: 'Sin nómina', detalle: 'La prueba no incluye Recursos Humanos ni nómina.' };

/**
 * Lo que la prueba no tiene, por giro, DERIVADO de la misma tabla giro → módulos que activa el servidor (modulosPrueba.ts): CFDI y tarjeta aplican
 * a toda prueba; «Sin reservas» es del gimnasio (las canchas se reservan en Playtomic); «Sin compras ni inventario» sale solo si el giro no recibe
 * Compras; la nómina (RH) queda fuera del techo del plan PRUEBA para todos.
 */
export function limitesDeGiro(giro: string): readonly LimiteGiro[] {
  const g = MODULOS_POR_GIRO[giro] ? giro : 'generico';
  return [...(g === 'gimnasio' ? LIMITES : CFDI_Y_TARJETA), ...(tieneModulo(g, 'compras') ? [] : [SIN_COMPRAS]), SIN_NOMINA];
}

export const LIMITES_POR_GIRO: Record<string, readonly LimiteGiro[]> = Object.fromEntries(Object.keys(MODULOS_POR_GIRO).map((g) => [g, limitesDeGiro(g)]));

export const etiquetaGiro = (giro: string): string => GIROS_FORM.find((g) => g.valor === giro)?.etiqueta ?? giro;
