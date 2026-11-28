import { describe, expect, it } from 'vitest';
import { destinoCajero, rutaPermitidaCajero } from './accesoCajero';

describe('acceso del cajero: solo POS y portal del empleado', () => {
  it('deja pasar el POS y el portal', () => {
    for (const r of ['/pos', '/pos/', '/employee', '/employee/home', '/employee/sign/abc']) expect(destinoCajero(r)).toBeNull();
  });
  it('todo lo demás lo manda al POS con aviso en español', () => {
    for (const r of ['/users', '/hr', '/treasury', '/purchases', '/costs', '/reports', '/integrations', '/solutions', '/dashboard', '/settings', '/pos/cortes-x/..', '/posx']) {
      if (rutaPermitidaCajero(r)) continue; // «/pos/...» es del POS
      expect(destinoCajero(r)).toEqual({ a: '/pos', aviso: 'No tienes acceso a esa sección' });
    }
  });
  it('la raíz lo manda al POS sin aviso', () => {
    expect(destinoCajero('/')).toEqual({ a: '/pos', aviso: null });
  });
  it('un prefijo parecido no cuenta como POS', () => {
    expect(rutaPermitidaCajero('/posx')).toBe(false);
    expect(rutaPermitidaCajero('/employees')).toBe(false);
  });
});
