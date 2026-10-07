// IVA del POS: precios SIN IVA, 16% sobre el neto (subtotal menos descuento), redondeado a centavos. Es el mismo cálculo
// del backend (calcularIva en config/roles-pos.config.ts): el POS normal y las cuentas abiertas de mesas calculan igual.
export const IVA_TASA = 0.16;

export const redondear2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

export const calcularIva = (neto: number): number => redondear2(neto * IVA_TASA);

export const totalConIva = (neto: number): number => redondear2(neto + calcularIva(neto));
