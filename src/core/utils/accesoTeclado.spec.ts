import { describe, expect, it, vi } from 'vitest';
import { activarConTeclado } from './accesoTeclado';

const evento = (key: string, mismo = true) => {
  const el = {};
  return { key, target: mismo ? el : {}, currentTarget: el, preventDefault: vi.fn() } as never;
};

describe('activarConTeclado', () => {
  it('entra en el orden de Tab y se anuncia como botón', () => {
    const p = activarConTeclado(() => {});
    expect(p.role).toBe('button');
    expect(p.tabIndex).toBe(0);
  });
  it('Enter y Espacio activan; otras teclas no', () => {
    const fn = vi.fn();
    const p = activarConTeclado(fn);
    p.onKeyDown(evento('Enter'));
    p.onKeyDown(evento(' '));
    p.onKeyDown(evento('a'));
    p.onKeyDown(evento('Tab'));
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('no activa si la tecla viene de un elemento interno (un campo dentro de la fila)', () => {
    const fn = vi.fn();
    activarConTeclado(fn).onKeyDown(evento('Enter', false));
    expect(fn).not.toHaveBeenCalled();
  });
});
