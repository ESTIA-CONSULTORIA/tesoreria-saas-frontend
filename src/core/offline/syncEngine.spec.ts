import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// El motor de sincronización contra una IndexedDB de mentira (fake-indexeddb) y un backend simulado. Se prueba lo que toca
// dinero: una venta que el servidor ya tiene NO se marca como fallida, y una rechazada de verdad guarda su motivo.
const post = vi.fn();
const put = vi.fn();
vi.mock('../api/api', () => ({ api: { post: (...a: unknown[]) => post(...a), put: (...a: unknown[]) => put(...a) } }));

// Entorno de navegador mínimo (el spec corre en Node).
const memoria = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => void memoria.set(k, v),
  removeItem: (k: string) => void memoria.delete(k),
  clear: () => memoria.clear(),
  key: () => null,
  length: 0,
} as Storage;
(globalThis as unknown as { window: EventTarget }).window = new EventTarget();

import { offlineDb, enqueueOperation, getFailedSaleOperations, markOperationResolved } from './db';
import { runSync } from './syncEngine';

const venta = (folio: string) => ({
  items: [{ productoId: 'p1', cantidad: 2, precioUnitario: 50, descuento: 0, subtotal: 100 }],
  total: 116, formasPago: [{ forma: 'EFECTIVO', monto: 116 }], cajero: 'c1', turnoId: 'turno-real', sucursalId: 's1', folio,
  clientTimestamp: '2026-10-05T12:00:00.000Z',
});
const rechazo = (status: number, data: Record<string, unknown>) => Object.assign(new Error('rechazo'), { response: { status, data } });
const estados = async () => (await offlineDb.pendingOperations.toArray()).map((o) => [o.payload.folio, o.status]);

describe('syncEngine — ventas', () => {
  beforeEach(async () => {
    post.mockReset();
    put.mockReset();
    await offlineDb.pendingOperations.clear();
  });

  it('un reenvío que el servidor acepta queda sincronizada', async () => {
    await enqueueOperation('SALE', venta('F-1'), '2026-10-05T12:00:00.000Z');
    post.mockResolvedValueOnce({ data: { id: 'v1' } });
    await runSync();
    expect(await estados()).toEqual([['F-1', 'synced']]);
  });

  it('400 "ya existe" (el primer envío sí llegó): queda SINCRONIZADA, no fallida, y no se reintenta', async () => {
    await enqueueOperation('SALE', venta('F-2'), '2026-10-05T12:00:00.000Z');
    post.mockRejectedValueOnce(rechazo(400, { message: "El folio 'F-2' ya existe, no se pudo registrar la venta.", code: 'FOLIO_DUPLICADO', mismoRegistro: true }));
    await runSync();
    expect(await estados()).toEqual([['F-2', 'synced']]);
    expect(await getFailedSaleOperations()).toHaveLength(0);
    await runSync();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('también con un backend que solo manda el texto "ya existe" (sin código)', async () => {
    await enqueueOperation('SALE', venta('F-3'), '2026-10-05T12:00:00.000Z');
    post.mockRejectedValueOnce(rechazo(400, { message: "El folio 'F-3' ya existe, no se pudo registrar la venta." }));
    await runSync();
    expect(await estados()).toEqual([['F-3', 'synced']]);
  });

  it('si el servidor dice que ese folio es de OTRA venta (mismoRegistro false), se queda FALLIDA para revisarla', async () => {
    await enqueueOperation('SALE', venta('F-4'), '2026-10-05T12:00:00.000Z');
    post.mockRejectedValueOnce(rechazo(400, { message: "El folio 'F-4' ya existe, no se pudo registrar la venta.", code: 'FOLIO_DUPLICADO', mismoRegistro: false }));
    await runSync();
    expect(await estados()).toEqual([['F-4', 'failed']]);
  });

  it('un 400 de precio (el cobro ya no cubre) queda fallida CON el motivo real del servidor', async () => {
    await enqueueOperation('SALE', venta('F-5'), '2026-10-05T12:00:00.000Z');
    post.mockRejectedValueOnce(rechazo(400, { message: 'Las formas de pago (116) no cubren el total de la venta (139.2).' }));
    await runSync();
    const [op] = await getFailedSaleOperations();
    expect(op.payload.folio).toBe('F-5');
    expect(op.error).toBe('Las formas de pago (116) no cubren el total de la venta (139.2).');
    expect(op.failedAt).toBeTruthy();
  });

  it('"ya existe" en una operación que NO es venta (por ejemplo abrir turno) sigue siendo fallida', async () => {
    await enqueueOperation('OPEN_SHIFT', { localId: 'local-1', cajero: 'c1', sucursalId: 's1', fondoInicial: 0 }, '2026-10-05T12:00:00.000Z');
    post.mockRejectedValueOnce(rechazo(400, { message: 'Ya existe un turno abierto' }));
    await runSync();
    expect((await offlineDb.pendingOperations.toArray())[0].status).toBe('failed');
  });

  it('sin red: la venta sigue pendiente y se reintenta (no se marca nada)', async () => {
    await enqueueOperation('SALE', venta('F-6'), '2026-10-05T12:00:00.000Z');
    post.mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
    await runSync();
    expect(await estados()).toEqual([['F-6', 'pending']]);
  });

  it('el resto de la cola sigue después de una venta ya registrada', async () => {
    await enqueueOperation('SALE', venta('F-7'), '2026-10-05T12:00:00.000Z');
    await enqueueOperation('SALE', venta('F-8'), '2026-10-05T12:00:01.000Z');
    post.mockRejectedValueOnce(rechazo(400, { message: "El folio 'F-7' ya existe, no se pudo registrar la venta.", code: 'FOLIO_DUPLICADO', mismoRegistro: true }));
    post.mockResolvedValueOnce({ data: { id: 'v8' } });
    await runSync();
    expect(await estados()).toEqual([['F-7', 'synced'], ['F-8', 'synced']]);
  });

  it('una venta resuelta a mano (registrada o descartada) sale de la lista de fallidas y guarda quién la resolvió', async () => {
    const op = await enqueueOperation('SALE', venta('F-9'), '2026-10-05T12:00:00.000Z');
    post.mockRejectedValueOnce(rechazo(400, { message: 'no cubren el total' }));
    await runSync();
    expect(await getFailedSaleOperations()).toHaveLength(1);
    await markOperationResolved(op.id!, 'discarded', { tipo: 'DESCARTADA', por: 'gerente@x.com', motivo: 'duplicada a mano', at: '2026-10-06T10:00:00.000Z' });
    expect(await getFailedSaleOperations()).toHaveLength(0);
    const guardada = (await offlineDb.pendingOperations.toArray())[0];
    expect(guardada.status).toBe('discarded');
    expect(guardada.resolution).toMatchObject({ tipo: 'DESCARTADA', por: 'gerente@x.com' });
  });
});
