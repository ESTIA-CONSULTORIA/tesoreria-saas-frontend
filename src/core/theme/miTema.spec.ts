import { beforeEach, describe, expect, it, vi } from 'vitest';
import { elegirMiTema, elegirTemaEquipo, opcionesTema } from './miTema';
import { skinActual } from './aplicarSkin';

// Entorno node: se simulan localStorage y document (lo único que usa aplicarSkin), igual que aplicarSkin.spec.ts.
const memoria = new Map<string, string>();
const atributos = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => void memoria.set(k, String(v)),
  removeItem: (k: string) => void memoria.delete(k),
  clear: () => memoria.clear(),
};
(globalThis as unknown as { document: unknown }).document = {
  documentElement: { setAttribute: (k: string, v: string) => void atributos.set(k, v), getAttribute: (k: string) => atributos.get(k) ?? null, removeAttribute: (k: string) => void atributos.delete(k) },
  querySelector: () => null,
};
const sesion = (roleCode: string) => localStorage.setItem('user', JSON.stringify({ roleCode }));
const attr = () => document.documentElement.getAttribute('data-skin');

describe('opcionesTema: qué skins ofrece el selector del POS', () => {
  it.each(['CAJERO', 'RECEPCION', 'MESERO', 'CAPITAN', 'GERENTE'])('%s: 2 opciones (ESTIA y Oscuro)', (rol) => {
    expect(opcionesTema(rol)).toEqual(['estia', 'oscuro']);
  });
  it.each(['ADMIN', 'SOPORTE'])('%s: las 4', (rol) => {
    expect(opcionesTema(rol)).toHaveLength(4);
    expect(opcionesTema(rol)).toEqual(expect.arrayContaining(['estia', 'oscuro', 'claro', 'contraste']));
  });
  it('sin rol: solo las 2 de siempre', () => {
    expect(opcionesTema(null)).toEqual(['estia', 'oscuro']);
    expect(opcionesTema(undefined)).toHaveLength(2);
  });
});

describe('elegirMiTema: aplica al instante, guarda y revierte si falla', () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-skin'); });

  it('se aplica ANTES de que termine el guardado y se guarda lo elegido', async () => {
    sesion('CAJERO');
    let vistoAlGuardar: string | null = null;
    const guardar = vi.fn(async () => { vistoAlGuardar = attr(); });
    const r = await elegirMiTema('oscuro', '', 'CAJERO', guardar);
    expect(r.ok).toBe(true);
    expect(vistoAlGuardar).toBe('oscuro');
    expect(guardar).toHaveBeenCalledWith('oscuro');
    expect(attr()).toBe('oscuro');
  });

  it('si el guardado falla, vuelve al tema anterior y devuelve el mensaje del servidor', async () => {
    sesion('CAJERO');
    await elegirMiTema('estia', '', 'CAJERO', async () => {});
    await elegirMiTema('oscuro', 'estia', 'CAJERO', async () => {});
    expect(skinActual()).toBe('oscuro');
    const r = await elegirMiTema('estia', 'oscuro', 'CAJERO', async () => { throw { response: { data: { message: 'Sesión vencida' } } }; });
    expect(r).toEqual({ ok: false, mensaje: 'Sesión vencida' });
    expect(attr()).toBe('oscuro'); // revertido
  });

  it('si el guardado falla sin mensaje, usa uno genérico y revierte a «igual que el negocio» cuando no había previo', async () => {
    sesion('CAJERO');
    const r = await elegirMiTema('oscuro', '', 'CAJERO', async () => { throw new Error('red'); });
    expect(r.ok).toBe(false);
    expect(r.mensaje).toMatch(/No se pudo guardar/);
    expect(attr()).toBe('estia');
  });

  it('«Igual que el negocio» (vacío) guarda null', async () => {
    sesion('CAJERO');
    const guardar = vi.fn(async () => {});
    await elegirMiTema('', 'oscuro', 'CAJERO', guardar);
    expect(guardar).toHaveBeenCalledWith(null);
  });

  it('un CAJERO no puede elegir Claro ni Alto contraste: se rechaza sin aplicar ni guardar', async () => {
    sesion('CAJERO');
    for (const v of ['claro', 'contraste', 'inventada']) {
      const guardar = vi.fn(async () => {});
      const r = await elegirMiTema(v, '', 'CAJERO', guardar);
      expect(r.ok).toBe(false);
      expect(guardar).not.toHaveBeenCalled();
    }
    expect(attr()).toBeNull();
  });

  it('un ADMIN sí puede elegir Claro y Alto contraste', async () => {
    sesion('ADMIN');
    expect((await elegirMiTema('claro', '', 'ADMIN', async () => {})).ok).toBe(true);
    expect(attr()).toBe('claro');
    expect((await elegirMiTema('contraste', 'claro', 'ADMIN', async () => {})).ok).toBe(true);
    expect(attr()).toBe('contraste');
  });
});

describe('elegirTemaEquipo: solo en este navegador', () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-skin'); });
  it('aplica la del equipo, gana a la del usuario y vacío la quita', () => {
    sesion('CAJERO');
    localStorage.setItem('ui_skin_user', 'estia');
    expect(elegirTemaEquipo('oscuro', 'CAJERO').ok).toBe(true);
    expect(attr()).toBe('oscuro');
    expect(elegirTemaEquipo('', 'CAJERO').ok).toBe(true);
    expect(attr()).toBe('estia');
  });
  it('rechaza una skin que el rol no ve', () => {
    sesion('CAJERO');
    expect(elegirTemaEquipo('claro', 'CAJERO').ok).toBe(false);
    expect(attr()).toBeNull();
  });
});
