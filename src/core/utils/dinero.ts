// Presentación de dinero y comparaciones: nunca «NaN», nunca una cifra cruda sin formato y nunca un «+0 %» sin periodo anterior.

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** «$1,234.50», o «—» si el dato falta o no es un número. */
export function pesosOGuion(v: unknown): string {
  const n = num(v);
  return n === null ? '—' : `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Igual que pesosOGuion pero con 0 cuando falta (las tarjetas de resumen muestran $0.00, no «—»). */
export function pesosKpi(v: unknown): string {
  return pesosOGuion(num(v) ?? 0);
}

/** Tendencia contra el mes anterior: si el servidor no manda el porcentaje (o no hay con qué comparar), no se inventa un 0 %. */
export function tendenciaMes(porcentaje: unknown): { trend: 'up' | 'down' | 'neutral'; texto: string } {
  const n = num(porcentaje);
  if (n === null) return { trend: 'neutral', texto: 'Sin datos para comparar' };
  return { trend: n > 0 ? 'up' : n < 0 ? 'down' : 'neutral', texto: `${n > 0 ? '+' : ''}${n.toFixed(1)} % frente al mes anterior` };
}
