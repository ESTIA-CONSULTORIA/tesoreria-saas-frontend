// Reglas del teclado del acceso ejecutivo. El PIN nuevo es de 6 a 12 dígitos (el backend lo exige al crearlo/editarlo), pero los
// PIN antiguos de 4 dígitos siguen entrando: por eso ya no se envía solo al llegar a 4 dígitos (se enviaría un PIN de 6 incompleto y
// se contaría como intento fallido); se envía con el botón «Entrar».
export const PIN_MIN_ENVIO = 4;
export const PIN_MAX = 12;
export const PIN_PUNTOS_MIN = 6;

/** Aplica una tecla ("0"-"9" o "del") al PIN actual. */
export function siguientePin(pin: string, tecla: string): string {
  if (tecla === "del") return pin.slice(0, -1);
  if (!/^[0-9]$/.test(tecla) || pin.length >= PIN_MAX) return pin;
  return pin + tecla;
}

export function puedeEnviar(pin: string): boolean {
  return pin.length >= PIN_MIN_ENVIO && pin.length <= PIN_MAX;
}

/** Cuántos puntos dibujar: al menos 6 (el largo de un PIN nuevo) y uno por dígito tecleado. */
export function puntosVisibles(longitud: number): number {
  return Math.min(PIN_MAX, Math.max(PIN_PUNTOS_MIN, longitud));
}
