// Lógica pura de la matriz de permisos (sin pantalla): cambios pendientes, módulo completo y agrupación.

export type Accion = 'ver' | 'crear' | 'editar' | 'eliminar';
export const ACCIONES: Accion[] = ['ver', 'crear', 'editar', 'eliminar'];
export const NOMBRE_ACCION: Record<Accion, string> = { ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar' };
export type Valores = Record<Accion, boolean>;

export interface Celda { defecto: Valores; efectivo: Valores; modificado: boolean }
export interface ModuloInfo { codigo: string; nombre: string; descripcion: string }

/** Grupos de la pantalla (solo presentación); un módulo que no esté aquí cae en «Otros». */
export const GRUPOS: Array<{ titulo: string; modulos: string[] }> = [
  { titulo: 'Operación', modulos: ['pos', 'costos', 'compras', 'membresias', 'dashboard', 'reportes'] },
  { titulo: 'Finanzas', modulos: ['bancos', 'movimientos', 'transferencias', 'tesoreria', 'conciliacion', 'facturacion'] },
  { titulo: 'Personas y estructura', modulos: ['rh', 'usuarios', 'permisos', 'empresas', 'sucursales'] },
  { titulo: 'Sistema', modulos: ['configuracion', 'administracion', 'integraciones', 'ocr'] },
];

export function agrupar(modulos: ModuloInfo[]): Array<{ titulo: string; modulos: ModuloInfo[] }> {
  const porCodigo = new Map(modulos.map((m) => [m.codigo, m]));
  const usados = new Set<string>();
  const out = GRUPOS.map((g) => ({ titulo: g.titulo, modulos: g.modulos.map((c) => porCodigo.get(c)).filter((m): m is ModuloInfo => !!m) }));
  out.forEach((g) => g.modulos.forEach((m) => usados.add(m.codigo)));
  const otros = modulos.filter((m) => !usados.has(m.codigo));
  if (otros.length) out.push({ titulo: 'Otros', modulos: otros });
  return out.filter((g) => g.modulos.length > 0);
}

/** Valor mostrado: lo editado en pantalla si hay, si no lo efectivo guardado. */
export function valorActual(celda: Celda, borrador: Partial<Valores> | undefined): Valores {
  return { ...celda.efectivo, ...(borrador ?? {}) };
}

/** Cambia una acción; quitar «Ver» apaga lo demás (sin ver no hay nada que crear/editar/eliminar), y activar crear/editar/eliminar enciende Ver. */
export function conCambio(celda: Celda, borrador: Partial<Valores> | undefined, accion: Accion, valor: boolean): Partial<Valores> {
  const v = valorActual(celda, borrador);
  if (valor && !celda.defecto[accion]) return borrador ?? {}; // no se puede dar más de lo que el rol ya podía
  v[accion] = valor;
  if (accion === 'ver' && !valor) { v.crear = false; v.editar = false; v.eliminar = false; }
  if (accion !== 'ver' && valor && celda.defecto.ver) v.ver = true;
  return diferencias(celda, v);
}

/** Módulo completo: marca (o desmarca) todo lo disponible para el rol en ese módulo. */
export function moduloCompleto(celda: Celda, borrador: Partial<Valores> | undefined, marcar: boolean): Partial<Valores> {
  const v: Valores = { ver: false, crear: false, editar: false, eliminar: false };
  for (const a of ACCIONES) v[a] = marcar ? celda.defecto[a] : false;
  return diferencias(celda, v);
}

function diferencias(celda: Celda, v: Valores): Partial<Valores> {
  const d: Partial<Valores> = {};
  for (const a of ACCIONES) if (v[a] !== celda.efectivo[a]) d[a] = v[a];
  return d;
}

export function estaTodoMarcado(celda: Celda, v: Valores): boolean {
  return ACCIONES.filter((a) => celda.defecto[a]).every((a) => v[a]);
}
export function estaAlgoMarcado(v: Valores): boolean { return ACCIONES.some((a) => v[a]); }

export function cantidadCambios(borrador: Record<string, Partial<Valores>>): number {
  return Object.values(borrador).filter((d) => Object.keys(d).length > 0).length;
}

/** Cuerpo para PUT /permisos/:rol — un elemento por módulo cambiado, con los 4 valores finales. */
export function cuerpoGuardar(celdas: Record<string, Celda>, borrador: Record<string, Partial<Valores>>): Array<{ modulo: string } & Valores> {
  return Object.entries(borrador)
    .filter(([, d]) => Object.keys(d).length > 0)
    .map(([modulo, d]) => ({ modulo, ...valorActual(celdas[modulo], d) }));
}
