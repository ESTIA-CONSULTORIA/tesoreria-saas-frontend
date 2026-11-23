import { describe, it, expect } from 'vitest';
import { etiquetaContexto, mismoNombre } from './etiquetaContexto';

const matriz = { name: 'Matriz' };

describe('mismoNombre', () => {
  it('ignora mayúsculas, acentos y espacios repetidos', () => {
    expect(mismoNombre('RIOVA DENTAL', 'Riova  Dental ')).toBe(true);
    expect(mismoNombre('Cafetería Ñandú', 'cafeteria nandu')).toBe(true);
  });
  it('nombres distintos o vacíos no coinciden', () => {
    expect(mismoNombre('RIOVA DENTAL', 'RIOVA DENTAL 2')).toBe(false);
    expect(mismoNombre('', '')).toBe(false);
    expect(mismoNombre(null, 'x')).toBe(false);
  });
});

describe('etiquetaContexto', () => {
  it('empresa con el mismo nombre que el negocio y única: solo la sucursal, etiqueta «Sucursal»', () => {
    const r = etiquetaContexto({ negocioNombre: 'RIOVA DENTAL', empresa: { name: 'RIOVA DENTAL' }, sucursal: matriz, totalEmpresas: 1 });
    expect(r).toEqual({ etiqueta: 'Sucursal', texto: 'Matriz', activo: true });
  });
  it('lo mismo sin sucursal elegida: «Todas las sucursales»', () => {
    const r = etiquetaContexto({ negocioNombre: 'RIOVA DENTAL', empresa: { name: 'riova dental' }, sucursal: null, totalEmpresas: 1 });
    expect(r.etiqueta).toBe('Sucursal');
    expect(r.texto).toBe('Todas las sucursales');
  });
  it('negocio con varias empresas: «Empresa — Sucursal», aunque una se llame como el negocio', () => {
    const r = etiquetaContexto({ negocioNombre: 'RIOVA DENTAL', empresa: { name: 'RIOVA DENTAL' }, sucursal: matriz, totalEmpresas: 3 });
    expect(r).toEqual({ etiqueta: 'Empresa / Sucursal', texto: 'RIOVA DENTAL — Matriz', activo: true });
  });
  it('empresa con nombre distinto al del negocio: forma completa', () => {
    const r = etiquetaContexto({ negocioNombre: 'RIOVA DENTAL', empresa: { name: 'Clínica Norte SA' }, sucursal: matriz, totalEmpresas: 1 });
    expect(r.texto).toBe('Clínica Norte SA — Matriz');
    expect(r.etiqueta).toBe('Empresa / Sucursal');
  });
  it('mientras no se sabe cuántas empresas hay (null) no se oculta nada', () => {
    const r = etiquetaContexto({ negocioNombre: 'RIOVA DENTAL', empresa: { name: 'RIOVA DENTAL' }, sucursal: matriz, totalEmpresas: null });
    expect(r.texto).toBe('RIOVA DENTAL — Matriz');
  });
  it('sin negocio elegido (ADMIN, GERENTE…) nunca se abrevia', () => {
    const r = etiquetaContexto({ negocioNombre: null, empresa: { name: 'RIOVA DENTAL' }, sucursal: matriz, totalEmpresas: 1 });
    expect(r.texto).toBe('RIOVA DENTAL — Matriz');
  });
  it('sin empresa: Vista Global, punto apagado', () => {
    expect(etiquetaContexto({ negocioNombre: 'X', empresa: null, sucursal: null, totalEmpresas: 1 })).toEqual({ etiqueta: 'Empresa / Sucursal', texto: 'Vista Global', activo: false });
  });
  it('solo empresa, sin sucursal, con nombre distinto: el nombre de la empresa', () => {
    expect(etiquetaContexto({ negocioNombre: 'A', empresa: { name: 'B' }, sucursal: null, totalEmpresas: 2 }).texto).toBe('B');
  });
});
