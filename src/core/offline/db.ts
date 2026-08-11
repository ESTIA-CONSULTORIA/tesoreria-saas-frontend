import Dexie, { type Table } from 'dexie';
import { getDeviceId, getDeviceIdFragment } from '../device/deviceId';

// Fase C1: caché local de datos de REFERENCIA (categorías, productos, áreas) — no
// transaccionales, solo lectura — para que el POS pueda seguir operando sin red.
//
// Fase C2: cola de ESCRITURAS pendientes de sincronizar (turnos, ventas, retiros,
// depósitos, precorte). Solo encola y bloquea localmente lo que ya sabemos que rompería
// el orden (cierre de turno con ventas sin sincronizar).
//
// Fase D: el motor de sincronización (src/core/offline/syncEngine.ts) que realmente
// reintenta contra el backend, en orden, propagando ids/folios locales por los reales.

export interface CachedRecord {
  id: string;
  data: any; // el objeto tal cual vino del servidor, sin transformar
  updatedAt: number; // Date.now() de cuándo se guardó esta copia local
}

export type PendingOperationType = 'OPEN_SHIFT' | 'CLOSE_SHIFT' | 'SALE' | 'WITHDRAWAL' | 'DEPOSIT' | 'PRECUT';
export type PendingOperationStatus = 'pending' | 'synced' | 'failed';

export interface PendingOperation {
  id?: number; // PK autoincremental de Dexie
  type: PendingOperationType;
  payload: any; // el body completo que se le iba a mandar al backend (incluye shiftId
                 // cuando el endpoint real lo lleva en la URL, ej. WITHDRAWAL/PRECUT/CLOSE_SHIFT,
                 // para que Fase D sepa a qué turno pertenece sin tener que adivinar)
  clientTimestamp: string; // hora real del evento (Fase A)
  deviceId: string; // identidad estable del dispositivo (Fase A)
  sequenceNumber: number; // monotónico local — orden de sincronización para Fase D
  status: PendingOperationStatus;
  attempts: number;
}

class OfflineDb extends Dexie {
  categories!: Table<CachedRecord, string>;
  products!: Table<CachedRecord, string>;
  areas!: Table<CachedRecord, string>;
  pendingOperations!: Table<PendingOperation, number>;

  constructor() {
    super('estia-pos-offline');
    this.version(1).stores({
      categories: 'id',
      products: 'id',
      areas: 'id',
    });
    // Aditivo: no toca las tablas de C1, solo agrega pendingOperations.
    this.version(2).stores({
      categories: 'id',
      products: 'id',
      areas: 'id',
      pendingOperations: '++id, status, type, sequenceNumber',
    });
  }
}

export const offlineDb = new OfflineDb();

/** Reemplaza el contenido completo de una tabla local con datos frescos del servidor. */
export async function replaceLocalCache(table: Table<CachedRecord, string>, items: any[]) {
  const now = Date.now();
  const rows: CachedRecord[] = items
    .filter((item) => item?.id)
    .map((item) => ({ id: item.id, data: item, updatedAt: now }));
  await offlineDb.transaction('rw', table, async () => {
    await table.clear();
    await table.bulkAdd(rows);
  });
}

/** Lee lo guardado localmente para una tabla, tal cual vino del servidor la última vez. */
export async function readLocalCache(table: Table<CachedRecord, string>): Promise<any[]> {
  const rows = await table.toArray();
  return rows.map((r) => r.data);
}

/**
 * Distingue "falló por red/timeout" de cualquier otro error (403 de permisos, 500,
 * validación, etc.) — mismo criterio que ya usa el interceptor de api.ts (!error.response
 * cuando la petición nunca llegó a tener respuesta real del servidor). Un timeout
 * (ECONNABORTED) también cae aquí: sin respuesta es sin respuesta, el resultado práctico
 * para el cajero debe ser el mismo que estar sin conexión — usar la copia local.
 */
export function isNetworkOrTimeoutError(error: any): boolean {
  return !error?.response;
}

// ── Fase C2: cola de escrituras ──────────────────────────────────────────────────

async function getNextSequenceNumber(): Promise<number> {
  const last = await offlineDb.pendingOperations.orderBy('sequenceNumber').last();
  return (last?.sequenceNumber ?? 0) + 1;
}

/** Encola una operación de escritura para sincronizar después. clientTimestamp debe
 * ser el mismo ISO string ya usado en el payload/respuesta optimista de quien llama. */
export async function enqueueOperation(
  type: PendingOperationType,
  payload: any,
  clientTimestamp: string,
): Promise<PendingOperation> {
  const sequenceNumber = await getNextSequenceNumber();
  const op: PendingOperation = {
    type,
    payload,
    clientTimestamp,
    deviceId: getDeviceId(),
    sequenceNumber,
    status: 'pending',
    attempts: 0,
  };
  const id = await offlineDb.pendingOperations.add(op);
  return { ...op, id };
}

/** Ventas pendientes (status='pending') de un turno específico. turnoId vive dentro de
 * payload (no hay columna dedicada) — se deriva ahí para no ampliar el esquema. */
export async function getPendingSalesForShift(shiftId: string): Promise<PendingOperation[]> {
  const pending = await offlineDb.pendingOperations.where('status').equals('pending').toArray();
  return pending.filter((op) => op.type === 'SALE' && op.payload?.turnoId === shiftId);
}

export async function countPendingOperations(): Promise<number> {
  return offlineDb.pendingOperations.where('status').equals('pending').count();
}

export async function countFailedOperations(): Promise<number> {
  return offlineDb.pendingOperations.where('status').equals('failed').count();
}

/** El id de turno (local o real) al que pertenece una operación, sin importar el tipo:
 * OPEN_SHIFT se identifica por el localId que ella misma generó; el resto, por
 * shiftId/turnoId dentro de su payload. Usado tanto para propagar el reemplazo de id
 * como para encontrar dependientes cuando algo se rechaza de verdad. */
export function getOperationShiftKey(op: PendingOperation): string | undefined {
  if (op.type === 'OPEN_SHIFT') return op.payload?.localId;
  if (op.type === 'SALE') return op.payload?.turnoId;
  return op.payload?.shiftId;
}

/** Operaciones pendientes (de cualquier tipo) que referencian un id de turno dado —
 * ya sea local (para propagar el reemplazo tras un OPEN_SHIFT exitoso) o real (para
 * encontrar dependientes al marcar una cadena como fallida). */
export async function findPendingOpsReferencingShift(shiftId: string): Promise<PendingOperation[]> {
  const pending = await offlineDb.pendingOperations.where('status').equals('pending').toArray();
  return pending.filter((op) => {
    if (op.type === 'OPEN_SHIFT') return false; // una OPEN_SHIFT no "referencia" un turno, lo origina
    return op.type === 'SALE' ? op.payload?.turnoId === shiftId : op.payload?.shiftId === shiftId;
  });
}

/** Reemplaza un id/folio local por el real en todas las operaciones pendientes que lo
 * referencien (shiftId o turnoId según el tipo) — se llama tras sincronizar con éxito
 * la OPEN_SHIFT que originó ese id local. */
export async function propagateShiftIdReplacement(localShiftId: string, realShiftId: string): Promise<void> {
  const referencing = await findPendingOpsReferencingShift(localShiftId);
  for (const op of referencing) {
    const payload = { ...op.payload };
    if (op.type === 'SALE') payload.turnoId = realShiftId;
    else payload.shiftId = realShiftId;
    await offlineDb.pendingOperations.update(op.id!, { payload });
  }
}

export async function markOperationSynced(id: number, updatedPayload?: any): Promise<void> {
  const changes: Partial<PendingOperation> = { status: 'synced' };
  if (updatedPayload) changes.payload = updatedPayload;
  await offlineDb.pendingOperations.update(id, changes);
}

export async function markOperationFailed(id: number): Promise<void> {
  await offlineDb.pendingOperations.update(id, { status: 'failed' });
}

export async function incrementOperationAttempts(id: number, attempts: number): Promise<void> {
  await offlineDb.pendingOperations.update(id, { attempts: attempts + 1 });
}

/** Operaciones pendientes, en el orden estricto en que deben sincronizarse. */
export async function getPendingOperationsInOrder(): Promise<PendingOperation[]> {
  return offlineDb.pendingOperations.where('status').equals('pending').sortBy('sequenceNumber');
}

/** ID local temporal para algo creado offline (turno, venta) — Fase D lo reconoce por
 * este prefijo para saber que debe reemplazarlo por el id real una vez sincronizado. */
export function generateLocalId(): string {
  return `local-${crypto.randomUUID()}`;
}

/** Folio de una venta creada offline — mismo formato acordado en Fase A:
 * VTA-{YYYYMMDD}-{fragmento de dispositivo}-{sufijo aleatorio}. La fecha usa
 * clientTimestamp (hora real del evento), no la fecha de sincronización. */
export function generateOfflineSaleFolio(clientTimestamp: string): string {
  const yyyymmdd = new Date(clientTimestamp).toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => (b % 36).toString(36))
    .join('')
    .toUpperCase();
  return `VTA-${yyyymmdd}-${getDeviceIdFragment()}-${randomSuffix}`;
}
