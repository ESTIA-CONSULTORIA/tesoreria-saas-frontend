import { describe, expect, it } from 'vitest';
import { esFormaTarjeta, motivoBloqueoCobro, motivoFaltaTarjeta, soloUltimos4, ultimos4Validos } from './tarjeta';

describe('tarjeta: últimos 4 dígitos', () => {
  it('las tres formas con tarjeta la exigen; efectivo, SPEI y cortesía no', () => {
    for (const f of ['DEBITO', 'CREDITO', 'TARJETA']) expect(esFormaTarjeta(f)).toBe(true);
    for (const f of ['EFECTIVO', 'TRANSFERENCIA', 'CORTESIA', '', null, undefined]) expect(esFormaTarjeta(f as any)).toBe(false);
  });

  it('solo números y como máximo 4', () => {
    expect(soloUltimos4('**** 1234')).toBe('1234');
    expect(soloUltimos4('12a3b45')).toBe('1234');
    expect(soloUltimos4('')).toBe('');
  });

  it('válido solo con exactamente 4 dígitos', () => {
    expect(ultimos4Validos('1234')).toBe(true);
    for (const m of ['123', '12345', 'abcd', '12 4', '', undefined, null]) expect(ultimos4Validos(m as any)).toBe(false);
  });

  it('motivo claro mientras faltan dígitos, null cuando están o no aplica', () => {
    expect(motivoFaltaTarjeta('DEBITO', '')).toMatch(/Captura los 4/);
    expect(motivoFaltaTarjeta('CREDITO', '12')).toBe('Faltan 2 dígitos de la tarjeta (llevas 2 de 4).');
    expect(motivoFaltaTarjeta('TARJETA', '123')).toBe('Faltan 1 dígito de la tarjeta (llevas 3 de 4).');
    expect(motivoFaltaTarjeta('DEBITO', '1234')).toBeNull();
    expect(motivoFaltaTarjeta('EFECTIVO', '')).toBeNull();
  });

  it('confirmar cobro: bloquea por tarjeta sin dígitos, por saldo pendiente y se habilita cuando todo cuadra', () => {
    const tarjetaSin = { pagado: 100, total: 100, pagos: [{ forma: 'DEBITO' }] };
    expect(motivoBloqueoCobro(tarjetaSin)).toMatch(/pago 1 \(DEBITO\).*4 últimos dígitos/);
    expect(motivoBloqueoCobro({ pagado: 40, total: 100, pagos: [{ forma: 'EFECTIVO' }], formaActiva: 'CREDITO', ultimos4Activo: '' })).toMatch(/Captura los 4/);
    expect(motivoBloqueoCobro({ pagado: 40, total: 100, pagos: [{ forma: 'EFECTIVO' }], formaActiva: 'EFECTIVO' })).toBe('Falta cubrir $60.00 del total.');
    expect(motivoBloqueoCobro({ pagado: 100, total: 100, pagos: [{ forma: 'DEBITO', ultimos4Digitos: '4242' }, { forma: 'EFECTIVO' }] })).toBeNull();
  });
});
