import { describe, it, expect } from "vitest";
import { unirSolicitudes } from "./solicitudes.util";

describe("portal del empleado: lista unificada de solicitudes", () => {
  it("junta las cinco clases, de la más nueva a la más vieja, con su estado y nota", () => {
    const l = unirSolicitudes({
      vacaciones: [{ id: "1", startDate: "2026-12-20", endDate: "2026-12-22", daysRequested: 3, status: "RECHAZADA", responseNote: "Cierre", createdAt: "2026-11-01T10:00:00Z" }],
      permisos: [],
      recibos: [{ id: "2", detalle: { periodo: "1 al 15 nov" }, status: "PENDIENTE", createdAt: "2026-11-03T10:00:00Z" }],
      cartas: [{ id: "3", detalle: { dirigidaA: "Banco" }, status: "APROBADA", documentId: "d1", createdAt: "2026-11-02T10:00:00Z" }],
      correcciones: [{ id: "4", detalle: { fecha: "2026-11-02", hora: "17:30" }, status: "PENDIENTE", createdAt: "2026-11-04T10:00:00Z" }],
    });
    expect(l.map((x) => x.tipo)).toEqual(["Corrección de salida", "Recibo", "Carta de trabajo", "Vacaciones"]);
    expect(l.find((x) => x.tipo === "Vacaciones")).toMatchObject({ status: "RECHAZADA", nota: "Cierre" });
    expect(l.find((x) => x.tipo === "Carta de trabajo")?.documentId).toBe("d1");
  });
  it("sin datos devuelve lista vacía", () => { expect(unirSolicitudes(undefined)).toEqual([]); });
});
