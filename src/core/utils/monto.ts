// Campo de monto del cobro: acepta dígitos y un solo punto, con 2 decimales como máximo (teclado físico, pegado o
// teclado en pantalla). Cualquier otro carácter se descarta; nunca devuelve "00" ni "01" al inicio.
export function normalizarMonto(valor: string): string {
  let v = valor.replace(',', '.').replace(/[^\d.]/g, '');
  const i = v.indexOf('.');
  if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 2);
  if (/^0\d/.test(v)) v = v.replace(/^0+(?=\d)/, '');
  return v.slice(0, 10);
}

/** Error que sí merece reintentarse solo: sin respuesta (red/timeout) o 5xx. Un 4xx (400, 403, 409…) nunca. */
export function esReintentable(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === undefined || status >= 500;
}
