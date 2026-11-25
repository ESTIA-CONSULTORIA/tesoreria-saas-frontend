// Clave única de una operación de caja (retiro o depósito) para que el servidor no la registre dos veces: un doble clic, un reintento tras un
// corte de red o el reenvío de la cola sin conexión llevan LA MISMA clave. Se genera una vez al intentar y se conserva hasta que la operación
// se registra (o se cierra la ventana). Formato aceptado por el servidor: 8 a 80 letras, números, guion o guion bajo.
export function nuevaIdOperacion(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Devuelve la clave en uso, creándola si aún no hay una. */
export function claveEnUso(actual: string | null): string {
  return actual ?? nuevaIdOperacion();
}
