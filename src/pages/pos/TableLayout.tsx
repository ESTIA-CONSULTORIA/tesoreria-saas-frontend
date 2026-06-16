import { useState, useEffect } from "react";
import { api } from "../../core/api/api";

interface Table {
  id: string;
  numero: number;
  capacidad: number;
  status: "DISPONIBLE" | "OCUPADA" | "RESERVADA";
  areaId: string;
}

interface Area {
  id: string;
  nombre: string;
  tables?: Table[];
}

interface Props {
  tenantId: string;
  branchId?: string;
  onSelectTable: (tableId: string, tableNumber: number) => void;
}

const STATUS_STYLE: Record<string, { bg: string; border: string; color: string; label: string }> = {
  DISPONIBLE: { bg: "#22C55E15", border: "#22C55E60", color: "#22C55E", label: "Disponible" },
  OCUPADA: { bg: "#EF444415", border: "#EF444460", color: "#EF4444", label: "Ocupada" },
  RESERVADA: { bg: "#F59E0B15", border: "#F59E0B60", color: "#F59E0B", label: "Reservada" },
};

export default function TableLayout({ tenantId, branchId, onSelectTable }: Props) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  const headers: any = {};
  if (tenantId) headers["x-tenant-id"] = tenantId;
  if (branchId) headers["x-branch-id"] = branchId;

  useEffect(() => {
    loadAreas();
  }, []);

  async function loadAreas() {
    try {
      const res = await api.get("/pos/areas", { headers });
      const areasData: Area[] = Array.isArray(res.data) ? res.data : [];
      // Load tables for each area
      const areasWithTables = await Promise.all(
        areasData.map(async (area) => {
          try {
            const tablesRes = await api.get(`/pos/areas/${area.id}/tables`, { headers });
            return { ...area, tables: Array.isArray(tablesRes.data) ? tablesRes.data : [] };
          } catch {
            return { ...area, tables: [] };
          }
        }),
      );
      setAreas(areasWithTables);
    } catch {
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-4 text-sm" style={{ color: "#9A9A9A" }}>Cargando mesas...</div>;
  }

  if (areas.length === 0) {
    return (
      <div className="p-6 text-center" style={{ color: "#9A9A9A" }}>
        <p className="text-sm">No hay áreas configuradas</p>
        <p className="text-xs mt-1">Configura las áreas en la sección de Configuración POS</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {areas.map((area) => (
        <div key={area.id}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#7E7E7E" }}>
            {area.nombre}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {(area.tables ?? []).map((table) => {
              const style = STATUS_STYLE[table.status] ?? STATUS_STYLE.DISPONIBLE;
              const isAvailable = table.status === "DISPONIBLE";
              return (
                <button
                  key={table.id}
                  onClick={() => isAvailable && onSelectTable(table.id, table.numero)}
                  disabled={!isAvailable}
                  className="rounded-lg p-3 border text-center transition-opacity"
                  style={{
                    backgroundColor: style.bg,
                    borderColor: style.border,
                    opacity: isAvailable ? 1 : 0.6,
                    cursor: isAvailable ? "pointer" : "not-allowed",
                  }}
                >
                  <div className="font-semibold text-sm" style={{ color: style.color }}>
                    {table.numero}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: style.color }}>
                    {style.label}
                  </div>
                  <div className="text-xs" style={{ color: "#7E7E7E" }}>
                    {table.capacidad} pax
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
