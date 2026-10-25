import { describe, expect, it } from 'vitest';
import { FILTROS_INICIALES, agruparPorEmpleado, fechaCorta, nombreSolicitud, paramsSolicitudes, totalPaginas } from './solicitudes.utils';

const emps = [{ id: 'e1', nombre: 'María', apellidos: 'García', puesto: 'Cajera' }];

describe('nombreSolicitud', () => {
  it('prefiere el nombre del backend', () => {
    expect(nombreSolicitud({ id: 's', employeeId: 'e1', employeeNombre: 'Ana Ruiz' }, emps)).toBe('Ana Ruiz');
  });
  it('si el backend no lo trae, lo toma de la lista de empleados', () => {
    expect(nombreSolicitud({ id: 's', employeeId: 'e1' }, emps)).toBe('María García');
  });
  it('si no está en ningún lado, nunca muestra el UUID completo', () => {
    const t = nombreSolicitud({ id: 's', employeeId: '11ca2253-f024-40d8-a723-6878d6144fe9' }, []);
    expect(t).toBe('Empleado 11ca2253…');
    expect(t).not.toContain('f024');
  });
});

describe('agruparPorEmpleado', () => {
  it('62 permisos de una persona son un solo grupo; ordena por nombre', () => {
    const permisos = Array.from({ length: 62 }, (_, i) => ({ id: `p${i}`, employeeId: 'e1', employeeNombre: 'María García', employeePuesto: 'Cajera' }));
    const vac = [{ id: 'v1', employeeId: 'e2', employeeNombre: 'Ana Ruiz' }];
    const g = agruparPorEmpleado(vac, permisos, []);
    expect(g.map((x) => x.nombre)).toEqual(['Ana Ruiz', 'María García']);
    expect(g[1].permisos).toHaveLength(62);
    expect(g[1].puesto).toBe('Cajera');
    expect(g[0].vacaciones).toHaveLength(1);
  });
  it('una persona con vacaciones y permisos queda en un grupo', () => {
    const g = agruparPorEmpleado([{ id: 'v', employeeId: 'e1' }], [{ id: 'p', employeeId: 'e1' }], emps);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ nombre: 'María García', puesto: 'Cajera' });
  });
});

describe('paramsSolicitudes / totalPaginas / fechaCorta', () => {
  it('por defecto pide pendientes, página 1 de 25, sin campos vacíos', () => {
    expect(paramsSolicitudes(FILTROS_INICIALES)).toEqual({ estado: 'PENDIENTE', page: 1, limit: 25 });
  });
  it('incluye solo los filtros llenos', () => {
    expect(paramsSolicitudes({ ...FILTROS_INICIALES, estado: 'TODAS', desde: '2026-10-01', employeeId: 'e1', page: 2 }))
      .toEqual({ estado: 'TODAS', desde: '2026-10-01', employeeId: 'e1', page: 2, limit: 25 });
  });
  it('páginas: manda la lista más larga y mínimo 1', () => {
    expect(totalPaginas(2, 62, 25)).toBe(3);
    expect(totalPaginas(0, 0, 25)).toBe(1);
    expect(totalPaginas(25, 1, 25)).toBe(1);
    expect(totalPaginas(26, 1, 25)).toBe(2);
  });
  it('fechaCorta no corre el día por zona horaria', () => {
    expect(fechaCorta('2026-06-19T07:00:00.000Z')).toBe('19/06/2026');
    expect(fechaCorta('2024-12-15T08:00:00.000Z')).toBe('15/12/2024');
    expect(fechaCorta(undefined)).toBe('—');
  });
});
