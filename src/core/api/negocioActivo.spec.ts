import { describe, expect, it } from 'vitest';
import {
  CLAVE_NEGOCIO_ID,
  CLAVE_NEGOCIO_NOMBRE,
  guardarNegocioActivo,
  leerNegocioActivo,
  limpiarNegocioActivo,
  parametrosConNegocio,
} from './negocioActivo';

const almacen = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe('negocio activo de SOPORTE', () => {
  it('sin negocio elegido no se agrega ningún parámetro (el ERP normal no cambia)', () => {
    expect(leerNegocioActivo(almacen())).toBeNull();
    expect(parametrosConNegocio('/treasury/alerts', undefined, null)).toBeUndefined();
    expect(parametrosConNegocio('/treasury/alerts', { a: 1 }, null)).toEqual({ a: 1 });
  });

  it('se guarda, se lee y se limpia (cierre de sesión)', () => {
    const a = almacen();
    guardarNegocioActivo(a, { id: 'n-1', nombre: 'Gimnasio Demo' });
    expect(a.getItem(CLAVE_NEGOCIO_ID)).toBe('n-1');
    expect(a.getItem(CLAVE_NEGOCIO_NOMBRE)).toBe('Gimnasio Demo');
    expect(leerNegocioActivo(a)).toEqual({ id: 'n-1', nombre: 'Gimnasio Demo' });
    limpiarNegocioActivo(a);
    expect(leerNegocioActivo(a)).toBeNull();
    guardarNegocioActivo(a, null); // elegir «sin negocio» también limpia
    expect(a.getItem(CLAVE_NEGOCIO_ID)).toBeNull();
  });

  it('agrega ?tenantId= a las peticiones del ERP, con o sin otros parámetros', () => {
    expect(parametrosConNegocio('/treasury/alerts', undefined, 'n-1')).toEqual({ tenantId: 'n-1' });
    expect(parametrosConNegocio('/hr/employees', { companyId: 'c' }, 'n-1')).toEqual({ companyId: 'c', tenantId: 'n-1' });
    expect(parametrosConNegocio('/api/v1/purchases/orders', {}, 'n-1')).toEqual({ tenantId: 'n-1' });
    expect(parametrosConNegocio('https://api.estiaconsultoria.com/api/v1/pos/sales', undefined, 'n-1')).toEqual({ tenantId: 'n-1' });
  });

  it('no pisa un tenantId explícito de la pantalla (incluido el vacío de «todos» en Usuarios) ni duplica el de la URL', () => {
    expect(parametrosConNegocio('/users', { tenantId: '' }, 'n-1')).toEqual({ tenantId: '' });
    expect(parametrosConNegocio('/users', { tenantId: 'otro' }, 'n-1')).toEqual({ tenantId: 'otro' });
    expect(parametrosConNegocio('/branches?tenantId=x', undefined, 'n-1')).toBeUndefined();
  });

  it('no toca las rutas de sesión, el catálogo de negocios ni la administración de la plataforma', () => {
    for (const ruta of ['/auth/me', '/auth/login', '/tenants', '/tenants/abc', '/administration/audit-logs', '/api/v1/auth/refresh']) {
      expect(parametrosConNegocio(ruta, undefined, 'n-1')).toBeUndefined();
    }
    // pero una ruta que solo EMPIEZA parecido sí lleva negocio
    expect(parametrosConNegocio('/tenant-settings/x', undefined, 'n-1')).toEqual({ tenantId: 'n-1' });
    expect(parametrosConNegocio('/authorizations', undefined, 'n-1')).toEqual({ tenantId: 'n-1' });
  });
});
