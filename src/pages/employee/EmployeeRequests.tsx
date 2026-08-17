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

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PENDIENTE: { color: "#F59E0B", bg: "#F59E0B12", label: "Pendiente" },
  APROBADA: { color: "#22C55E", bg: "#22C55E12", label: "Aprobada" },
  RECHAZADA: { color: "#EF4444", bg: "#EF444412", label: "Rechazada" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

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
  const [formError, setFormError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
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
    setFormError("");
    try {
      await employeeApi.post("/hr/portal/vacation-request", vacForm);
      setShowVacForm(false);
      setVacForm({ startDate: "", endDate: "", reason: "" });
      await load();
    } catch (e: any) {
      setFormError(e?.response?.data?.message || "Error al enviar solicitud");
    } finally {
      setSaving(false);
    }
  }

  async function submitPermission(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await employeeApi.post("/hr/portal/permission-request", { ...permForm, hours: parseFloat(permForm.hours) });
      setShowPermForm(false);
      setPermForm({ date: "", hours: "1", type: "PERSONAL", reason: "" });
      await load();
    } catch (e: any) {
      setFormError(e?.response?.data?.message || "Error al enviar solicitud");
    } finally {
      setSaving(false);
    }
  }

  function inputStyle(): React.CSSProperties {
    return {
      width: "100%",
      background: "#0A0A0A",
      border: "1px solid #222222",
      borderRadius: 10,
      padding: "12px 14px",
      color: "#F5F5F5",
      fontSize: "0.9rem",
      outline: "none",
      boxSizing: "border-box",
    };
  }

  function labelStyle(): React.CSSProperties {
    return {
      display: "block",
      fontSize: "0.6rem",
      color: "#505050",
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      marginBottom: 6,
    };
  }

  return (
    <EmployeeLayout>
      <div style={{ padding: "28px 20px 0" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ color: "#F5F5F5", fontSize: "1.2rem", fontWeight: 600 }}>Mis Solicitudes</h1>
          <button
            onClick={() => tab === "vacaciones" ? setShowVacForm(true) : setShowPermForm(true)}
            style={{
              background: "#1A1A1A",
              border: "1px solid #2A2A2A",
              borderRadius: 10,
              color: "#A0A0A0",
              fontSize: "0.78rem",
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            + Nueva
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#0A0A0A", borderRadius: 12, padding: 4 }}>
          {(["vacaciones", "permisos"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "9px 0",
                background: tab === t ? "#1C1C1C" : "transparent",
                border: "none",
                borderRadius: 9,
                color: tab === t ? "#F5F5F5" : "#505050",
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t === "vacaciones" ? "VACACIONES" : "PERMISOS"}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ color: "#383838", fontSize: "0.8rem", letterSpacing: "0.1em", textAlign: "center", padding: "40px 0" }}>
            CARGANDO
          </div>
        ) : tab === "vacaciones" ? (
          vacaciones.length === 0 ? (
            <EmptyState label="Sin solicitudes de vacaciones" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {vacaciones.map((v) => {
                const s = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.PENDIENTE;
                return (
                  <div
                    key={v.id}
                    style={{
                      background: "#0E0E0E",
                      border: "1px solid #1C1C1C",
                      borderRadius: 14,
                      padding: "16px 18px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ color: "#F5F5F5", fontSize: "0.9rem", fontWeight: 500 }}>
                          {fmtDate(v.startDate)} — {fmtDate(v.endDate)}
                        </div>
                        <div style={{ color: "#505050", fontSize: "0.75rem", marginTop: 2 }}>
                          {v.daysRequested} día{v.daysRequested !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <span
                        style={{
                          background: s.bg,
                          color: s.color,
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          padding: "4px 10px",
                          borderRadius: 20,
                          textTransform: "uppercase",
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                    {v.reason && <p style={{ color: "#404040", fontSize: "0.78rem" }}>{v.reason}</p>}
                    {v.responseNote && (
                      <p style={{ color: "#383838", fontSize: "0.72rem", marginTop: 6, borderTop: "1px solid #1A1A1A", paddingTop: 6 }}>
                        {v.responseNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          permisos.length === 0 ? (
            <EmptyState label="Sin solicitudes de permisos" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {permisos.map((p) => {
                const s = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.PENDIENTE;
                return (
                  <div
                    key={p.id}
                    style={{
                      background: "#0E0E0E",
                      border: "1px solid #1C1C1C",
                      borderRadius: 14,
                      padding: "16px 18px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ color: "#F5F5F5", fontSize: "0.9rem", fontWeight: 500 }}>
                          {fmtDate(p.date)} · {p.hours}h · {p.type}
                        </div>
                      </div>
                      <span
                        style={{
                          background: s.bg,
                          color: s.color,
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          padding: "4px 10px",
                          borderRadius: 20,
                          textTransform: "uppercase",
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                    {p.reason && <p style={{ color: "#404040", fontSize: "0.78rem" }}>{p.reason}</p>}
                    {p.responseNote && (
                      <p style={{ color: "#383838", fontSize: "0.72rem", marginTop: 6, borderTop: "1px solid #1A1A1A", paddingTop: 6 }}>
                        {p.responseNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Vacation Form Modal */}
      {showVacForm && (
        <Modal title="Solicitar Vacaciones" onClose={() => { setShowVacForm(false); setFormError(""); }}>
          <form onSubmit={submitVacation} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle()}>Fecha inicio</label>
              <input type="date" required value={vacForm.startDate}
                onChange={(e) => setVacForm((p) => ({ ...p, startDate: e.target.value }))}
                style={inputStyle()} />
            </div>
            <div>
              <label style={labelStyle()}>Fecha fin</label>
              <input type="date" required value={vacForm.endDate}
                onChange={(e) => setVacForm((p) => ({ ...p, endDate: e.target.value }))}
                style={inputStyle()} />
            </div>
            <div>
              <label style={labelStyle()}>Motivo (opcional)</label>
              <textarea value={vacForm.reason} rows={3}
                onChange={(e) => setVacForm((p) => ({ ...p, reason: e.target.value }))}
                style={{ ...inputStyle(), resize: "none" }} />
            </div>
            {formError && <p style={{ color: "#EF4444", fontSize: "0.78rem" }}>{formError}</p>}
            <ModalButtons onCancel={() => { setShowVacForm(false); setFormError(""); }} saving={saving} />
          </form>
        </Modal>
      )}

      {/* Permission Form Modal */}
      {showPermForm && (
        <Modal title="Solicitar Permiso" onClose={() => { setShowPermForm(false); setFormError(""); }}>
          <form onSubmit={submitPermission} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle()}>Fecha</label>
              <input type="date" required value={permForm.date}
                onChange={(e) => setPermForm((p) => ({ ...p, date: e.target.value }))}
                style={inputStyle()} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle()}>Horas</label>
                <input type="number" min="0.5" max="8" step="0.5" required value={permForm.hours}
                  onChange={(e) => setPermForm((p) => ({ ...p, hours: e.target.value }))}
                  style={inputStyle()} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle()}>Tipo</label>
                <select value={permForm.type}
                  onChange={(e) => setPermForm((p) => ({ ...p, type: e.target.value }))}
                  style={inputStyle()}>
                  <option value="PERSONAL">Personal</option>
                  <option value="MEDICO">Médico</option>
                  <option value="FAMILIAR">Familiar</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle()}>Motivo</label>
              <textarea value={permForm.reason} rows={3}
                onChange={(e) => setPermForm((p) => ({ ...p, reason: e.target.value }))}
                style={{ ...inputStyle(), resize: "none" }} />
            </div>
            {formError && <p style={{ color: "#EF4444", fontSize: "0.78rem" }}>{formError}</p>}
            <ModalButtons onCancel={() => { setShowPermForm(false); setFormError(""); }} saving={saving} />
          </form>
        </Modal>
      )}
    </EmployeeLayout>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div
      style={{
        background: "#0E0E0E",
        border: "1px solid #1C1C1C",
        borderRadius: 14,
        padding: "36px 20px",
        textAlign: "center",
        color: "#303030",
        fontSize: "0.8rem",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "#0E0E0E",
          border: "1px solid #1C1C1C",
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px 36px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "#F5F5F5", fontSize: "1rem", fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#505050", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalButtons({ onCancel, saving }: { onCancel: () => void; saving: boolean }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
      <button
        type="button"
        onClick={onCancel}
        style={{
          flex: 1,
          padding: "13px",
          background: "transparent",
          border: "1px solid #2A2A2A",
          borderRadius: 10,
          color: "#505050",
          fontSize: "0.85rem",
          cursor: "pointer",
        }}
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={saving}
        style={{
          flex: 1,
          padding: "13px",
          background: saving ? "#1A1A1A" : "#F5F5F5",
          border: "none",
          borderRadius: 10,
          color: saving ? "#505050" : "#0A0A0A",
          fontSize: "0.85rem",
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Enviando..." : "Enviar"}
      </button>
    </div>
  );
}
