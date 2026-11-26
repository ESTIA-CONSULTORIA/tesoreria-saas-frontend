import { describe, it, expect } from 'vitest';
import { agrupar, conCambio, cuerpoGuardar, cantidadCambios, estaTodoMarcado, moduloCompleto, valorActual, type Celda } from './matrizLogic';

const celda = (defecto: Partial<Celda['defecto']>, efectivo?: Partial<Celda['defecto']>): Celda => {
  const d = { ver: false, crear: false, editar: false, eliminar: false, ...defecto };
  return { defecto: d, efectivo: { ...d, ...(efectivo ?? {}) }, modificado: !!efectivo };
};

describe('matriz de permisos: lógica', () => {
  it('quitar «Ver» apaga crear, editar y eliminar; activar «Crear» enciende «Ver»', () => {
    const c = celda({ ver: true, crear: true, editar: true, eliminar: true });
    expect(conCambio(c, undefined, 'ver', false)).toEqual({ ver: false, crear: false, editar: false, eliminar: false });
    const sinVer = celda({ ver: true, crear: true, editar: true, eliminar: true }, { ver: false, crear: false, editar: false, eliminar: false });
    expect(conCambio(sinVer, undefined, 'crear', true)).toEqual({ ver: true, crear: true });
  });
  it('no se puede dar más de lo que el rol ya podía (la casilla no disponible no cambia nada)', () => {
    const c = celda({ ver: true });
    expect(conCambio(c, undefined, 'eliminar', true)).toEqual({});
  });
  it('el cambio que vuelve al valor guardado desaparece de los pendientes', () => {
    const c = celda({ ver: true, crear: true });
    const b1 = conCambio(c, undefined, 'crear', false);
    expect(b1).toEqual({ crear: false });
    expect(conCambio(c, b1, 'crear', true)).toEqual({});
  });
  it('módulo completo marca solo lo disponible; desmarcar apaga todo', () => {
    const c = celda({ ver: true, crear: true });
    expect(estaTodoMarcado(c, c.efectivo)).toBe(true);
    expect(moduloCompleto(c, undefined, false)).toEqual({ ver: false, crear: false });
    const apagado = celda({ ver: true, crear: true }, { ver: false, crear: false });
    expect(moduloCompleto(apagado, undefined, true)).toEqual({ ver: true, crear: true });
  });
  it('cuerpo a guardar: un elemento por módulo cambiado con los 4 valores finales', () => {
    const celdas = { pos: celda({ ver: true, crear: true, editar: true }), rh: celda({ ver: true }) };
    const borrador = { pos: { crear: false }, rh: {} };
    expect(cantidadCambios(borrador)).toBe(1);
    expect(cuerpoGuardar(celdas, borrador)).toEqual([{ modulo: 'pos', ver: true, crear: false, editar: true, eliminar: false }]);
    expect(valorActual(celdas.pos, borrador.pos).crear).toBe(false);
  });
  it('agrupa por tema y deja los módulos desconocidos en «Otros»', () => {
    const g = agrupar([{ codigo: 'pos', nombre: 'Punto de venta', descripcion: '' }, { codigo: 'bancos', nombre: 'Bancos', descripcion: '' }, { codigo: 'nuevo', nombre: 'Nuevo', descripcion: '' }]);
    expect(g.map((x) => x.titulo)).toEqual(['Operación', 'Finanzas', 'Otros']);
  });
});
