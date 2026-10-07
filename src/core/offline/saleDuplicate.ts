// Decisiones puras del motor offline sobre el rechazo de una venta (sin red, sin Dexie): se prueban con specs.

interface ErrorHttp {
  response?: { status?: number; data?: { message?: string | string[]; code?: string; mismoRegistro?: boolean } };
}

export function motivoDeRechazo(error: unknown): string {
  const data = (error as ErrorHttp)?.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg) && msg.length) return msg.join('. ');
  if (typeof msg === 'string' && msg) return msg;
  return 'El servidor rechazó la operación.';
}

// 400 "ya existe" al reenviar una venta por folio: el servidor ya la tiene. Cuenta como sincronizada, no como fallida.
// El backend distingue (mismoRegistro) si ese folio es de ESTA venta (mismo tenant, sucursal, cajero y hora) o de otra:
// si dice que NO es la misma, se queda como fallida para revisarla (jamás se pierde una venta por un folio repetido).
export function esVentaYaRegistrada(error: unknown): boolean {
  const e = error as ErrorHttp;
  if (e?.response?.status !== 400) return false;
  const data = e.response.data;
  const dice = (typeof data?.message === 'string' ? data.message : Array.isArray(data?.message) ? data.message.join(' ') : '') || '';
  const esDuplicado = data?.code === 'FOLIO_DUPLICADO' || /ya existe/i.test(dice);
  if (!esDuplicado) return false;
  return data?.mismoRegistro !== false;
}
