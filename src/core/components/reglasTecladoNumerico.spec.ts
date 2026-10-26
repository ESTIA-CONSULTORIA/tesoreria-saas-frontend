import { describe, expect, it } from 'vitest';
import { aplicarTeclaMonto, aplicarTeclaNip, filasTeclado, GLIFO_BORRAR, teclaDeEvento } from './reglasTecladoNumerico';

describe('disposición del teclado numérico', () => {
  it('7-8-9 arriba, 0 abajo y un solo glifo de borrar', () => {
    expect(filasTeclado(true)).toEqual([['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], ['.', '0', 'borrar']]);
    expect(GLIFO_BORRAR).toBe('⌫');
  });
  it('sin punto, la celda queda vacía y el 0 no se mueve', () => {
    expect(filasTeclado(false)[3]).toEqual(['', '0', 'borrar']);
  });
});

describe('teclado físico', () => {
  it('dígitos y Retroceso; el punto solo si el campo lo admite', () => {
    expect(teclaDeEvento('7', false)).toBe('7');
    expect(teclaDeEvento('Backspace', false)).toBe('borrar');
    expect(teclaDeEvento('.', true)).toBe('.');
    expect(teclaDeEvento(',', true)).toBe('.');
    expect(teclaDeEvento('.', false)).toBeNull();
    expect(teclaDeEvento('F4', true)).toBeNull();
    expect(teclaDeEvento('Enter', true)).toBeNull();
  });
});

describe('montos', () => {
  it('un punto, 2 decimales, sin ceros a la izquierda', () => {
    expect(aplicarTeclaMonto('', '5')).toBe('5');
    expect(aplicarTeclaMonto('', '.')).toBe('0.');
    expect(aplicarTeclaMonto('1.5', '.')).toBe('1.5');
    expect(aplicarTeclaMonto('1.55', '9')).toBe('1.55');
    expect(aplicarTeclaMonto('0', '7')).toBe('7');
    expect(aplicarTeclaMonto('12', 'borrar')).toBe('1');
    expect(aplicarTeclaMonto('', 'borrar')).toBe('');
  });
});

describe('NIP', () => {
  it('solo dígitos, longitud fija y borrar', () => {
    expect(aplicarTeclaNip('12', '3', 4)).toBe('123');
    expect(aplicarTeclaNip('1234', '5', 4)).toBe('1234');
    expect(aplicarTeclaNip('12', '.', 4)).toBe('12');
    expect(aplicarTeclaNip('12', 'borrar', 4)).toBe('1');
  });
});
