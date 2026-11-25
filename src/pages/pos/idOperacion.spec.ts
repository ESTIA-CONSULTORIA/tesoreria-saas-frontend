import { describe, expect, it } from 'vitest';
import { claveEnUso, nuevaIdOperacion } from './idOperacion';

describe('idOperacion de caja', () => {
  it('cumple el formato que acepta el servidor (8–80 letras, números, guion o guion bajo)', () => {
    for (let i = 0; i < 20; i++) expect(nuevaIdOperacion()).toMatch(/^[A-Za-z0-9_-]{8,80}$/);
  });
  it('dos claves nuevas son distintas', () => {
    expect(nuevaIdOperacion()).not.toBe(nuevaIdOperacion());
  });
  it('mientras haya una clave en uso se reutiliza (doble clic y reintentos); sin clave se crea una', () => {
    const k = claveEnUso(null);
    expect(claveEnUso(k)).toBe(k);
    expect(k).toMatch(/^[A-Za-z0-9_-]{8,80}$/);
  });
});
