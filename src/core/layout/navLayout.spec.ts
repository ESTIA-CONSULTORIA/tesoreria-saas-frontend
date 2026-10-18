import { describe, expect, it } from 'vitest';
import { repartirNav } from './navOverflow';
import { itemsConfiguracion, PATH_DATOS_FISCALES, rutaConfiguracion, veConfiguracion } from './navConfiguracion';

describe('barra principal: lo que no cabe va a «Más»', () => {
  // 10 módulos de ~100 px con separación de 4: ocupan 1036.
  const anchos = Array(10).fill(100);

  it('si todo cabe no hay menú «Más»', () => {
    expect(repartirNav(anchos, 1100, 60, 4)).toEqual({ visibles: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], enMas: [] });
    expect(repartirNav([], 500, 60, 4)).toEqual({ visibles: [], enMas: [] });
  });

  it('con 952 px (1366×768 medido) se queda lo que cabe junto al botón «Más»', () => {
    const r = repartirNav(anchos, 952, 60, 4);
    const usado = r.visibles.length * 100 + (r.visibles.length - 1) * 4 + 4 + 60;
    expect(usado).toBeLessThanOrEqual(952);
    expect(r.visibles).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(r.enMas).toEqual([8, 9]);
  });

  it('visibles y «Más» juntos son todos los módulos, sin repetir, en orden', () => {
    const r = repartirNav(anchos, 500, 60, 4);
    expect([...r.visibles, ...r.enMas].sort((a, b) => a - b)).toEqual(anchos.map((_, i) => i));
    expect(r.visibles).toEqual([...r.visibles].sort((a, b) => a - b));
  });

  it('el módulo de la página actual nunca se esconde en «Más»', () => {
    const r = repartirNav(anchos, 500, 60, 4, 9);
    expect(r.visibles).toContain(9);
    expect(r.enMas).not.toContain(9);
    const usado = r.visibles.length * 100 + (r.visibles.length - 1) * 4 + 4 + 60;
    expect(usado).toBeLessThanOrEqual(500);
  });

  it('con una barra mínima queda al menos el módulo actual', () => {
    expect(repartirNav(anchos, 120, 60, 4, 3).visibles).toEqual([3]);
  });

  it('anchos distintos: respeta el orden de prioridad', () => {
    const r = repartirNav([200, 50, 50, 50], 280, 60, 4);
    expect(r.visibles).toEqual([0]); // 200 cabe; con el 50 siguiente (254 + 64 de «Más») ya no
    expect(r.enMas).toEqual([1, 2, 3]);
  });
});

describe('Configuración: Datos fiscales para ADMIN y GERENTE con el mismo recorrido', () => {
  it('el ADMIN ve todo, con Datos fiscales dentro', () => {
    const labels = itemsConfiguracion('ADMIN').map((i) => i.label);
    expect(labels).toEqual(['Usuarios', 'General', 'Config. Login', 'Apariencia', 'Campos del Corte', 'Datos fiscales']);
    expect(rutaConfiguracion('ADMIN')).toBe('/settings');
  });

  it('el GERENTE ve únicamente Datos fiscales y el botón «Configuración» lo lleva ahí', () => {
    expect(itemsConfiguracion('GERENTE').map((i) => i.path)).toEqual([PATH_DATOS_FISCALES]);
    expect(rutaConfiguracion('GERENTE')).toBe(PATH_DATOS_FISCALES);
    expect(veConfiguracion('GERENTE')).toBe(true);
  });

  it('ambos recorren Configuración → Datos fiscales', () => {
    for (const rol of ['ADMIN', 'GERENTE']) {
      expect(itemsConfiguracion(rol).some((i) => i.label === 'Datos fiscales' && i.path === PATH_DATOS_FISCALES)).toBe(true);
    }
  });

  it('otros roles no ven el módulo', () => {
    for (const rol of ['CAJERO', 'RECEPCION', 'CONTADOR', undefined]) {
      expect(veConfiguracion(rol)).toBe(false);
      expect(itemsConfiguracion(rol)).toEqual([]);
    }
  });

  it('ya no hay un elemento «Configuración» dentro de Configuración', () => {
    expect(itemsConfiguracion('ADMIN').map((i) => i.label)).not.toContain('Configuración');
  });
});
