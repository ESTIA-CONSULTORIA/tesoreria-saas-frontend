import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EmployeeLayout from "./EmployeeLayout";
import { employeeApi } from "../../core/api/employeeApi";

interface Employee {
  id: string;
  nombre: string;
  apellidos?: string;
  puesto?: string;
  departamento?: string;
  fechaIngreso?: string;
  shiftId?: string;
  shiftName?: string;
}

interface AttendanceRecord {
  id: string;
  date?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  method?: string;
}

interface VacRequest {
  id: string;
  startDate?: string;
  endDate?: string;
  daysRequested?: number;
  reason?: string;
  status: string;
}

interface PermRequest {
  id: string;
  date?: string;
  hours?: number;
  type?: string;
  reason?: string;
  status: string;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "--:--";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T12:00:00"));
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function formatDate(): string {
  return new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatFechaIngreso(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T12:00:00"));
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
}

export default function EmployeeHome() {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null | undefined>(undefined);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [pendingVac, setPendingVac] = useState<VacRequest[]>([]);
  const [pendingPerm, setPendingPerm] = useState<PermRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    Promise.all([
      employeeApi.get("/hr/portal/me"),
      employeeApi.get("/hr/portal/attendance-today"),
      employeeApi.get("/hr/portal/attendance-recent"),
      employeeApi.get("/hr/portal/requests"),
    ])
      .then(([empRes, attRes, recentRes, reqRes]) => {
        setEmployee(empRes.data);
        setAttendance(attRes.data ?? null);
        setRecentAttendance(Array.isArray(recentRes.data) ? recentRes.data : []);
        const reqs = reqRes.data ?? {};
        setPendingVac((reqs.vacaciones ?? []).filter((r: VacRequest) => r.status === "PENDIENTE"));
        setPendingPerm((reqs.permisos ?? []).filter((r: PermRequest) => r.status === "PENDIENTE"));
      })
      .catch(() => navigate("/employee"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCheckIn() {
    setWorking(true);
    setMessage(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      const res = await employeeApi.post("/hr/portal/check-in", {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        method: "WEB_GPS",
      });
      setAttendance(res.data);
      setMessage({ text: "Entrada registrada correctamente", ok: true });
    } catch (err: any) {
      if (err.code === 1) {
        try {
          const res = await employeeApi.post("/hr/portal/check-in", { method: "WEB_NO_GPS" });
          setAttendance(res.data);
          setMessage({ text: "Entrada registrada sin GPS", ok: true });
        } catch (e2: any) {
          setMessage({ text: e2?.response?.data?.message || "Error al registrar entrada", ok: false });
        }
      } else {
        setMessage({ text: err?.response?.data?.message || "Error al registrar entrada", ok: false });
      }
    } finally {
      setWorking(false);
    }
  }

  async function handleCheckOut() {
    setWorking(true);
    setMessage(null);
    try {
      const res = await employeeApi.post("/hr/portal/check-out", {});
      setAttendance(res.data);
      setMessage({ text: "Salida registrada correctamente", ok: true });
    } catch (err: any) {
      setMessage({ text: err?.response?.data?.message || "Error al registrar salida", ok: false });
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <EmployeeLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <div style={{ color: "#383838", fontSize: "0.8rem", letterSpacing: "0.1em" }}>CARGANDO</div>
        </div>
      </EmployeeLayout>
    );
  }

  const hasCheckIn = !!attendance?.checkIn;
  const hasCheckOut = !!attendance?.checkOut;
  const state: "none" | "in" | "done" = !hasCheckIn ? "none" : hasCheckOut ? "done" : "in";

  const STATE_CONFIG = {
    none: {
      label: "SIN REGISTRO",
      sublabel: "No has registrado entrada hoy",
      dot: "#383838",
      dotGlow: "none",
    },
    in: {
      label: "EN TURNO",
      sublabel: `Entrada: ${formatTime(attendance?.checkIn)}`,
      dot: "#22C55E",
      dotGlow: "0 0 12px #22C55E66",
    },
    done: {
      label: "JORNADA COMPLETA",
      sublabel: `${formatTime(attendance?.checkIn)} — ${formatTime(attendance?.checkOut)}`,
      dot: "#3B82F6",
      dotGlow: "0 0 12px #3B82F666",
    },
  };

  const cfg = STATE_CONFIG[state];
  const totalPending = pendingVac.length + pendingPerm.length;

  return (
    <EmployeeLayout>
      <div style={{ padding: "28px 20px 0" }}>
        {/* Greeting */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: "#383838", fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>
            {formatDate()}
          </p>
          <h1 style={{ color: "#F5F5F5", fontSize: "1.35rem", fontWeight: 600, lineHeight: 1.2 }}>
            {employee ? `Hola, ${employee.nombre.split(" ")[0]}` : "Portal del Empleado"}
          </h1>
          {employee?.puesto && (
            <p style={{ color: "#505050", fontSize: "0.8rem", marginTop: 3 }}>{employee.puesto}</p>
          )}
        </div>

        {/* Employee Info Card */}
        {employee && (
          <div style={{
            background: "#0E0E0E", border: "1px solid #1C1C1C",
            borderRadius: 14, padding: "14px 16px", marginBottom: 12,
          }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#383838", marginBottom: 10 }}>
              Información
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
              <InfoField label="Nombre" value={`${employee.nombre} ${employee.apellidos ?? ""}`.trim()} />
              <InfoField label="Puesto" value={employee.puesto ?? "—"} />
              <InfoField label="Departamento" value={employee.departamento ?? "—"} />
              <InfoField label="Ingreso" value={formatFechaIngreso(employee.fechaIngreso)} />
              {employee.shiftName && (
                <InfoField label="Turno" value={employee.shiftName} />
              )}
            </div>
          </div>
        )}

        {/* Attendance Status Card */}
        <div style={{
          background: "#0E0E0E", border: "1px solid #1C1C1C",
          borderRadius: 18, padding: "24px 20px", marginBottom: 16,
        }}>
          {/* Status indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: cfg.dot, boxShadow: cfg.dotGlow, flexShrink: 0,
            }} />
            <div>
              <div style={{ color: "#F5F5F5", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.12em" }}>
                {cfg.label}
              </div>
              <div style={{ color: "#505050", fontSize: "0.72rem", marginTop: 2 }}>{cfg.sublabel}</div>
            </div>
          </div>

          {/* Time display */}
          {state !== "none" && (
            <div style={{
              display: "flex", gap: 12, marginBottom: 20,
              background: "#0A0A0A", borderRadius: 12, padding: "14px 16px",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#383838", fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
                  Entrada
                </div>
                <div style={{ color: "#22C55E", fontSize: "1.4rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {formatTime(attendance?.checkIn)}
                </div>
              </div>
              {hasCheckOut && (
                <>
                  <div style={{ width: 1, background: "#1C1C1C", margin: "4px 0" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#383838", fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
                      Salida
                    </div>
                    <div style={{ color: "#3B82F6", fontSize: "1.4rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {formatTime(attendance?.checkOut)}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action button */}
          {state === "none" && (
            <button
              onClick={handleCheckIn}
              disabled={working}
              style={{
                width: "100%", padding: "15px",
                background: working ? "#1A1A1A" : "#22C55E15",
                border: "1px solid #22C55E40", borderRadius: 12,
                color: working ? "#383838" : "#22C55E",
                fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.08em",
                cursor: working ? "not-allowed" : "pointer",
              }}
            >
              {working ? "REGISTRANDO..." : "REGISTRAR ENTRADA"}
            </button>
          )}

          {state === "in" && (
            <button
              onClick={handleCheckOut}
              disabled={working}
              style={{
                width: "100%", padding: "15px",
                background: working ? "#1A1A1A" : "#EF444415",
                border: "1px solid #EF444440", borderRadius: 12,
                color: working ? "#383838" : "#EF4444",
                fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.08em",
                cursor: working ? "not-allowed" : "pointer",
              }}
            >
              {working ? "REGISTRANDO..." : "REGISTRAR SALIDA"}
            </button>
          )}

          {state === "done" && (
            <div style={{ textAlign: "center", color: "#3B82F6", fontSize: "0.75rem", letterSpacing: "0.1em", padding: "10px 0 2px" }}>
              Jornada completada
            </div>
          )}

          {message && (
            <div style={{
              marginTop: 12, padding: "10px 14px",
              background: message.ok ? "#0D1A0D" : "#1A0808",
              border: `1px solid ${message.ok ? "#22C55E30" : "#EF444430"}`,
              borderRadius: 8,
              color: message.ok ? "#22C55E" : "#EF4444",
              fontSize: "0.78rem",
            }}>
              {message.text}
            </div>
          )}
        </div>

        {/* Method badge */}
        {attendance?.method && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <span style={{
              fontSize: "0.6rem", color: "#303030", letterSpacing: "0.12em",
              border: "1px solid #1C1C1C", borderRadius: 6, padding: "3px 8px",
            }}>
              {attendance.method}
            </span>
          </div>
        )}

        {/* Recent Attendance */}
        {recentAttendance.length > 0 && (
          <div style={{
            background: "#0E0E0E", border: "1px solid #1C1C1C",
            borderRadius: 14, padding: "14px 16px", marginBottom: 12,
          }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#383838", marginBottom: 10 }}>
              Últimas asistencias
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentAttendance.map((rec) => (
                <div key={rec.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.75rem", color: "#505050" }}>
                    {formatShortDate(rec.date)}
                  </span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: "0.75rem", color: rec.checkIn ? "#22C55E" : "#383838", fontVariantNumeric: "tabular-nums" }}>
                      {formatTime(rec.checkIn)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#303030" }}>→</span>
                    <span style={{ fontSize: "0.75rem", color: rec.checkOut ? "#3B82F6" : "#383838", fontVariantNumeric: "tabular-nums" }}>
                      {formatTime(rec.checkOut)}
                    </span>
                  </div>
                  <span style={{
                    fontSize: "0.6rem", letterSpacing: "0.08em",
                    color: rec.status === "PRESENTE" ? "#22C55E" : rec.status === "TARDANZA" ? "#F59E0B" : "#505050",
                  }}>
                    {rec.status ?? ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Requests */}
        {totalPending > 0 && (
          <div style={{
            background: "#0E0E0E", border: "1px solid #1C1C1C",
            borderRadius: 14, padding: "14px 16px", marginBottom: 28,
          }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#383838", marginBottom: 10 }}>
              Solicitudes pendientes ({totalPending})
            </div>
            {pendingVac.map((v) => (
              <div key={v.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 0", borderBottom: "1px solid #151515",
              }}>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "#c8cdd8" }}>Vacaciones</span>
                  {v.reason && <span style={{ fontSize: "0.68rem", color: "#505050", marginLeft: 6 }}>{v.reason}</span>}
                </div>
                <div style={{ fontSize: "0.68rem", color: "#6b7280" }}>
                  {formatShortDate(v.startDate)} – {formatShortDate(v.endDate)}
                </div>
              </div>
            ))}
            {pendingPerm.map((p) => (
              <div key={p.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 0", borderBottom: "1px solid #151515",
              }}>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "#c8cdd8" }}>Permiso</span>
                  {p.type && <span style={{ fontSize: "0.68rem", color: "#505050", marginLeft: 6 }}>{p.type}</span>}
                </div>
                <div style={{ fontSize: "0.68rem", color: "#6b7280" }}>
                  {formatShortDate(p.date)} · {p.hours}h
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#383838", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: "0.78rem", color: "#c8cdd8" }}>{value}</div>
    </div>
  );
}
