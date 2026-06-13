export interface ModuleDef {
  key: string;
  label: string;
  desc: string;
  format: "currency" | "percent" | "number";
  positiveGood: boolean | null;
}

export const MODULES: ModuleDef[] = [
  { key: "VENTA",       label: "VENTA",       desc: "Total ventas del período",   format: "currency", positiveGood: true  },
  { key: "COSTO",       label: "COSTO",       desc: "Costo de ventas",            format: "currency", positiveGood: false },
  { key: "GASTO",       label: "GASTO",       desc: "Egresos del período",        format: "currency", positiveGood: false },
  { key: "PRESUPUESTO", label: "PRESUPUESTO", desc: "Presupuesto asignado",       format: "currency", positiveGood: null  },
  { key: "FLUJO",       label: "FLUJO",       desc: "Flujo neto del período",     format: "currency", positiveGood: true  },
  { key: "BANCO",       label: "BANCO",       desc: "Saldo total en cuentas",     format: "currency", positiveGood: true  },
  { key: "NOMINA",      label: "NÓMINA",      desc: "Nómina quincenal activa",    format: "currency", positiveGood: null  },
  { key: "VACANTES",    label: "VACANTES",    desc: "Posiciones abiertas",        format: "number",   positiveGood: null  },
  { key: "ROTACION",    label: "ROTACIÓN",    desc: "Tasa de rotación",           format: "percent",  positiveGood: false },
];

export function fmtValue(v: number, format: ModuleDef["format"]): string {
  if (format === "currency") {
    return "$" + v.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  if (format === "percent") return v + "%";
  return v.toLocaleString("es-MX");
}
