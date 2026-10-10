// IVA del POS, configurable: por negocio (ivaTasaDefault + preciosIncluyenIva, de /tenant-settings) y por producto
// (tasaIva, opcional). Es el MISMO cálculo del backend (config/iva.config.ts): el servidor es quien fija precio, IVA y total
// de cada venta; esto solo sirve para mostrar el desglose antes de cobrar. Ya no hay una tasa fija de 16 %.
export type TasaIva = '16' | '8' | '0' | 'EXENTO';
export const TASAS_IVA: TasaIva[] = ['16', '8', '0', 'EXENTO'];

export interface IvaConfig {
  ivaTasaDefault: TasaIva;
  preciosIncluyenIva: boolean;
}

// Lo que tiene todo negocio que no ha configurado nada: 16 % y precios sin IVA (igual que siempre).
export const IVA_DEFAULT: IvaConfig = { ivaTasaDefault: '16', preciosIncluyenIva: false };

export const esTasaIva = (v: unknown): v is TasaIva => typeof v === 'string' && (TASAS_IVA as string[]).includes(v);

export const redondear2 = (n: number): number => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;

export const tasaNumerica = (t: TasaIva): number => (t === '16' ? 0.16 : t === '8' ? 0.08 : 0);

export const etiquetaTasa = (t: TasaIva): string => (t === 'EXENTO' ? 'Exento' : `${t}%`);

// Tasa efectiva de un producto o línea: la propia si es válida; si no, la del negocio.
export const tasaEfectiva = (propia: unknown, cfg: IvaConfig = IVA_DEFAULT): TasaIva => (esTasaIva(propia) ? propia : cfg.ivaTasaDefault);

export interface LineaTicket {
  cantidad: number;
  precioUnitario: number | string;
  descuento?: number | string; // porcentaje 0-100
  tasaIva?: string | null;
  ivaIncluido?: boolean;
}

export interface DesgloseIva {
  subtotal: number; // sin IVA, antes de descuentos
  descuento: number; // en base sin IVA
  base: number; // subtotal − descuento
  impuestos: number;
  total: number;
  porTasa: Record<TasaIva, { base: number; impuestos: number }>;
}

// Igual que totalesDeItems() del backend: el IVA se redondea una vez por grupo (tasa, incluido), así con una sola tasa y
// precios sin IVA da round2(neto × tasa) como siempre. `cfg` aporta la tasa a las líneas que no traen una propia y si los
// precios la incluyen (a una línea ya guardada se le respeta lo que trae).
export function desgloseTicket(lineas: LineaTicket[], cfg: IvaConfig = IVA_DEFAULT): DesgloseIva {
  const grupos = new Map<string, { suma: number; tasa: TasaIva; incluido: boolean }>();
  const porTasa = Object.fromEntries(TASAS_IVA.map((t) => [t, { base: 0, impuestos: 0 }])) as DesgloseIva['porTasa'];
  let subtotal = 0;
  for (const l of lineas) {
    const bruto = redondear2(Number(l.precioUnitario) * Number(l.cantidad));
    const monto = redondear2(bruto - redondear2((bruto * Number(l.descuento ?? 0)) / 100));
    const tasa = tasaEfectiva(l.tasaIva, cfg);
    const incluido = l.ivaIncluido ?? cfg.preciosIncluyenIva;
    const k = `${tasa}|${incluido ? 1 : 0}`;
    const g = grupos.get(k) ?? { suma: 0, tasa, incluido };
    g.suma = redondear2(g.suma + monto);
    grupos.set(k, g);
    subtotal = redondear2(subtotal + (incluido ? redondear2(bruto / (1 + tasaNumerica(tasa))) : bruto));
  }
  let base = 0;
  let impuestos = 0;
  let total = 0;
  for (const g of grupos.values()) {
    const t = tasaNumerica(g.tasa);
    const gBase = g.incluido ? redondear2(g.suma / (1 + t)) : g.suma;
    const gImp = g.incluido ? redondear2(g.suma - gBase) : redondear2(g.suma * t);
    porTasa[g.tasa].base = redondear2(porTasa[g.tasa].base + gBase);
    porTasa[g.tasa].impuestos = redondear2(porTasa[g.tasa].impuestos + gImp);
    base = redondear2(base + gBase);
    impuestos = redondear2(impuestos + gImp);
    total = redondear2(total + gBase + gImp);
  }
  return { subtotal, descuento: redondear2(subtotal - base), base, impuestos, total, porTasa };
}

// Tasas con importe en el desglose (para mostrar una línea de IVA por tasa en el ticket). Exento se muestra aunque su IVA
// sea 0 si hubo base exenta.
export function lineasDeIva(d: DesgloseIva): Array<{ tasa: TasaIva; etiqueta: string; base: number; impuestos: number }> {
  return TASAS_IVA.filter((t) => d.porTasa[t].base > 0 || d.porTasa[t].impuestos > 0).map((t) => ({
    tasa: t,
    etiqueta: etiquetaTasa(t),
    base: d.porTasa[t].base,
    impuestos: d.porTasa[t].impuestos,
  }));
}
