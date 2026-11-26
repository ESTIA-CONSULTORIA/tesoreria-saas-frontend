import { describe, it, expect } from 'vitest';
import { puedeHacer } from './puedeHacer';

describe('puedeHacer (permisos efectivos en el frontend)', () => {
  const p = { pos: { ver: true, crear: false, editar: true, eliminar: false } };
  it('sin datos cargados no oculta nada; con datos, lo que diga la matriz', () => {
    expect(puedeHacer(null, 'pos', 'crear')).toBe(true);
    expect(puedeHacer(p, 'pos', 'ver')).toBe(true);
    expect(puedeHacer(p, 'pos', 'crear')).toBe(false);
    expect(puedeHacer(p, 'pos', 'eliminar')).toBe(false);
  });
  it('un módulo que la matriz no gobierna se deja pasar (el servidor decide)', () => {
    expect(puedeHacer(p, 'otro', 'crear')).toBe(true);
  });
});
