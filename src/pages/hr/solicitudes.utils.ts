// Lógica pura de la pestaña Solicitudes de RH (sin React) para poder probarla con vitest.

export interface SolicitudRH {
  id: string;
  employeeId: string;
  employeeNombre?: string | null;
  employeePuesto?: string | null;
  status?: string;
  // vacaciones
  startDate?: string;
  endDate?: string;
  daysRequested?: number;
  // permisos
  date?: string;
  hours?: number | string;
  type?: string;
}

export interface GrupoEmpleado {
  employeeId: string;
  nombre: string;
  puesto: string | null;
  vacaciones: SolicitudRH[];
  permisos: SolicitudRH[];
}

export interface EmpleadoBasico {
  id: string;
  nombre: string;
  apellidos?: string;
  puesto?: string;
}

/** Nombre a mostrar: el que trae el backend, o el de la lista de empleados ya cargada; nunca el UUID completo. */
export function nombreSolicitud(s: SolicitudRH, empleados: EmpleadoBasico[] = []): string {
  if (s.employeeNombre) return s.employeeNombre;
  const e = empleados.find((x) => x.id === s.employeeId);
  if (e) return `${e.nombre} ${e.apellidos || ''}`.trim();
  return `Empleado ${String(s.employeeId).slice(0, 8)}…`;
}

/** Agrupa por empleado conservando el orden de aparición; los grupos salen ordenados por nombre. */
export function agruparPorEmpleado(vacaciones: SolicitudRH[], permisos: SolicitudRH[], empleados: EmpleadoBasico[] = []): GrupoEmpleado[] {
  const grupos = new Map<string, GrupoEmpleado>();
  const grupo = (s: SolicitudRH) => {
    let g = grupos.get(s.employeeId);
    if (!g) {
      const e = empleados.find((x) => x.id === s.employeeId);
      g = { employeeId: s.employeeId, nombre: nombreSolicitud(s, empleados), puesto: s.employeePuesto ?? e?.puesto ?? null, vacaciones: [], permisos: [] };
      grupos.set(s.employeeId, g);
    }
    return g;
  };
  for (const v of vacaciones) grupo(v).vacaciones.push(v);
  for (const p of permisos) grupo(p).permisos.push(p);
  return [...grupos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export interface FiltrosUI {
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'TODAS';
  desde: string;
  hasta: string;
  employeeId: string;
  page: number;
  limit: number;
}

export const FILTROS_INICIALES: FiltrosUI = { estado: 'PENDIENTE', desde: '', hasta: '', employeeId: '', page: 1, limit: 25 };

/** Query string para GET /hr/requests/pending; omite lo vacío. */
export function paramsSolicitudes(f: FiltrosUI): Record<string, string | number> {
  const p: Record<string, string | number> = { estado: f.estado, page: f.page, limit: f.limit };
  if (f.desde) p.desde = f.desde;
  if (f.hasta) p.hasta = f.hasta;
  if (f.employeeId) p.employeeId = f.employeeId;
  return p;
}

/** Páginas totales: el backend pagina vacaciones y permisos por separado, así que manda la lista más larga. */
export function totalPaginas(totalVacaciones: number, totalPermisos: number, limit: number): number {
  return Math.max(1, Math.ceil(Math.max(totalVacaciones, totalPermisos) / Math.max(1, limit)));
}

/** Fecha de calendario sin corrimiento de zona horaria (las columnas `date` llegan como medianoche UTC o con offset). */
export function fechaCorta(v?: string): string {
  if (!v) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return '—';
  return `${m[3]}/${m[2]}/${m[1]}`;
}
