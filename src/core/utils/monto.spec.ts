import { describe, expect, it } from 'vitest';
import { esReintentable, normalizarMonto } from './monto';

describe('normalizarMonto (teclado físico, pegado y teclado en pantalla)', () => {
  it('deja dígitos y un punto con máximo 2 decimales', () => {
    expect(normalizarMonto('10.80')).toBe('10.80');
    expect(normalizarMonto('10.8')).toBe('10.8');
    expect(normalizarMonto('10.')).toBe('10.');
    expect(normalizarMonto('.5')).toBe('.5');
    expect(normalizarMonto('10.999')).toBe('10.99');
  });
  it('descarta letras, signos y puntos repetidos; la coma decimal vale como punto', () => {
    expect(normalizarMonto('1a0b.8c0')).toBe('10.80');
    expect(normalizarMonto('$ 1,250.50')).toBe('1.25');
    expect(normalizarMonto('1.2.3')).toBe('1.23');
    expect(normalizarMonto('-5')).toBe('5');
    expect(normalizarMonto('10,80')).toBe('10.80');
  });
  it('sin ceros a la izquierda y Backspace hasta vacío', () => {
    expect(normalizarMonto('007')).toBe('7');
    expect(normalizarMonto('0.5')).toBe('0.5');
    expect(normalizarMonto('0')).toBe('0');
    expect(normalizarMonto('')).toBe('');
  });
});

describe('esReintentable: solo red o 5xx', () => {
  const http = (status: number) => ({ response: { status } });
  it('red/timeout (sin respuesta) y 5xx sí', () => {
    expect(esReintentable(new Error('Network Error'))).toBe(true);
    for (const s of [500, 502, 503, 504]) expect(esReintentable(http(s))).toBe(true);
  });
  it('400, 401, 403, 404, 409 y 422 no', () => {
    for (const s of [400, 401, 403, 404, 409, 422]) expect(esReintentable(http(s))).toBe(false);
  });
});
