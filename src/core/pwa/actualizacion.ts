// Lógica del botón "Actualizar" del aviso de versión nueva (UpdatePrompt).
//
// Causa del defecto: con registerType 'prompt', el worker nuevo queda en "waiting". updateServiceWorker(true) le manda
// SKIP_WAITING y espera el evento `controlling` para recargar; sin `clientsClaim` el worker nuevo se activa pero NO toma
// el control de la pestaña, `controlling` nunca llega y la página no se recarga (el botón "no hace nada"). Se corrige en
// vite.config.ts (clientsClaim) y, por si el evento no llega (navegador raro, worker ya activado), con recarga de respaldo.

export interface PendientesOffline {
  pendientes: number;
  fallidas: number;
}

/** Texto de confirmación cuando hay ventas/operaciones sin sincronizar; null si no hay nada que advertir. */
export function avisoPendientes({ pendientes, fallidas }: PendientesOffline): string | null {
  if (pendientes <= 0 && fallidas <= 0) return null;
  const partes: string[] = [];
  if (pendientes > 0) partes.push(`${pendientes} operación(es) offline pendiente(s) de sincronizar`);
  if (fallidas > 0) partes.push(`${fallidas} con error de sincronización`);
  return (
    `Hay ${partes.join(' y ')}. Quedan guardadas en este dispositivo y se enviarán al servidor cuando haya conexión; ` +
    `no se pierden al actualizar. ¿Actualizar y recargar ahora?`
  );
}

export interface DepsActualizar {
  contarPendientes: () => Promise<PendientesOffline>;
  confirmar: (mensaje: string) => boolean;
  /** updateServiceWorker(true) del hook: activa el worker en espera y recarga al tomar control. */
  activarWorker: () => Promise<void> | void;
  recargar: () => void;
  /** Espera de respaldo antes de forzar la recarga si el worker no la provocó. */
  esperaRespaldoMs?: number;
  programar?: (fn: () => void, ms: number) => unknown;
}

export type ResultadoActualizar = 'cancelado' | 'actualizando';

/** Avisa si hay pendientes (y respeta "cancelar"), activa el worker nuevo y garantiza la recarga. */
export async function aplicarActualizacion(d: DepsActualizar): Promise<ResultadoActualizar> {
  let pend: PendientesOffline = { pendientes: 0, fallidas: 0 };
  try {
    pend = await d.contarPendientes();
  } catch {
    // Si no se puede leer la cola no bloqueamos la actualización: IndexedDB persiste tras la recarga.
  }
  const msg = avisoPendientes(pend);
  if (msg && !d.confirmar(msg)) return 'cancelado';

  const programar = d.programar ?? ((fn, ms) => setTimeout(fn, ms));
  // El respaldo se programa ANTES: si activarWorker recarga la página, el temporizador muere con ella.
  programar(d.recargar, d.esperaRespaldoMs ?? 3000);
  try {
    await d.activarWorker();
  } catch {
    d.recargar();
  }
  return 'actualizando';
}
