export interface Item { clave: string; tipo: string; titulo: string; detalle: string; status: string; nota?: string; documentId?: string | null; fecha: string }

const fmt = (d: string) => new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

/** Junta las cinco listas del servidor en una sola, de lo más nuevo a lo más viejo. */
export function unirSolicitudes(d: any): Item[] {
  const items: Item[] = [];
  for (const v of d?.vacaciones ?? []) items.push({ clave: `v${v.id}`, tipo: "Vacaciones", titulo: `${fmt(v.startDate)} al ${fmt(v.endDate)}`, detalle: `${v.daysRequested} día(s)${v.reason ? " · " + v.reason : ""}`, status: v.status, nota: v.responseNote, fecha: v.createdAt });
  for (const p of d?.permisos ?? []) items.push({ clave: `p${p.id}`, tipo: "Permiso", titulo: `${fmt(p.date)} · ${p.hours} h`, detalle: `${p.type}${p.reason ? " · " + p.reason : ""}`, status: p.status, nota: p.responseNote, fecha: p.createdAt });
  for (const r of d?.recibos ?? []) items.push({ clave: `r${r.id}`, tipo: "Recibo", titulo: r.detalle?.periodo ?? "Recibo de nómina", detalle: r.motivo ?? "", status: r.status, nota: r.responseNote, documentId: r.documentId, fecha: r.createdAt });
  for (const c of d?.cartas ?? []) items.push({ clave: `c${c.id}`, tipo: "Carta de trabajo", titulo: `Dirigida a: ${c.detalle?.dirigidaA ?? "A quien corresponda"}`, detalle: c.motivo ?? "", status: c.status, nota: c.responseNote, documentId: c.documentId, fecha: c.createdAt });
  for (const k of d?.correcciones ?? []) items.push({ clave: `k${k.id}`, tipo: "Corrección de salida", titulo: `${fmt(k.detalle?.fecha)} a las ${k.detalle?.hora}`, detalle: k.motivo ?? "", status: k.status, nota: k.responseNote, fecha: k.createdAt });
  return items.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

