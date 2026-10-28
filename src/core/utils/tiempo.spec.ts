import { describe, expect, it } from 'vitest';
import { aperturaDelTurno, cierreDelTurno, formatoDuracion, formatoFecha, formatoFechaHora, formatoHora } from './tiempo';

// Tijuana en octubre: UTC-7 (horario de verano); desde el 1 de noviembre, UTC-8.
describe('formato en hora de Tijuana', () => {
  it('la misma hora se ve igual sin importar la zona del navegador (se fija America/Tijuana)', () => {
    expect(formatoHora('2026-10-27T23:45:00.000Z')).toBe('16:45');
    expect(formatoHora('2026-10-28T00:10:00.000Z')).toBe('17:10');
    expect(formatoHora('2026-10-27T23:45:18.000Z', true)).toBe('16:45:18');
  });
  it('fecha y fecha con hora usan el día de Tijuana, no el de UTC', () => {
    expect(formatoFecha('2026-10-28T02:00:00.000Z')).toBe('27/10/2026'); // ya es 28 en UTC, pero en Tijuana son las 19:00 del 27
    expect(formatoFechaHora('2026-10-28T02:00:00.000Z')).toBe('27/10/2026 19:00');
  });
  it('cambio de horario: después del 1 de noviembre es UTC-8', () => {
    expect(formatoHora('2026-11-02T23:45:00.000Z')).toBe('15:45');
  });
  it('sin dato o dato inválido: vacío (nunca «Invalid Date»)', () => {
    for (const v of [null, undefined, '', 'basura']) expect(formatoHora(v)).toBe('');
    expect(formatoFechaHora('basura')).toBe('');
  });
});

describe('abrir 23:45 UTC y cerrar 00:10 UTC', () => {
  const turno = { fecha: '2026-10-27', horaApertura: '23:45:18', horaCierre: '00:10:02', abiertoEn: '2026-10-27T23:45:18.000Z', cerradoEn: '2026-10-28T00:10:02.000Z' };
  it('con abiertoEn/cerradoEn: apertura 16:45 y cierre 17:10, en orden, y dura 25 min', () => {
    expect(formatoHora(aperturaDelTurno(turno))).toBe('16:45');
    expect(formatoHora(cierreDelTurno(turno))).toBe('17:10');
    expect(cierreDelTurno(turno)!.getTime()).toBeGreaterThan(aperturaDelTurno(turno)!.getTime());
    expect(formatoDuracion(aperturaDelTurno(turno), cierreDelTurno(turno))).toBe('25 min');
  });
  it('un turno de la tarde en hora local (16:45–16:53 de Tijuana) dura 8 min aunque cruce la medianoche UTC', () => {
    const t = { abiertoEn: '2026-10-27T23:45:00.000Z', cerradoEn: '2026-10-27T23:53:00.000Z' };
    expect(formatoHora(aperturaDelTurno(t))).toBe('16:45');
    expect(formatoHora(cierreDelTurno(t))).toBe('16:53');
    expect(formatoDuracion(aperturaDelTurno(t), cierreDelTurno(t))).toBe('8 min');
  });
  it('turno viejo sin abiertoEn/cerradoEn: se reconstruye de fecha + hora (UTC) y el cierre que cruzó la medianoche suma un día', () => {
    const viejo = { fecha: '2026-10-27', horaApertura: '23:45:18', horaCierre: '00:10:02' };
    expect(formatoHora(aperturaDelTurno(viejo))).toBe('16:45');
    expect(formatoHora(cierreDelTurno(viejo))).toBe('17:10');
    expect(formatoDuracion(aperturaDelTurno(viejo), cierreDelTurno(viejo))).toBe('25 min'); // 23:45:18 → 00:10:02 (24 min 44 s, redondeado)
  });
  it('turno abierto: sin cierre', () => {
    expect(cierreDelTurno({ fecha: '2026-10-27', horaApertura: '23:45:18', horaCierre: null })).toBeNull();
    expect(formatoHora(cierreDelTurno({ abiertoEn: '2026-10-27T23:45:18.000Z', cerradoEn: null }))).toBe('');
  });
});

describe('formatoDuracion', () => {
  it('minutos y horas', () => {
    expect(formatoDuracion('2026-10-27T20:00:00Z', '2026-10-27T20:00:00Z')).toBe('0 min');
    expect(formatoDuracion('2026-10-27T20:00:00Z', '2026-10-27T21:05:00Z')).toBe('1 h 05 min');
    expect(formatoDuracion('2026-10-27T20:00:00Z', '2026-10-28T04:00:00Z')).toBe('8 h 00 min');
  });
  it('orden imposible o dato faltante: vacío', () => {
    expect(formatoDuracion('2026-10-27T21:00:00Z', '2026-10-27T20:00:00Z')).toBe('');
    expect(formatoDuracion(null, '2026-10-27T20:00:00Z')).toBe('');
  });
});
