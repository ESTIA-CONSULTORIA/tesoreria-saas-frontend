import { describe, expect, it } from 'vitest';
import { descuentoPedidoPct, firmaTicket, ticketRequiereAutorizacion, topeDescuento } from './reglasAutorizacion';

const linea = (productoId: string, cantidad: number, descuento = 0, precioUnitario = 50) => ({ productoId, cantidad, descuento, precioUnitario });

describe('límite de descuento por rol (espejo del servidor)', () => {
  it('cajero 10 %, capitán 20 %, recepción 10 %; gerente, administrador y desconocidos sin límite en el cliente', () => {
    expect(topeDescuento('CAJERO')).toBe(10);
    expect(topeDescuento('CAPITAN')).toBe(20);
    expect(topeDescuento('RECEPCION')).toBe(10);
    expect(topeDescuento('GERENTE')).toBe(Infinity);
    expect(topeDescuento('ADMIN')).toBe(Infinity);
    expect(topeDescuento(undefined)).toBe(Infinity);
  });
});

describe('firma del ticket (liga la autorización a sus líneas)', () => {
  it('cambia si cambia una cantidad, un descuento o un producto; no si cambia el precio o el nombre', () => {
    const base = firmaTicket([linea('a', 2, 15), linea('b', 1)]);
    expect(firmaTicket([linea('a', 3, 15), linea('b', 1)])).not.toBe(base);
    expect(firmaTicket([linea('a', 2, 20), linea('b', 1)])).not.toBe(base);
    expect(firmaTicket([linea('a', 2, 15)])).not.toBe(base);
    expect(firmaTicket([linea('a', 2, 15, 999), linea('b', 1)])).toBe(base);
  });
  it('redondea el descuento a centésimas, igual que el servidor', () => {
    expect(firmaTicket([linea('a', 1, 12.3456)])).toBe(firmaTicket([linea('a', 1, 12.35)]));
  });
});

describe('descuento pedido', () => {
  it('porcentaje: el mismo valor; monto fijo: el mayor % que produce sobre los ítems elegidos', () => {
    expect(descuentoPedidoPct('percentage', 15, [linea('a', 2)])).toBe(15);
    expect(descuentoPedidoPct('fixed', 10, [linea('a', 2, 0, 50)])).toBe(10);
    expect(descuentoPedidoPct('fixed', 10, [linea('a', 2, 0, 50), linea('b', 1, 0, 20)])).toBe(50);
  });
  it('sin valor o sin ítems: 0', () => {
    expect(descuentoPedidoPct('percentage', 0, [linea('a', 1)])).toBe(0);
    expect(descuentoPedidoPct('percentage', 10, [])).toBe(0);
  });
});

describe('cuándo hace falta la autorización de un gerente', () => {
  const items10 = [linea('a', 1, 10)];
  it('un gerente o administrador no la necesita (autoriza con su sesión)', () => {
    expect(ticketRequiereAutorizacion({ puedeCortesia: true, hayFormaCortesia: true, items: [linea('a', 1, 100)], rol: 'GERENTE' })).toBe(false);
  });
  it('un cajero con descuento dentro de su límite no la necesita; por encima, sí', () => {
    expect(ticketRequiereAutorizacion({ puedeCortesia: false, hayFormaCortesia: false, items: items10, rol: 'CAJERO' })).toBe(false);
    expect(ticketRequiereAutorizacion({ puedeCortesia: false, hayFormaCortesia: false, items: [linea('a', 1, 10.01)], rol: 'CAJERO' })).toBe(true);
    expect(ticketRequiereAutorizacion({ puedeCortesia: false, hayFormaCortesia: false, items: [linea('a', 1, 15)], rol: 'CAPITAN' })).toBe(false);
  });
  it('una cortesía (100 % o forma CORTESIA) de un cajero siempre la necesita', () => {
    expect(ticketRequiereAutorizacion({ puedeCortesia: false, hayFormaCortesia: false, items: [linea('a', 1, 100)], rol: 'CAJERO' })).toBe(true);
    expect(ticketRequiereAutorizacion({ puedeCortesia: false, hayFormaCortesia: true, items: items10, rol: 'CAJERO' })).toBe(true);
  });
});
