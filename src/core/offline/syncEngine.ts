import { api } from '../api/api';
import {
  offlineDb,
  isNetworkOrTimeoutError,
  getPendingOperationsInOrder,
  markOperationSynced,
  markOperationFailed,
  incrementOperationAttempts,
  propagateShiftIdReplacement,
  findPendingOpsReferencingShift,
  getOperationShiftKey,
  type PendingOperation,
} from './db';

// Fase D: motor de sincronización de la cola de escrituras (Fase C2). Corre en segundo
// plano, arrancado una sola vez a nivel de App.tsx — disparado por el evento 'online'
// del navegador y, como respaldo (el evento no siempre es confiable en tablets/
// celulares), un intervalo cada 30s mientras haya operaciones pendientes.

const SYNC_INTERVAL_MS = 30_000;
export const OFFLINE_SYNC_COMPLETED_EVENT = 'offline-sync-completed';

let syncing = false;
let started = false;
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let onlineHandler: (() => void) | null = null;

function buildRequest(op: PendingOperation): { method: 'post' | 'put'; url: string; body: any } {
  const { shiftId, localId, ...rest } = op.payload || {};
  switch (op.type) {
    case 'OPEN_SHIFT':
      return { method: 'post', url: '/pos/shifts', body: rest };
    case 'CLOSE_SHIFT':
      return { method: 'put', url: `/pos/shifts/${shiftId}/close`, body: rest };
    case 'WITHDRAWAL':
      return { method: 'post', url: `/pos/shifts/${shiftId}/withdrawal`, body: rest };
    case 'DEPOSIT':
      return { method: 'post', url: `/pos/shifts/${shiftId}/deposit`, body: rest };
    case 'PRECUT':
      return { method: 'post', url: `/pos/shifts/${shiftId}/precut`, body: rest };
    case 'SALE':
      return { method: 'post', url: '/pos/sales', body: op.payload };
  }
}

/**
 * Marca como 'failed' una operación rechazada de verdad por el servidor y, en cascada,
 * SOLO sus dependientes estructurales (decisión confirmada: dependencia estricta, no
 * "todo el turno"). Únicamente una OPEN_SHIFT rechazada arrastra a sus dependientes —
 * ese turno nunca va a tener un id real al cual apuntar. Cualquier otra operación
 * puntual (WITHDRAWAL/DEPOSIT/PRECUT/CLOSE_SHIFT/SALE) rechazada queda 'failed' sola;
 * el resto del turno sigue sincronizando normal.
 */
async function failChain(op: PendingOperation): Promise<void> {
  await markOperationFailed(op.id!);
  if (op.type === 'OPEN_SHIFT') {
    const localId = op.payload?.localId;
    if (localId) {
      const dependents = await findPendingOpsReferencingShift(localId);
      for (const dep of dependents) {
        await markOperationFailed(dep.id!);
      }
    }
  }
}

async function runSync(): Promise<void> {
  if (syncing) return;
  syncing = true;
  let syncedCount = 0;

  try {
    const queue = await getPendingOperationsInOrder();

    for (const op of queue) {
      // Releer el estado actual: una operación anterior en esta misma pasada (ej. su
      // OPEN_SHIFT) pudo haberla marcado 'failed' en cascada — no intentar algo ya descartado.
      const current = await offlineDb.pendingOperations.get(op.id!);
      if (!current || current.status !== 'pending') continue;

      // Si todavía referencia un id local, su OPEN_SHIFT no sincronizó en esta pasada
      // (por orden de sequenceNumber, a ella le tocaba antes) — se salta, se reintenta
      // en el siguiente ciclo. No debería ocurrir seguido: el orden ya lo previene.
      const shiftKey = getOperationShiftKey(current);
      if (current.type !== 'OPEN_SHIFT' && typeof shiftKey === 'string' && shiftKey.startsWith('local-')) {
        continue;
      }

      const { method, url, body } = buildRequest(current);

      try {
        const response = method === 'put' ? await api.put(url, body) : await api.post(url, body);

        if (current.type === 'OPEN_SHIFT') {
          const localId = current.payload?.localId;
          const realId = response.data?.id;
          if (localId && realId) {
            await propagateShiftIdReplacement(localId, realId);
          }
          await markOperationSynced(current.id!, { ...current.payload, syncedId: realId });
        } else {
          await markOperationSynced(current.id!);
        }
        syncedCount += 1;
      } catch (error) {
        if (isNetworkOrTimeoutError(error)) {
          await incrementOperationAttempts(current.id!, current.attempts);
          // Sin red: seguir con el resto de la cola no tiene sentido, probablemente
          // fallaría igual. Se detiene todo el ciclo; el intervalo/evento 'online' reintentan.
          break;
        }
        // Rechazo real del servidor (400/409/etc.) — no es de red, no se reintenta solo.
        console.error(`Fase D: operación rechazada por el servidor (tipo ${current.type}, id ${current.id}):`, error);
        await failChain(current);
      }
    }
  } finally {
    syncing = false;
    if (syncedCount > 0) {
      window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_COMPLETED_EVENT, { detail: { syncedCount } }));
    }
  }
}

/** Arranca el motor una sola vez para toda la vida de la app (llamado desde App.tsx) —
 * sigue sincronizando en segundo plano aunque el cajero navegue fuera de /pos. */
export function startSyncEngine(): void {
  if (started) return;
  started = true;
  onlineHandler = () => { runSync(); };
  window.addEventListener('online', onlineHandler);
  intervalHandle = setInterval(() => { runSync(); }, SYNC_INTERVAL_MS);
  runSync(); // intento inmediato al arrancar, por si ya hay pendientes y ya hay red
}

export function stopSyncEngine(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  if (onlineHandler) {
    window.removeEventListener('online', onlineHandler);
    onlineHandler = null;
  }
  started = false;
}
