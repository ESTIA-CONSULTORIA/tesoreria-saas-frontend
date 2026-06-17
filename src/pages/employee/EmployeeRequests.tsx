import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EmployeeLayout from "./EmployeeLayout";
import { employeeApi } from "../../core/api/employeeApi";

interface VacationRequest {
  id: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason: string;
  status: string;
  responseNote?: string;
  createdAt: string;
}

interface PermissionRequest {
  id: string;
  date: string;
  hours: number;
  type: string;
  reason: string;
  status: string;
  responseNote?: string;
  createdAt: string;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDIENTE: { bg: "#F59E0B22", color: "#F59E0B" },
  APROBADA: { bg: "#22C55E22", color: "#22C55E" },
  RECHAZADA: { bg: "#EF444422", color: "#EF4444" },
};

export default function EmployeeRequests() {
  const navigate = useNavigate();
  const [vacaciones, setVacaciones] = useState<VacationRequest[]>([]);
  const [permisos, setPermisos] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"vacaciones" | "permisos">("vacaciones");
  const [showVacForm, setShowVacForm] = useState(false);
  const [showPermForm, setShowPermForm] = useState(false);
  const [vacForm, setVacForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [permForm, setPermForm] = useState({ date: "", hours: "1", type: "PERSONAL", reason: "" });
  const [saving, setSaving] = useState(false);

  const token = sessionStorage.getItem("employee_token");

  useEffect(() => {
    if (!token) { navigate("/employee"); return; }
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const res = await employeeApi.get("/hr/portal/requests");
      setVacaciones(res.data?.vacaciones ?? []);
      setPermisos(res.data?.permisos ?? []);
    } catch {
      navigate("/employee");
    } finally {
      setLoading(false);
    }
  }

  async function submitVacation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await employeeApi.post("/hr/portal/vacation-request", vacForm);
      setShowVacForm(false);
      setVacForm({ startDate: "", endDate: "", reason: "" });
      await loadRequests();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Error al enviar solicitud");
    } finally {
      setSaving(false);
    }
  }

  async function submitPermission(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await employeeApi.post("/hr/portal/permission-request", { ...permForm, hours: parseFloat(permForm.hours) });
      setShowPermForm(false);
      setPermForm({ date: "", hours: "1", type: "PERSONAL", reason: "" });
      await loadRequests();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Error al enviar solicitud");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EmployeeLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Mis Solicitudes</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowVacForm(true)}
              className="text-xs px-3 py-1.5 rounded"
              style={{ backgroundColor: "#F5F5F522", color: "#F5F5F5", border: "1px solid #2D2D2D" }}
            >
              + Vacaciones
            </button>
            <button
              onClick={() => setShowPermForm(true)}
              className="text-xs px-3 py-1.5 rounded"
              style={{ backgroundColor: "#F5F5F522", color: "#F5F5F5", border: "1px solid #2D2D2D" }}
            >
              + Permiso
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["vacaciones", "permisos"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="text-xs px-3 py-1.5 rounded capitalize"
              style={{
                backgroundColor: tab === t ? "#2D2D2D" : "transparent",
                color: tab === t ? "#F5F5F5" : "#9A9A9A",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "#9A9A9A" }}>Cargando...</p>
        ) : tab === "vacaciones" ? (
          vacaciones.length === 0 ? (
            <p className="text-sm" style={{ color: "#9A9A9A" }}>Sin solicitudes de vacaciones</p>
          ) : (
            <div className="space-y-2">
              {vacaciones.map((v) => (
                <div key={v.id} className="rounded-lg p-4 border" style={{ backgroundColor: "#161616", borderColor: "#2D2D2D" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {new Date(v.startDate).toLocaleDateString("es-MX")} — {new Date(v.endDate).toLocaleDateString("es-MX")}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={STATUS_STYLE[v.status] ?? STATUS_STYLE.PENDIENTE}
                    >
                      {v.status}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "#9A9A9A" }}>{v.daysRequested} días — {v.reason}</p>
                  {v.responseNote && <p className="text-xs mt-1" style={{ color: "#7E7E7E" }}>Nota: {v.responseNote}</p>}
                </div>
              ))}
            </div>
          )
        ) : (
          permisos.length === 0 ? (
            <p className="text-sm" style={{ color: "#9A9A9A" }}>Sin solicitudes de permisos</p>
          ) : (
            <div className="space-y-2">
              {permisos.map((p) => (
                <div key={p.id} className="rounded-lg p-4 border" style={{ backgroundColor: "#161616", borderColor: "#2D2D2D" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {new Date(p.date).toLocaleDateString("es-MX")} — {p.hours}h — {p.type}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={STATUS_STYLE[p.status] ?? STATUS_STYLE.PENDIENTE}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "#9A9A9A" }}>{p.reason}</p>
                  {p.responseNote && <p className="text-xs mt-1" style={{ color: "#7E7E7E" }}>Nota: {p.responseNote}</p>}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Vacation form modal */}
      {showVacForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <form onSubmit={submitVacation} className="w-full max-w-sm p-6 rounded-xl space-y-4" style={{ backgroundColor: "#161616", border: "1px solid #2D2D2D" }}>
            <h3 className="font-semibold">Solicitar Vacaciones</h3>
            <div>
              <label className="text-xs block mb-1" style={{ color: "#9A9A9A" }}>Fecha inicio</label>
              <input type="date" required value={vacForm.startDate} onChange={(e) => setVacForm((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded" style={{ backgroundColor: "#0A0A0A", border: "1px solid #2D2D2D", color: "#F5F5F5" }} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "#9A9A9A" }}>Fecha fin</label>
              <input type="date" required value={vacForm.endDate} onChange={(e) => setVacForm((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded" style={{ backgroundColor: "#0A0A0A", border: "1px solid #2D2D2D", color: "#F5F5F5" }} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "#9A9A9A" }}>Motivo</label>
              <textarea value={vacForm.reason} onChange={(e) => setVacForm((p) => ({ ...p, reason: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded" rows={3} style={{ backgroundColor: "#0A0A0A", border: "1px solid #2D2D2D", color: "#F5F5F5" }} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowVacForm(false)} className="flex-1 py-2 text-sm rounded" style={{ border: "1px solid #2D2D2D", color: "#9A9A9A" }}>Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 py-2 text-sm rounded font-medium" style={{ backgroundColor: "#F5F5F5", color: "#0A0A0A" }}>
                {saving ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Permission form modal */}
      {showPermForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <form onSubmit={submitPermission} className="w-full max-w-sm p-6 rounded-xl space-y-4" style={{ backgroundColor: "#161616", border: "1px solid #2D2D2D" }}>
            <h3 className="font-semibold">Solicitar Permiso</h3>
            <div>
              <label className="text-xs block mb-1" style={{ color: "#9A9A9A" }}>Fecha</label>
              <input type="date" required value={permForm.date} onChange={(e) => setPermForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded" style={{ backgroundColor: "#0A0A0A", border: "1px solid #2D2D2D", color: "#F5F5F5" }} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs block mb-1" style={{ color: "#9A9A9A" }}>Horas</label>
                <input type="number" min="0.5" max="8" step="0.5" required value={permForm.hours} onChange={(e) => setPermForm((p) => ({ ...p, hours: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded" style={{ backgroundColor: "#0A0A0A", border: "1px solid #2D2D2D", color: "#F5F5F5" }} />
              </div>
              <div className="flex-1">
                <label className="text-xs block mb-1" style={{ color: "#9A9A9A" }}>Tipo</label>
                <select value={permForm.type} onChange={(e) => setPermForm((p) => ({ ...p, type: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded" style={{ backgroundColor: "#0A0A0A", border: "1px solid #2D2D2D", color: "#F5F5F5" }}>
                  <option value="PERSONAL">Personal</option>
                  <option value="MEDICO">Médico</option>
                  <option value="FAMILIAR">Familiar</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "#9A9A9A" }}>Motivo</label>
              <textarea value={permForm.reason} onChange={(e) => setPermForm((p) => ({ ...p, reason: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded" rows={3} style={{ backgroundColor: "#0A0A0A", border: "1px solid #2D2D2D", color: "#F5F5F5" }} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowPermForm(false)} className="flex-1 py-2 text-sm rounded" style={{ border: "1px solid #2D2D2D", color: "#9A9A9A" }}>Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 py-2 text-sm rounded font-medium" style={{ backgroundColor: "#F5F5F5", color: "#0A0A0A" }}>
                {saving ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </EmployeeLayout>
  );
}
