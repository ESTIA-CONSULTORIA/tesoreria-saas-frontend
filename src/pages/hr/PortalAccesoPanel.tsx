import { useCallback, useEffect, useState } from "react";
import { api } from "../../core/api/api";

// Ficha del empleado: RH le da (o le quita) el acceso a su portal. La contraseña inicial la escribe RH y se la entrega en persona.
interface Estado { tieneAcceso: boolean; email?: string | null; activo?: boolean }
const campo: React.CSSProperties = { padding: "6px 9px", fontSize: 12, borderRadius: 6, border: "1px solid rgb(var(--border))", background: "transparent", color: "rgb(var(--text-1))" };
const boton: React.CSSProperties = { padding: "6px 12px", fontSize: 12, borderRadius: 6, border: "1px solid rgb(var(--border))", background: "transparent", color: "rgb(var(--text-1))", cursor: "pointer" };

export default function PortalAccesoPanel({ employeeId, headers }: { employeeId: string; headers: Record<string, string> }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  const cargar = useCallback(async () => {
    try { setEstado((await api.get(`/hr/employees/${employeeId}/portal-access`, { headers })).data); }
    catch (e: any) { setMsg({ t: e?.response?.data?.message || "No se pudo consultar el acceso al portal.", ok: false }); }
  }, [employeeId, headers]);
  useEffect(() => { setMsg(null); setEstado(null); cargar(); }, [cargar]);

  async function dar(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api.post(`/hr/employees/${employeeId}/portal-access`, { email, password }, { headers });
      setMsg({ t: r.data?.mensaje || "Acceso creado.", ok: true });
      setPassword(""); setEmail("");
      await cargar();
    } catch (err: any) { setMsg({ t: err?.response?.data?.message || "No se pudo crear el acceso.", ok: false }); }
  }

  async function quitar() {
    try { await api.delete(`/hr/employees/${employeeId}/portal-access`, { headers }); setMsg({ t: "Acceso desactivado.", ok: true }); await cargar(); }
    catch (err: any) { setMsg({ t: err?.response?.data?.message || "No se pudo desactivar el acceso.", ok: false }); }
  }

  return (
    <section aria-label="Acceso al portal del empleado" style={{ border: "1px solid rgb(var(--border))", borderRadius: 10, padding: 14 }}>
      <h4 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 8px", color: "rgb(var(--text-1))" }}>Acceso al portal del empleado</h4>
      {msg && <p role={msg.ok ? "status" : "alert"} style={{ fontSize: 12, margin: "0 0 8px", color: "rgb(var(--text-1))" }}>{msg.t}</p>}
      {estado?.tieneAcceso ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: "rgb(var(--text-2))" }}>
          <span>Entra con <strong>{estado.email}</strong> · {estado.activo ? "activo" : "desactivado"}</span>
          {estado.activo && <button style={boton} onClick={quitar}>Quitar acceso</button>}
        </div>
      ) : estado ? (
        <form onSubmit={dar} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>Correo del empleado
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...campo, display: "block", marginTop: 3 }} />
          </label>
          <label style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>Contraseña inicial (mín. 8)
            <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...campo, display: "block", marginTop: 3 }} />
          </label>
          <button type="submit" style={boton}>Dar acceso</button>
        </form>
      ) : <span style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>Cargando…</span>}
      <p style={{ fontSize: 11, color: "rgb(var(--text-3))", margin: "8px 0 0" }}>El empleado entra en «Portal del empleado» con ese correo. Entrégale la contraseña en persona.</p>
    </section>
  );
}
