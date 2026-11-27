import { useCallback, useEffect, useState } from "react";
import { api } from "../../core/api/api";

// Bandeja de RH para lo que piden los empleados desde su portal: recibos, cartas de trabajo y correcciones de asistencia
// (vacaciones y permisos siguen en su propia lista, arriba). Aprobar o rechazar; el rechazo exige motivo.
interface Solicitud {
  id: string; tipo: "RECIBO" | "CARTA" | "CORRECCION_ASISTENCIA"; status: string; employeeNombre?: string | null;
  detalle?: Record<string, any> | null; motivo?: string | null; responseNote?: string | null; createdAt: string;
}

const NOMBRE: Record<string, string> = { RECIBO: "Recibo de nómina", CARTA: "Carta de trabajo", CORRECCION_ASISTENCIA: "Corrección de salida" };
const tarjeta: React.CSSProperties = { padding: 12, borderRadius: 10, border: "1px solid rgb(var(--border))", background: "rgb(var(--veil) / 0.04)" };
const campo: React.CSSProperties = { padding: "6px 9px", fontSize: 12, borderRadius: 6, border: "1px solid rgb(var(--border))", background: "transparent", color: "rgb(var(--text-1))" };
const boton: React.CSSProperties = { padding: "5px 12px", fontSize: 12, borderRadius: 6, border: "1px solid rgb(var(--border))", background: "transparent", color: "rgb(var(--text-1))", cursor: "pointer" };

function detalleTexto(s: Solicitud) {
  if (s.tipo === "RECIBO") return `Periodo: ${s.detalle?.periodo ?? "—"}`;
  if (s.tipo === "CARTA") return `Dirigida a: ${s.detalle?.dirigidaA ?? "A quien corresponda"}`;
  return `Salida del ${s.detalle?.fecha} a las ${s.detalle?.hora}`;
}

export default function BandejaPortal({ headers }: { headers: Record<string, string> }) {
  const [lista, setLista] = useState<Solicitud[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [incluirSueldo, setIncluirSueldo] = useState<Record<string, boolean>>({});
  const [cfg, setCfg] = useState({ firmanteNombre: "", firmanteCargo: "" });

  const cargar = useCallback(async () => {
    try {
      const [b, c] = await Promise.all([api.get("/hr/requests/portal", { headers }), api.get("/hr/portal-config", { headers })]);
      setLista(b.data?.solicitudes ?? []);
      setCfg({ firmanteNombre: c.data?.firmanteNombre ?? "", firmanteCargo: c.data?.firmanteCargo ?? "" });
    } catch (e: any) {
      setError(e?.response?.data?.message || "No se pudo cargar la bandeja del portal.");
    }
  }, [headers]);
  useEffect(() => { cargar(); }, [cargar]);

  async function resolver(s: Solicitud, accion: "approve" | "reject") {
    setError(""); setOk("");
    try {
      const body = accion === "reject" ? { responseNote: motivo } : { incluirSueldo: !!incluirSueldo[s.id] };
      await api.put(`/hr/requests/portal/${s.id}/${accion}`, body, { headers });
      setOk(accion === "approve" ? "Solicitud aprobada." : "Solicitud rechazada.");
      setRechazando(null); setMotivo("");
      await cargar();
    } catch (e: any) {
      setError(e?.response?.data?.message || "No se pudo responder la solicitud.");
    }
  }

  async function guardarCfg(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setOk("");
    try {
      await api.put("/hr/portal-config", cfg, { headers });
      setOk("Firmante de las cartas guardado.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudo guardar el firmante.");
    }
  }

  return (
    <section aria-label="Solicitudes del portal del empleado" style={{ marginTop: 22 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", color: "rgb(var(--text-1))" }}>Portal del empleado: recibos, cartas y correcciones</h3>
      {error && <div role="alert" style={{ ...tarjeta, color: "rgb(var(--text-1))", marginBottom: 10 }}>{error}</div>}
      {ok && <div role="status" style={{ ...tarjeta, color: "rgb(var(--text-1))", marginBottom: 10 }}>{ok}</div>}

      <form onSubmit={guardarCfg} style={{ ...tarjeta, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginBottom: 12 }} aria-label="Quién firma las cartas de trabajo">
        <label style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>Firmante de las cartas
          <input required value={cfg.firmanteNombre} onChange={(e) => setCfg({ ...cfg, firmanteNombre: e.target.value })} placeholder="Nombre completo" style={{ ...campo, display: "block", marginTop: 3 }} />
        </label>
        <label style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>Cargo
          <input required value={cfg.firmanteCargo} onChange={(e) => setCfg({ ...cfg, firmanteCargo: e.target.value })} placeholder="Ej. Directora de RH" style={{ ...campo, display: "block", marginTop: 3 }} />
        </label>
        <button type="submit" style={boton}>Guardar firmante</button>
      </form>

      {lista.length === 0 ? <p style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>No hay solicitudes del portal en espera.</p> : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {lista.map((s) => (
            <li key={s.id} style={tarjeta}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13, color: "rgb(var(--text-1))" }}>{NOMBRE[s.tipo]} · {s.employeeNombre ?? "Empleado"}</div>
                  <div style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>{detalleTexto(s)}{s.motivo ? ` · ${s.motivo}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {s.tipo === "CARTA" && (
                    <label style={{ fontSize: 12, color: "rgb(var(--text-2))" }}>
                      <input type="checkbox" checked={!!incluirSueldo[s.id]} onChange={(e) => setIncluirSueldo({ ...incluirSueldo, [s.id]: e.target.checked })} /> Incluir sueldo
                    </label>
                  )}
                  <button style={boton} onClick={() => resolver(s, "approve")}>Aprobar</button>
                  <button style={boton} onClick={() => { setRechazando(rechazando === s.id ? null : s.id); setMotivo(""); }}>Rechazar</button>
                </div>
              </div>
              {rechazando === s.id && (
                <form onSubmit={(e) => { e.preventDefault(); resolver(s, "reject"); }} style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input required minLength={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo del rechazo (obligatorio)" aria-label="Motivo del rechazo" style={{ ...campo, flex: 1 }} />
                  <button type="submit" style={boton}>Confirmar rechazo</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
