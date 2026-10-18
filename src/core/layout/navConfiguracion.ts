// Módulo «Configuración» de la barra principal (antes rotulado «Auditoría»): qué ve cada rol y adónde lleva. Puro, con spec.
// El backend de Datos fiscales permite ADMIN y GERENTE; el resto de Configuración es solo de ADMIN (y SOPORTE).

export const PATH_DATOS_FISCALES = '/settings/fiscal';

export interface ItemSubnav {
  label: string;
  path: string;
  /** Roles que lo ven. Sin `roles`, solo ADMIN y SOPORTE (comportamiento de siempre). */
  roles?: string[];
}

const ADMIN_O_SOPORTE = ['ADMIN', 'SOPORTE'];

export const SUBNAV_CONFIGURACION: ItemSubnav[] = [
  { label: 'Usuarios', path: '/users' },
  { label: 'General', path: '/settings' },
  { label: 'Config. Login', path: '/settings/login-config' },
  { label: 'Apariencia', path: '/settings/appearance' },
  { label: 'Campos del Corte', path: '/settings/corte-fields' },
  { label: 'Datos fiscales', path: PATH_DATOS_FISCALES, roles: ['ADMIN', 'GERENTE', 'SOPORTE'] },
];

const veItem = (rol: string | undefined, i: ItemSubnav) => !!rol && (i.roles ?? ADMIN_O_SOPORTE).includes(rol);

/** Elementos del submenú de Configuración para un rol. */
export const itemsConfiguracion = (rol: string | undefined): ItemSubnav[] => SUBNAV_CONFIGURACION.filter((i) => veItem(rol, i));

/** El módulo aparece en la barra si el rol ve al menos un elemento. */
export const veConfiguracion = (rol: string | undefined): boolean => itemsConfiguracion(rol).length > 0;

/** Adónde lleva el botón «Configuración»: el ADMIN a «General» (/settings); quien solo ve Datos fiscales (GERENTE), directo a esa pantalla. */
export const rutaConfiguracion = (rol: string | undefined): string => (rol === 'ADMIN' || rol === 'SOPORTE' ? '/settings' : (itemsConfiguracion(rol)[0]?.path ?? '/settings'));
