import { describe, expect, it } from 'vitest';
import { CLAVE_SESION_NIP, encabezadosSesionNip, esSesionNip, limpiarSesionNip, marcarSesionNip } from './sesionNip';

const almacen = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe('sesión por NIP de «Punto de Venta»', () => {
  it('sin marca no se agrega ningún encabezado (el ERP normal no cambia)', () => {
    const a = almacen();
    expect(esSesionNip(a)).toBe(false);
    expect(encabezadosSesionNip({}, a)).toEqual({});
  });

  it('con la marca se manda x-session-scope: pos-lite', () => {
    const a = almacen();
    marcarSesionNip(a);
    expect(a.getItem(CLAVE_SESION_NIP)).toBe('1');
    expect(encabezadosSesionNip({}, a)).toEqual({ 'x-session-scope': 'pos-lite' });
  });

  it('no pisa un ámbito ya puesto (p. ej. el de turnos/ventas del POS) ni un Bearer explícito', () => {
    const a = almacen();
    marcarSesionNip(a);
    expect(encabezadosSesionNip({ 'x-session-scope': 'executive' }, a)).toEqual({});
    expect(encabezadosSesionNip({ Authorization: 'Bearer x' }, a)).toEqual({});
  });

  it('al limpiar (login por correo, logout) deja de mandarse', () => {
    const a = almacen();
    marcarSesionNip(a);
    limpiarSesionNip(a);
    expect(esSesionNip(a)).toBe(false);
    expect(encabezadosSesionNip({}, a)).toEqual({});
  });

  it('un almacenamiento que lanza errores no rompe nada', () => {
    const roto = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
    expect(() => marcarSesionNip(roto)).not.toThrow();
    expect(() => limpiarSesionNip(roto)).not.toThrow();
    expect(esSesionNip(roto)).toBe(false);
  });
});
