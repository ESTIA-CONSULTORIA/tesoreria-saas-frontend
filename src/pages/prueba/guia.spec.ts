import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  GIROS_CON_GUIA, detallePaso, esAutomatico, esProgresoNegocio, hechosGuia, pasoActualGuia, pasoHecho, pasosDeGiro, resumenEjemplo, textoVacio,
  type ProgresoNegocio,
} from './guia';
import { GIROS_FORM } from './pruebaLogic';

const vacio: ProgresoNegocio = { categorias: 0, productos: 0, usuarios: 1, turnos: 0, turnosCerrados: 0, ventas: 0, puedeCargarEjemplo: true };
const ids = (g: string | null | undefined) => pasosDeGiro(g).map((p) => p.id);

describe('wizard por giro', () => {
  it('cada giro tiene su recorrido; los que no tienen pasos propios usan el genérico', () => {
    expect(ids('gimnasio')).toEqual(['categoria', 'productos', 'planes', 'usuarios', 'turno', 'venta', 'membresia', 'checkin', 'corte', 'banco']);
    expect(ids('restaurante')).toEqual(['categoria', 'productos', 'insumos', 'recetas', 'usuarios', 'turno', 'mesa', 'venta', 'corte', 'compra', 'banco']);
    expect(ids('retail')).toEqual(['categoria', 'productos', 'existencias', 'usuarios', 'turno', 'venta', 'corte', 'compra', 'banco']);
    expect(ids('generico')).toEqual(['categoria', 'productos', 'usuarios', 'turno', 'venta', 'corte', 'banco']);
    for (const g of ['medico_dental', 'inventado', '', null, undefined]) expect(ids(g)).toEqual(ids('generico'));
  });

  it('todo giro del formulario tiene guía; todos cubren categoría, productos, usuarios, turno, venta y corte (en ese orden)', () => {
    for (const g of GIROS_FORM) expect(GIROS_CON_GUIA.includes(g.valor)).toBe(true);
    for (const g of GIROS_CON_GUIA) {
      const orden = ids(g).filter((i) => ['categoria', 'productos', 'usuarios', 'turno', 'venta', 'corte'].includes(i));
      expect(orden).toEqual(['categoria', 'productos', 'usuarios', 'turno', 'venta', 'corte']);
    }
  });

  it('los pasos salen de la tabla giro → módulos: costos (insumos, recetas, existencias) y compras solo en restaurante y tienda; banco (tesorería) en todos', () => {
    for (const g of ['gimnasio', 'generico']) for (const p of ['insumos', 'recetas', 'existencias', 'compra']) expect(ids(g)).not.toContain(p);
    for (const g of GIROS_CON_GUIA) expect(ids(g)).toContain('banco');
    expect(ids('retail')).not.toContain('recetas');
    // si el servidor entregara menos módulos que la tabla, la guía los omite
    expect(pasosDeGiro('restaurante', { modulos: ['pos', 'tesoreria'] }).map((p) => p.id)).not.toContain('insumos');
    expect(pasosDeGiro('restaurante', { modulos: ['pos'] }).map((p) => p.id)).not.toContain('banco');
  });

  it('membresías y check-in solo en el gimnasio; mesas solo en el restaurante', () => {
    for (const g of ['restaurante', 'retail', 'generico']) for (const p of ['planes', 'membresia', 'checkin']) expect(ids(g)).not.toContain(p);
    for (const g of ['gimnasio', 'retail', 'generico']) expect(ids(g)).not.toContain('mesa');
  });

  it('cada paso tiene título, detalle, ruta del ERP y acceso directo; sin IDs repetidos', () => {
    const rutas = ['/pos', '/users', '/roles', '/costs', '/membresias', '/mesas', '/cocina', '/purchases', '/suppliers', '/banks', '/treasury'];
    for (const g of GIROS_CON_GUIA) {
      const pasos = pasosDeGiro(g);
      expect(new Set(pasos.map((p) => p.id)).size).toBe(pasos.length);
      for (const p of pasos) {
        expect(p.titulo.length).toBeGreaterThan(5);
        expect(p.detalle.length).toBeGreaterThan(20);
        expect(rutas).toContain(p.ruta);
        expect(p.accesos.length).toBeGreaterThan(0);
        for (const a of p.accesos) expect(rutas).toContain(a.ruta);
      }
    }
  });

  it('usuarios: nombra los roles del giro y el tope de 5', () => {
    const rol = (g: string) => pasosDeGiro(g).find((p) => p.id === 'usuarios')!.detalle;
    expect(rol('gimnasio')).toMatch(/RECEPCION/);
    expect(rol('restaurante')).toMatch(/MESERO/);
    expect(rol('retail')).toMatch(/CAJERO/);
    for (const g of GIROS_CON_GUIA) expect(rol(g)).toMatch(/hasta 5 usuarios/);
  });
});

describe('avance real y estados vacíos', () => {
  const pasos = pasosDeGiro('retail');
  const por = (id: string) => pasos.find((p) => p.id === id)!;

  it('negocio vacío: ningún paso automático está hecho y cada uno explica qué falta', () => {
    expect(hechosGuia(pasos, {}, vacio)).toBe(0);
    for (const id of ['categoria', 'productos', 'usuarios', 'turno', 'venta', 'corte']) {
      expect(esAutomatico(por(id))).toBe(true);
      expect(textoVacio(por(id), vacio)).toMatch(/\S{3,}/);
    }
  });

  it('los pasos se marcan solos con el avance real y el estado vacío desaparece', () => {
    const r: ProgresoNegocio = { categorias: 2, productos: 7, usuarios: 3, turnos: 1, turnosCerrados: 0, ventas: 1, puedeCargarEjemplo: false };
    expect(pasoHecho(por('categoria'), {}, r)).toBe(true);
    expect(pasoHecho(por('productos'), {}, r)).toBe(true);
    expect(pasoHecho(por('usuarios'), {}, r)).toBe(true);
    expect(pasoHecho(por('turno'), {}, r)).toBe(true);
    expect(pasoHecho(por('venta'), {}, r)).toBe(true);
    expect(pasoHecho(por('corte'), {}, r)).toBe(false); // sin turno cerrado
    expect(textoVacio(por('productos'), r)).toBeNull();
    expect(textoVacio(por('corte'), r)).toMatch(/cierra el turno/);
    expect(hechosGuia(pasos, {}, r)).toBe(5);
    expect(pasoActualGuia(pasos, {}, r)).toBe(pasos.findIndex((p) => p.id === 'existencias')); // el primer paso pendiente: «existencias» (manual) de la tienda
  });

  it('«usuarios» exige más que el propio ADMIN', () => {
    expect(pasoHecho(por('usuarios'), {}, { ...vacio, usuarios: 1 })).toBe(false);
    expect(pasoHecho(por('usuarios'), {}, { ...vacio, usuarios: 2 })).toBe(true);
  });

  it('sin avance real (no ADMIN o sin red) vale lo marcado a mano; los pasos manuales nunca son automáticos', () => {
    expect(pasoHecho(por('productos'), {}, null)).toBe(false);
    expect(pasoHecho(por('productos'), { productos: true }, null)).toBe(true);
    expect(textoVacio(por('productos'), null)).toBeNull();
    const g = pasosDeGiro('gimnasio');
    for (const id of ['planes', 'membresia', 'checkin']) expect(esAutomatico(g.find((p) => p.id === id)!)).toBe(false);
    expect(hechosGuia(g, { planes: true, checkin: true }, null)).toBe(2);
  });

  it('el paso actual es el primer pendiente', () => {
    expect(pasoActualGuia(pasos, {}, vacio)).toBe(0);
    expect(pasoActualGuia(pasos, { categoria: true, productos: true }, vacio)).toBe(2);
  });

  it('valida la respuesta del servidor antes de usarla', () => {
    expect(esProgresoNegocio(vacio)).toBe(true);
    for (const mal of [null, {}, { ...vacio, productos: '1' }, { ...vacio, ventas: -1 }, { ...vacio, puedeCargarEjemplo: 'si' }]) expect(esProgresoNegocio(mal)).toBe(false);
  });
});

describe('datos de ejemplo y NIP', () => {
  it('ninguna guía trae un NIP fijo; el check-in muestra el NIP solo si se conoce en esta pestaña', () => {
    const checkin = pasosDeGiro('gimnasio').find((p) => p.id === 'checkin')!;
    expect(pasosDeGiro('gimnasio').map((p) => p.detalle).join(' ')).not.toContain('4321');
    expect(detallePaso(checkin, null)).not.toMatch(/\b\d{4}\b/);
    expect(detallePaso(checkin, { numero: '1', nip: '7391' })).toBe('En Check-in escribe el n.º de socio 1 o su NIP 7391: debe salir en verde.');
    for (const p of pasosDeGiro('gimnasio').filter((x) => x.id !== 'checkin')) expect(detallePaso(p, { numero: '1', nip: '7391' })).toBe(p.detalle);
  });
  it('resumen de lo sembrado', () => {
    expect(resumenEjemplo({ categorias: 3, productos: 7 })).toBe('Listo: cargamos 3 categorías, 7 productos.');
    expect(resumenEjemplo({ categorias: 2, productos: 5, planes: 2, socios: 1 })).toBe('Listo: cargamos 2 categorías, 5 productos, 2 planes de membresía, 1 socio de ejemplo.');
  });
});

describe('el componente de la guía', () => {
  const src = readFileSync(resolve(__dirname, 'PruebaWizard.tsx'), 'utf8');
  it('usa el avance real (solo ADMIN), el botón opcional de ejemplo y las teclas 1–9', () => {
    expect(src).toContain("'/prueba/progreso'");
    expect(src).toContain("'/prueba/datos-ejemplo'");
    expect(src).toContain('Cargar datos de ejemplo');
    expect(src).toContain('[1-9]');
    expect(src).toMatch(/esAdmin/);
  });
});
