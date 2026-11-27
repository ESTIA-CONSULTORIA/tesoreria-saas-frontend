import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "./portalPaleta";
import EmployeeLayout from "./EmployeeLayout";
import { employeeApi } from "../../core/api/employeeApi";
import { Aviso, Titulo, Vacio, boton, botonSec, card, input, mensajeError } from "./portalUi";

interface Registro { id: string; date: string; checkIn?: string; checkOut?: string; status: string; fueraDeZona?: boolean }
interface Olvido { fecha: string; entrada: string }

const hora = (v?: string) => (v ? new Date(v).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "—");
const dia = (v: string) => new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });

export default function EmployeeAttendance() {
  const navigate = useNavigate();
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [resumen, setResumen] = useState({ dias: 0, tardanzas: 0, sinSalida: 0, fueraDeZona: 0 });
  const [olvidos, setOlvidos] = useState<Olvido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);
  const [form, setForm] = useState({ hora: "17:00", motivo: "" });
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [h, o] = await Promise.all([employeeApi.get("/hr/portal/asistencia", { params: { mes } }), employeeApi.get("/hr/portal/salidas-olvidadas")]);
      setRegistros(h.data?.registros ?? []);
      setResumen(h.data?.resumen ?? { dias: 0, tardanzas: 0, sinSalida: 0, fueraDeZona: 0 });
      setOlvidos(Array.isArray(o.data) ? o.data : []);
    } catch (e: any) {
      if (e?.response?.status === 401) navigate("/employee");
      else setError(mensajeError(e, "No se pudo cargar tu asistencia."));
    } finally {
      setCargando(false);
    }
  }, [mes, navigate]);

  useEffect(() => { cargar(); }, [cargar]);

  async function pedirCorreccion(e: React.FormEvent) {
    e.preventDefault();
    if (!corrigiendo) return;
    setEnviando(true);
    setError("");
    try {
      await employeeApi.post("/hr/portal/correccion-asistencia", { fecha: corrigiendo, hora: form.hora, motivo: form.motivo });
      setOk("Pedimos la corrección a RH. Verás su respuesta en Solicitudes.");
      setCorrigiendo(null);
      setForm({ hora: "17:00", motivo: "" });
      await cargar();
    } catch (err: any) {
      setError(mensajeError(err, "No se pudo enviar la corrección."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <EmployeeLayout>
      <Titulo aside={<label style={{ fontSize: "0.8rem", color: C.medio }}>Mes <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} style={{ ...input, width: "auto", marginLeft: 6 }} /></label>}>Mi asistencia</Titulo>
      <Aviso texto={error} />
      <Aviso texto={ok} ok />

      {olvidos.length > 0 && (
        <section aria-label="Salidas olvidadas" style={{ ...card, borderColor: C.avisoBorde, marginBottom: 14 }}>
          <div style={{ color: C.aviso, fontWeight: 600, fontSize: "0.9rem", marginBottom: 8 }}>Olvidaste registrar tu salida</div>
          {olvidos.map((o) => (
            <div key={o.fecha} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "6px 0", fontSize: "0.85rem", color: C.claro }}>
              <span>{dia(o.fecha)} · entrada {hora(o.entrada)}</span>
              <button style={botonSec} onClick={() => { setCorrigiendo(o.fecha); setOk(""); }}>Pedir corrección</button>
            </div>
          ))}
        </section>
      )}

      {corrigiendo && (
        <form onSubmit={pedirCorreccion} style={{ ...card, marginBottom: 14, display: "grid", gap: 10 }} aria-label="Pedir corrección de salida">
          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Corrección del {dia(corrigiendo)}</div>
          <label style={{ fontSize: "0.78rem", color: C.medio }}>Hora real de salida
            <input type="time" required value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} style={{ ...input, marginTop: 4 }} />
          </label>
          <label style={{ fontSize: "0.78rem", color: C.medio }}>Motivo
            <input required minLength={5} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ej. Olvidé checar al salir" style={{ ...input, marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={boton} disabled={enviando}>{enviando ? "Enviando…" : "Enviar a RH"}</button>
            <button type="button" style={botonSec} onClick={() => setCorrigiendo(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 14 }}>
        {[["Días con registro", resumen.dias], ["Tardanzas", resumen.tardanzas], ["Sin salida", resumen.sinSalida], ["Fuera de zona", resumen.fueraDeZona]].map(([t, v]) => (
          <div key={String(t)} style={card}><div style={{ fontSize: "0.72rem", color: C.suave }}>{t}</div><div style={{ fontSize: "1.3rem", fontWeight: 600 }}>{v}</div></div>
        ))}
      </div>

      {cargando ? <Vacio texto="Cargando…" /> : registros.length === 0 ? <Vacio texto="No hay registros de asistencia en este mes." /> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <caption style={{ position: "absolute", left: -9999 }}>Asistencia del mes</caption>
          <thead><tr style={{ color: C.suave, textAlign: "left" }}><th scope="col" style={{ padding: "6px 8px" }}>Día</th><th scope="col">Entrada</th><th scope="col">Salida</th><th scope="col">Estado</th></tr></thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id} style={{ borderTop: `1px solid ${C.borde}` }}>
                <td style={{ padding: "8px" }}>{dia(r.date)}</td>
                <td>{hora(r.checkIn)}</td>
                <td>{r.checkOut ? hora(r.checkOut) : <span style={{ color: C.aviso }}>sin salida</span>}</td>
                <td>{r.status}{r.fueraDeZona ? <span style={{ color: C.error }}> · fuera de zona</span> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </EmployeeLayout>
  );
}
