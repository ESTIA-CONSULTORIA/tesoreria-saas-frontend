import { describe, it, expect } from 'vitest';
import { agruparEmpresas } from './empresasPorNegocio';

const negocios = [{ id: 'n1', tradeName: 'Gimnasio Demo' }, { id: 'n2', tradeName: 'Grupo Empresarial Demo' }];

describe('agruparEmpresas (selector Empresa / Sucursal)', () => {
  it('SOPORTE sin negocio: agrupa por negocio con el nombre del negocio como encabezado (nunca ids)', () => {
    const g = agruparEmpresas([
      { id: 'e1', tradeName: 'Gimnasio Demo', tenantId: 'n1' },
      { id: 'e2', tradeName: 'El Sazón', tenantId: 'n2' },
      { id: 'e3', tradeName: 'Servicios Demo', tenantId: 'n2' },
    ], negocios, true);
    expect(g.map((x) => x.encabezado)).toEqual(['Gimnasio Demo', 'Grupo Empresarial Demo']);
    expect(g[1].filas.map((f) => f.etiqueta)).toEqual(['El Sazón', 'Servicios Demo']);
    expect(g[1].filas[0].tooltip).toContain('Negocio: Grupo Empresarial Demo');
  });

  it('dos empresas con el mismo nombre en negocios distintos: quedan en grupos distintos, cada una distinguible por su encabezado', () => {
    const g = agruparEmpresas([
      { id: 'a', tradeName: 'Matriz', tenantId: 'n1' },
      { id: 'b', tradeName: 'Matriz', tenantId: 'n2' },
    ], negocios, true);
    expect(g).toHaveLength(2);
    expect(g.map((x) => x.encabezado)).toEqual(['Gimnasio Demo', 'Grupo Empresarial Demo']);
    expect(g.every((x) => x.filas[0].etiqueta === 'Matriz')).toBe(true);
  });

  it('dos empresas con el mismo nombre DENTRO del mismo negocio: se numeran para poder distinguirlas', () => {
    const g = agruparEmpresas([
      { id: 'a', tradeName: 'Gimnasio Demo', legalName: 'Gimnasio Demo', tenantId: 'n1' },
      { id: 'b', tradeName: 'Gimnasio Demo', legalName: 'Gimnasio Demo SA', tenantId: 'n1' },
    ], negocios, true);
    expect(g[0].filas.map((f) => f.etiqueta)).toEqual(['Gimnasio Demo (1 de 2)', 'Gimnasio Demo (2 de 2)']);
    expect(g[0].filas[1].tooltip).toContain('Gimnasio Demo SA');
  });

  it('un solo negocio / negocio elegido: lista plana sin encabezado, como siempre', () => {
    const g = agruparEmpresas([{ id: 'a', tradeName: 'Norte', tenantId: 'n1' }, { id: 'b', legalName: 'Sur SA', tenantId: 'n1' }], negocios, false);
    expect(g).toHaveLength(1);
    expect(g[0].encabezado).toBeNull();
    expect(g[0].filas.map((f) => f.etiqueta)).toEqual(['Norte', 'Sur SA']);
  });

  it('sin empresas: lista vacía (la pantalla dice «Sin empresas»); sin nombre: texto claro, nunca vacío', () => {
    expect(agruparEmpresas([], negocios, true)).toEqual([]);
    expect(agruparEmpresas([{ id: 'x', tenantId: 'n1' }], negocios, false)[0].filas[0].etiqueta).toBe('Empresa sin nombre');
  });

  it('una empresa de un negocio que no se pudo leer cae en «Negocio sin nombre», sin romper', () => {
    expect(agruparEmpresas([{ id: 'x', tradeName: 'Huérfana', tenantId: 'zzz' }], negocios, true)[0].encabezado).toBe('Negocio sin nombre');
  });
});
