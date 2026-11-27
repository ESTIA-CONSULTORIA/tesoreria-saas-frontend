import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "./portalPaleta";
import EmployeeLayout from "./EmployeeLayout";
import { employeeApi } from "../../core/api/employeeApi";
import { unirSolicitudes, type Item } from "./solicitudes.util";
import { Aviso, Etiqueta, Titulo, Vacio, abrirDocumento, boton, botonSec, card, input, mensajeError } from "./portalUi";

type Tipo = "vacaciones" | "permiso" | "recibo" | "carta";

export default function EmployeeSolicitudes() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setItems(unirSolicitudes((await employeeApi.get("/hr/portal/mis-solicitudes")).data));
    } catch (e: any) {
      if (e?.response?.status === 401) navigate("/employee");
      else setError(mensajeError(e, "No se pudieron cargar tus solicitudes."));
    } finally {
      setCargando(false);
    }
  }, [navigate]);
  useEffect(() => { cargar(); }, [cargar]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo) return;
    setEnviando(true); setError(""); setOk("");
    try {
      if (tipo === "vacaciones") {
        const dias = Math.max(1, Math.round((new Date(f.fin).getTime() - new Date(f.inicio).getTime()) / 86400000) + 1);
        await employeeApi.post("/hr/portal/vacation-request", { startDate: f.inicio, endDate: f.fin, daysRequested: dias, reason: f.motivo });
      } else if (tipo === "permiso") {
        await employeeApi.post("/hr/portal/permission-request", { date: f.fecha, hours: parseFloat(f.horas || "1"), type: f.clase || "PERSONAL", reason: f.motivo });
      } else if (tipo === "recibo") {
        await employeeApi.post("/hr/portal/solicitud-recibo", { periodo: f.periodo, motivo: f.motivo });
      } else {
        await employeeApi.post("/hr/portal/solicitud-carta", { dirigidaA: f.dirigidaA, motivo: f.motivo });
      }
      setOk("Solicitud enviada. Queda en espera de aprobación de RH.");
      setTipo(null); setF({});
      await cargar();
    } catch (err: any) {
      setError(mensajeError(err, "No se pudo enviar la solicitud."));
    } finally {
      setEnviando(false);
    }
  }

  async function bajar(it: Item) {
    setError("");
    try {
      const d = (await employeeApi.get(`/hr/portal/documento/${it.documentId}`)).data;
      if (!abrirDocumento({ nombre: it.tipo, fileData: d.fileData, url: d.url })) setError("El archivo no está disponible todavía.");
    } catch (e: any) { setError(mensajeError(e, "No se pudo descargar el documento.")); }
  }

  const TIPOS: [Tipo, string][] = [["vacaciones", "Vacaciones"], ["permiso", "Permiso"], ["recibo", "Recibo de nómina"], ["carta", "Carta de trabajo"]];

  return (
    <EmployeeLayout>
      <Titulo>Mis solicitudes</Titulo>
      <div role="group" aria-label="Nueva solicitud" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {TIPOS.map(([t, l]) => (
          <button key={t} style={{ ...botonSec, ...(tipo === t ? { background: C.activo, color: C.blanco, borderColor: C.blanco } : {}) }} aria-pressed={tipo === t} onClick={() => { setTipo(tipo === t ? null : t); setF({}); setError(""); setOk(""); }}>{l}</button>
        ))}
      </div>
      <Aviso texto={error} />
      <Aviso texto={ok} ok />

      {tipo && (
        <form onSubmit={enviar} style={{ ...card, display: "grid", gap: 10, marginBottom: 14 }} aria-label={`Solicitud de ${TIPOS.find((x) => x[0] === tipo)?.[1]}`}>
          {tipo === "vacaciones" && (<>
            <label>Del<input type="date" required value={f.inicio ?? ""} onChange={set("inicio")} style={{ ...input, marginTop: 4 }} /></label>
            <label>Al<input type="date" required min={f.inicio} value={f.fin ?? ""} onChange={set("fin")} style={{ ...input, marginTop: 4 }} /></label>
          </>)}
          {tipo === "permiso" && (<>
            <label>Día<input type="date" required value={f.fecha ?? ""} onChange={set("fecha")} style={{ ...input, marginTop: 4 }} /></label>
            <label>Horas<input type="number" min="0.5" step="0.5" required value={f.horas ?? "1"} onChange={set("horas")} style={{ ...input, marginTop: 4 }} /></label>
            <label>Tipo<select value={f.clase ?? "PERSONAL"} onChange={set("clase")} style={{ ...input, marginTop: 4 }}><option value="PERSONAL">Personal</option><option value="MEDICO">Médico</option><option value="FAMILIAR">Familiar</option><option value="OTRO">Otro</option></select></label>
          </>)}
          {tipo === "recibo" && <label>¿De qué periodo?<input required minLength={3} placeholder="Ej. 1 al 15 de noviembre 2026" value={f.periodo ?? ""} onChange={set("periodo")} style={{ ...input, marginTop: 4 }} /></label>}
          {tipo === "carta" && <label>¿A quién va dirigida?<input placeholder="A quien corresponda" value={f.dirigidaA ?? ""} onChange={set("dirigidaA")} style={{ ...input, marginTop: 4 }} /></label>}
          <label>Motivo{tipo === "vacaciones" || tipo === "permiso" ? "" : " (opcional)"}<input required={tipo === "vacaciones" || tipo === "permiso"} value={f.motivo ?? ""} onChange={set("motivo")} style={{ ...input, marginTop: 4 }} /></label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={boton} disabled={enviando}>{enviando ? "Enviando…" : "Enviar solicitud"}</button>
            <button type="button" style={botonSec} onClick={() => setTipo(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {cargando ? <Vacio texto="Cargando…" /> : items.length === 0 ? <Vacio texto="Aún no has hecho solicitudes." /> : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {items.map((it) => (
            <li key={it.clave} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: C.suave, letterSpacing: "0.06em" }}>{it.tipo}</div>
                  <div style={{ fontSize: "0.92rem" }}>{it.titulo}</div>
                  {it.detalle && <div style={{ fontSize: "0.78rem", color: C.suave }}>{it.detalle}</div>}
                </div>
                <Etiqueta estado={it.status} />
              </div>
              {it.nota && <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: it.status === "RECHAZADA" ? C.error : C.medio }}>{it.status === "RECHAZADA" ? "Motivo: " : "RH: "}{it.nota}</p>}
              {it.status === "APROBADA" && it.documentId && <button style={{ ...botonSec, marginTop: 8 }} onClick={() => bajar(it)}>Descargar</button>}
            </li>
          ))}
        </ul>
      )}
    </EmployeeLayout>
  );
}
