import { describe, expect, it } from 'vitest';
import { accionRegistrar, cobradoDelPayload, esDelTenant, motivoDescarteValido, motivoVisible, type EvaluacionVenta } from './ventasOfflineLogic';

const ev = (o: Partial<EvaluacionVenta> = {}): EvaluacionVenta => ({
  folio: 'F-1', valida: true, motivo: null, yaExiste: false, cobrado: 116, totalCliente: 116, totalNuevo: 116, diferencia: 0, cubre: true, items: [], ...o,
});

describe('accionRegistrar — nunca se acepta el precio del cliente', () => {
  it('el cobro cubre el total nuevo: se registra directo', () => {
    expect(accionRegistrar(ev())).toBe('registrar');
  });
  it('el cobro NO cubre: solo con la confirmación de la diferencia', () => {
    expect(accionRegistrar(ev({ totalNuevo: 139.2, diferencia: 23.2, cubre: false }))).toBe('confirmar');
  });
  it('sin evaluación o evaluación inválida (producto inexistente): no se puede registrar', () => {
    expect(accionRegistrar(null)).toBe('no_disponible');
    expect(accionRegistrar(ev({ valida: false, motivo: 'Producto no encontrado: x', totalNuevo: null, diferencia: null, cubre: false }))).toBe('no_disponible');
  });
  it('el servidor ya la tiene: no se registra otra vez', () => {
    expect(accionRegistrar(ev({ yaExiste: true }))).toBe('ya_registrada');
  });
});

describe('descarte con motivo obligatorio', () => {
  it('vacío, solo espacios o muy corto no vale', () => {
    for (const m of ['', '   ', 'no', ' abc ']) expect(motivoDescarteValido(m)).toBe(false);
  });
  it('con motivo suficiente vale', () => {
    expect(motivoDescarteValido('Venta duplicada a mano')).toBe(true);
  });
});

describe('motivo y datos de la venta', () => {
  it('muestra el motivo real que guardó el motor; si no hay, lo deduce de la evaluación', () => {
    expect(motivoVisible({ error: 'no cubren el total', payload: {} }, ev())).toBe('no cubren el total');
    expect(motivoVisible({ payload: {} }, ev({ cubre: false, diferencia: 10 }))).toMatch(/no cubre el total/);
    expect(motivoVisible({ payload: {} }, ev({ valida: false, motivo: 'Producto no encontrado: x' }))).toBe('Producto no encontrado: x');
    expect(motivoVisible({ payload: {} }, null)).toMatch(/Sin motivo registrado/);
  });
  it('solo muestra las ventas del negocio de la sesión (la cola es del dispositivo)', () => {
    expect(esDelTenant({ payload: { tenantId: 't1' } }, 't1')).toBe(true);
    expect(esDelTenant({ payload: { tenantId: 't2' } }, 't1')).toBe(false);
    expect(esDelTenant({ payload: {} }, 't1')).toBe(false);
    expect(esDelTenant({ payload: { tenantId: 't1' } }, null)).toBe(false);
  });
  it('lo cobrado sale de las formas de pago guardadas, ignorando montos inválidos', () => {
    expect(cobradoDelPayload({ formasPago: [{ monto: 100 }, { monto: 16.5 }, { monto: -5 }, { monto: NaN }] })).toBe(116.5);
    expect(cobradoDelPayload({})).toBe(0);
  });
});
