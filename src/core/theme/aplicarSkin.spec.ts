import { beforeEach, describe, expect, it } from 'vitest';
import { aplicarSkin, fijarSkinDispositivo, fijarSkinNegocio, fijarSkinUsuario, skinActual } from './aplicarSkin';

// Entorno node: se simulan localStorage y document (lo único que usa aplicarSkin), sin sumar jsdom como dependencia.
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

const sesion = (roleCode: string | null) => (roleCode ? localStorage.setItem('user', JSON.stringify({ roleCode })) : localStorage.removeItem('user'));
const attr = () => document.documentElement.getAttribute('data-skin');

describe('aplicarSkin: equipo → usuario → negocio, con el rol', () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-skin'); });

  it('sin nada guardado: ESTIA', () => {
    expect(aplicarSkin()).toBe('estia');
    expect(attr()).toBe('estia');
  });

  it('el usuario gana al negocio y el equipo gana al usuario', () => {
    sesion('CAJERO');
    fijarSkinNegocio('estia');
    expect(fijarSkinUsuario('oscuro')).toBe('oscuro');
    expect(attr()).toBe('oscuro');
    expect(fijarSkinDispositivo('estia')).toBe('estia');
    fijarSkinDispositivo(null);
    expect(skinActual()).toBe('oscuro');
    expect(fijarSkinUsuario(null)).toBe('estia'); // sin preferencia: vuelve a la del negocio
  });

  it('Claro y Alto contraste: ADMIN y SOPORTE sí, el resto no (aunque lo tengan guardado)', () => {
    for (const skin of ['claro', 'contraste']) {
      sesion('ADMIN'); expect(fijarSkinUsuario(skin)).toBe(skin);
      sesion('SOPORTE'); expect(aplicarSkin()).toBe(skin);
      sesion('CAJERO'); expect(aplicarSkin()).toBe('estia');
      sesion(null); expect(aplicarSkin()).toBe('estia');
    }
  });

  it('un negocio en Claro no se lo impone a un rol sin permiso, y theme = light nunca se vuelve Claro', () => {
    sesion('GERENTE'); fijarSkinNegocio('claro'); expect(attr()).toBe('estia');
    sesion('ADMIN'); fijarSkinNegocio('light'); expect(attr()).toBe('estia');
    fijarSkinNegocio('dark'); expect(attr()).toBe('estia');
  });
});
