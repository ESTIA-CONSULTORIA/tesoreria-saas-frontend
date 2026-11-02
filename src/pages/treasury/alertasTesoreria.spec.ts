import { describe, expect, it } from 'vitest';
import { conteoTexto, dichoDias, diasDesde, filasDeAlertas, formatoMonto, resumenDeFilas, textoDias } from './alertasTesoreria';

const AHORA = new Date('2026-11-02T12:00:00Z');
const haceDias = (d: number) => new Date(AHORA.getTime() - d * 86_400_000).toISOString();

describe('días desde la alerta', () => {
  it('cuenta días completos y nunca baja de 0 (una fecha futura o de hoy es 0)', () => {
    expect(diasDesde(haceDias(12), AHORA)).toBe(12);
    expect(diasDesde(haceDias(0), AHORA)).toBe(0);
    expect(diasDesde('2026-11-03T12:00:00Z', AHORA)).toBe(0);
    expect(diasDesde(haceDias(1.9), AHORA)).toBe(1);
  });

  it('sin fecha o con fecha inválida devuelve null (no inventa una antigüedad)', () => {
    expect(diasDesde(null, AHORA)).toBeNull();
    expect(diasDesde(undefined, AHORA)).toBeNull();
    expect(diasDesde('no es fecha', AHORA)).toBeNull();
  });
});

describe('filas de alertas', () => {
  it('ordena de la más antigua a la más reciente y, a igual antigüedad, de mayor a menor monto; sin fecha al final', () => {
    const filas = filasDeAlertas(
      [
        { concept: 'Reciente', amount: 10, date: haceDias(2) },
        { concept: 'Sin fecha', amount: 999, date: null },
        { concept: 'Antigua chica', amount: 5, date: haceDias(40) },
        { concept: 'Antigua grande', amount: 500, date: haceDias(40) },
      ],
      AHORA,
    );
    expect(filas.map((f) => f.concepto)).toEqual(['Antigua grande', 'Antigua chica', 'Reciente', 'Sin fecha']);
  });

  it('tolera datos incompletos: concepto vacío, monto como texto, monto inválido, lista nula', () => {
    const filas = filasDeAlertas([{ concept: '  ', amount: '1234.5', date: haceDias(1) }, { concept: 'X', amount: 'abc', date: haceDias(1) }], AHORA);
    expect(filas.find((f) => f.concepto === 'Sin concepto')!.monto).toBe(1234.5);
    expect(filas.find((f) => f.concepto === 'X')!.monto).toBe(0);
    expect(filasDeAlertas(null, AHORA)).toEqual([]);
    expect(filasDeAlertas(undefined, AHORA)).toEqual([]);
    expect(filasDeAlertas('no es lista' as any, AHORA)).toEqual([]);
  });
});

describe('resumen, formato y textos', () => {
  it('el encabezado lleva conteo y total (el caso reportado: 10 facturas de $3,616 a $10,860)', () => {
    const montos = [3616, 4100.5, 4875.25, 5200, 5990.75, 6420, 7310.4, 8150, 9275.9, 10860];
    const filas = filasDeAlertas(montos.map((amount, i) => ({ concept: `F${i}`, amount, date: haceDias(i + 1) })), AHORA);
    const r = resumenDeFilas(filas);
    expect(r.cuenta).toBe(10);
    expect(r.total).toBeCloseTo(65798.8, 2);
    expect(formatoMonto(r.total)).toBe('$65,798.80');
    expect(resumenDeFilas([])).toEqual({ cuenta: 0, total: 0 });
  });

  it('formato de monto con separador de miles y dos decimales', () => {
    expect(formatoMonto(25000)).toBe('$25,000.00');
    expect(formatoMonto(3616)).toBe('$3,616.00');
    expect(formatoMonto(0)).toBe('$0.00');
  });

  it('días compactos para la vista y frase completa para lectores de pantalla (sin repetir «VENCIDO» en cada fila)', () => {
    expect(textoDias(12)).toBe('12 d');
    expect(textoDias(0)).toBe('hoy');
    expect(textoDias(null)).toBe('—');
    expect(dichoDias(12, 'vencida')).toBe('12 días de vencida');
    expect(dichoDias(1, 'pendiente')).toBe('1 día de pendiente');
    expect(dichoDias(0, 'vencida')).toBe('vencida desde hoy');
    expect(dichoDias(null, 'vencida')).toBe('Sin fecha');
  });

  it('conteo en singular y plural', () => {
    expect(conteoTexto(0, 'factura', 'facturas')).toBe('0 facturas');
    expect(conteoTexto(1, 'factura', 'facturas')).toBe('1 factura');
    expect(conteoTexto(10, 'factura', 'facturas')).toBe('10 facturas');
  });
});
