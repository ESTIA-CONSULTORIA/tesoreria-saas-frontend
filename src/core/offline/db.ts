import Dexie, { type Table } from 'dexie';

// Fase C1: caché local de datos de REFERENCIA (categorías, productos, áreas) — no
// transaccionales, solo lectura — para que el POS pueda seguir operando sin red. La
// cola de escrituras (ventas, turnos) es una pieza aparte, no vive aquí.

export interface CachedRecord {
  id: string;
  data: any; // el objeto tal cual vino del servidor, sin transformar
  updatedAt: number; // Date.now() de cuándo se guardó esta copia local
}

class OfflineDb extends Dexie {
  categories!: Table<CachedRecord, string>;
  products!: Table<CachedRecord, string>;
  areas!: Table<CachedRecord, string>;

  constructor() {
    super('estia-pos-offline');
    this.version(1).stores({
      categories: 'id',
      products: 'id',
      areas: 'id',
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
