import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZONA_NEGOCIO, fechaDeVenta, fechaYmd, fijarZonaNegocio, formatoDiaYmd, hoyYmd, sumarDiasYmd, ymdDe } from './tiempo';
import { generateOfflineSaleFolio } from '../offline/db';

// Caso real: venta del 27/11/2026 a las 20:12 hora de Mexicali (UTC−8) = 28/11/2026 04:12 UTC. Antes el folio y el historial decían el 28.
describe('días en la zona del negocio (no en UTC)', () => {
  const venta = '2026-11-28T04:12:00Z';
  afterEach(() => { vi.useRealTimers(); fijarZonaNegocio('America/Tijuana'); });

  it('la zona por defecto es America/Tijuana', () => {
    expect(ZONA_NEGOCIO).toBe('America/Tijuana');
  });

  it('una venta entre las 16:00 y las 23:59 locales lleva la fecha del mismo día', () => {
    expect(fechaYmd(venta)).toBe('2026-11-27');
    expect(fechaYmd('2026-11-28T00:00:00Z')).toBe('2026-11-27'); // 16:00 locales
    expect(fechaYmd('2026-11-28T07:59:59Z')).toBe('2026-11-27'); // 23:59:59 locales
    expect(fechaYmd('2026-11-28T08:00:00Z')).toBe('2026-11-28'); // medianoche local
  });

  it('«hoy» a las 20:12 locales es el 27, aunque en UTC ya sea el 28', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(venta));
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-11-28'); // lo que se hacía antes
    expect(hoyYmd()).toBe('2026-11-27');
  });

  it('el folio de una venta offline lleva el día local del evento', () => {
    expect(generateOfflineSaleFolio(venta)).toMatch(/^VTA-20261127-/);
  });

  it('la fecha del historial sale del instante real (en la zona del negocio); si no hay, del día guardado', () => {
    expect(fechaDeVenta({ createdAt: venta, fecha: '2026-11-28' })).toBe('27/11/2026 20:12'); // dato viejo con fecha UTC
    expect(fechaDeVenta({ fecha: '2026-11-27' })).toBe('27/11/2026');
    expect(formatoDiaYmd('2026-11-27')).toBe('27/11/2026');
  });

  it('otra zona (Ciudad de México, UTC−6): la misma venta es del 27 a las 22:12', () => {
    fijarZonaNegocio('America/Mexico_City');
    expect(fechaYmd(venta)).toBe('2026-11-27');
    expect(fechaDeVenta({ createdAt: venta })).toBe('27/11/2026 22:12');
    fijarZonaNegocio('Marte/Olympus'); // zona desconocida: se queda la anterior
    expect(fechaYmd(venta)).toBe('2026-11-27');
  });

  it('aritmética de días calendario sin pasar por UTC', () => {
    expect(sumarDiasYmd('2026-12-31', 30)).toBe('2027-01-30');
    expect(sumarDiasYmd('2026-03-01', -1)).toBe('2026-02-28');
    expect(ymdDe(2026, 11, 31)).toBe('2026-12-31');
    expect(ymdDe(2026, 2, 0)).toBe('2026-02-28'); // día 0 = último del mes anterior
  });
});
