// Cobro con tarjeta: el servidor exige exactamente 4 dígitos numéricos (últimos de la tarjeta) en DEBITO, CREDITO y TARJETA.
// Estas reglas puras las comparten el cobro del POS, el cobro de cuentas de mesa y membresías: el botón se deshabilita
// con el MISMO criterio que el 400 del servidor.

export const FORMAS_TARJETA = ['DEBITO', 'CREDITO', 'TARJETA'] as const;

export const esFormaTarjeta = (forma?: string | null): boolean => !!forma && (FORMAS_TARJETA as readonly string[]).includes(forma);

/** Lo que se teclea: solo números y como máximo 4 (pegar "**** 1234" deja "1234"). */
export const soloUltimos4 = (valor: string): string => valor.replace(/\D/g, '').slice(0, 4);

export const ultimos4Validos = (valor?: string | null): boolean => /^\d{4}$/.test(valor ?? '');

/** null = puede cobrar; si no, el motivo que se muestra junto al botón deshabilitado. */
export function motivoFaltaTarjeta(forma: string | null | undefined, ultimos4: string | null | undefined): string | null {
  if (!esFormaTarjeta(forma) || ultimos4Validos(ultimos4)) return null;
  const n = (ultimos4 ?? '').replace(/\D/g, '').length;
  return n === 0
    ? 'Captura los 4 últimos dígitos de la tarjeta para continuar.'
    : `Faltan ${4 - n} dígito${4 - n === 1 ? '' : 's'} de la tarjeta (llevas ${n} de 4).`;
}

export interface LineaPago {
  forma: string;
  ultimos4Digitos?: string;
}

/** Motivo por el que el botón de confirmar el cobro está deshabilitado (null = habilitado). */
export function motivoBloqueoCobro(p: {
  pagado: number;
  total: number;
  pagos: LineaPago[];
  formaActiva?: string | null;
  ultimos4Activo?: string | null;
}): string | null {
  const sinDigitos = p.pagos.findIndex((x) => esFormaTarjeta(x.forma) && !ultimos4Validos(x.ultimos4Digitos));
  if (sinDigitos >= 0) return `El pago ${sinDigitos + 1} (${p.pagos[sinDigitos].forma}) no tiene los 4 últimos dígitos de la tarjeta. Quítalo y agrégalo con los dígitos.`;
  if (p.pagado < p.total) {
    return motivoFaltaTarjeta(p.formaActiva, p.ultimos4Activo) ?? `Falta cubrir $${(Math.round((p.total - p.pagado) * 100) / 100).toFixed(2)} del total.`;
  }
  return null;
}
