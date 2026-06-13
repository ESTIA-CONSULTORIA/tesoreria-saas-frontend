export interface ModuleDef {
  key: string;
  label: string;
  desc: string;
  format: "currency" | "percent" | "number";
  positiveGood: boolean | null;
}

export const MODULES: ModuleDef[] = [
  { key: "VENTAS",      label: "VENTAS",      desc: "Ingresos del período",     format: "currency", positiveGood: true  },
  { key: "SALDOS",      label: "SALDOS",      desc: "Saldo total en cuentas",   format: "currency", positiveGood: true  },
  { key: "COSTOS",      label: "COSTOS",      desc: "Costo de ventas",          format: "currency", positiveGood: false },
  { key: "GASTOS",      label: "GASTOS",      desc: "Egresos del período",      format: "currency", positiveGood: false },
  { key: "NOMINA",      label: "NÓMINA",      desc: "Nómina quincenal activa",  format: "currency", positiveGood: null  },
  { key: "PRESUPUESTO", label: "PRESUPUESTO", desc: "Presupuesto asignado",     format: "currency", positiveGood: null  },
  { key: "ROTACION",    label: "ROTACIÓN",    desc: "Empleados con baja",       format: "percent",  positiveGood: false },
  { key: "VACANTES",    label: "VACANTES",    desc: "Posiciones abiertas",      format: "number",   positiveGood: null  },
];

export function fmtValue(v: number, format: ModuleDef["format"]): string {
  if (format === "currency") {
    return "$" + v.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  if (format === "percent") return v + "%";
  return v.toLocaleString("es-MX");
}
