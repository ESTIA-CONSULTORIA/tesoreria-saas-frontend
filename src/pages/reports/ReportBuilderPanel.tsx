import { useCallback, useEffect, useState } from "react";
import { api } from "../../core/api/api";
import { usePuede } from "../../core/hooks/usePuede";

// Reportes a la medida: eliges qué analizar, cómo agrupar y el periodo; se puede guardar como plantilla. Todo sale del servidor, acotado a tu negocio.
interface Catalogo { fuentes: Record<string, { nombre: string; medidas: Record<string, string>; dimensiones: Record<string, string> }>; periodos: Record<string, string> }
interface Resultado { titulo: string; periodo: { nombre: string; desde: string; hasta: string }; filas: { etiqueta: string; valor: number }[]; esDinero: boolean }
interface Plantilla { id: string; nombre: string; spec: { fuente: string; medida: string; dimension: string; periodo: string } }

const campo: React.CSSProperties = { padding: "6px 9px", fontSize: 13, borderRadius: 6, border: "1px solid rgb(var(--border))", background: "transparent", color: "rgb(var(--text-1))" };
const boton: React.CSSProperties = { padding: "7px 14px", fontSize: 13, borderRadius: 6, border: "1px solid rgb(var(--border))", background: "transparent", color: "rgb(var(--text-1))", cursor: "pointer" };
const fmt = (n: number, dinero: boolean) => (dinero ? n.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : n.toLocaleString("es-MX"));

export default function ReportBuilderPanel() {
  const puedeCrear = usePuede("reportes", "crear");
  const [cat, setCat] = useState<Catalogo | null>(null);
  const [spec, setSpec] = useState({ fuente: "ventas", medida: "total", dimension: "mes", periodo: "mes" });
  const [res, setRes] = useState<Resultado | null>(null);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [nombre, setNombre] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargarPlantillas = useCallback(async () => {
    try { const r = await api.get("/reports/builder/plantillas"); setPlantillas(Array.isArray(r.data) ? r.data : []); } catch { setPlantillas([]); }
  }, []);
  useEffect(() => {
    api.get("/reports/builder/catalogo").then((r) => setCat(r.data)).catch((e) => setMsg({ t: e?.response?.data?.message || "No se pudo cargar el catálogo de reportes.", ok: false }));
    cargarPlantillas();
  }, [cargarPlantillas]);

  const fuente = cat?.fuentes[spec.fuente];

  function cambiarFuente(f: string) {
    const x = cat?.fuentes[f];
    if (x) setSpec({ ...spec, fuente: f, medida: Object.keys(x.medidas)[0], dimension: Object.keys(x.dimensiones)[0] });
  }

  async function ejecutar(s = spec) {
    setCargando(true); setMsg(null);
    try { setRes((await api.post("/reports/builder/ejecutar", s)).data); }
    catch (e: any) { setRes(null); setMsg({ t: e?.response?.data?.message || "No se pudo generar el reporte.", ok: false }); }
    finally { setCargando(false); }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    try { await api.post("/reports/builder/plantillas", { nombre, spec }); setNombre(""); setMsg({ t: "Reporte guardado.", ok: true }); await cargarPlantillas(); }
    catch (err: any) { setMsg({ t: err?.response?.data?.message || "No se pudo guardar el reporte.", ok: false }); }
  }

  async function borrar(id: string) {
    try { await api.delete(`/reports/builder/plantillas/${id}`); await cargarPlantillas(); }
    catch (err: any) { setMsg({ t: err?.response?.data?.message || "No se pudo borrar el reporte.", ok: false }); }
  }

  const maximo = Math.max(1, ...(res?.filas.map((f) => f.valor) ?? [1]));

  return (
    <section aria-label="Reportes a la medida" style={{ border: "1px solid rgb(var(--border))", borderRadius: 12, padding: 16 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px", color: "rgb(var(--text-1))" }}>Reportes a la medida</h3>
      <p style={{ fontSize: 12, color: "rgb(var(--text-3))", margin: "0 0 12px" }}>Elige qué analizar y cómo agruparlo. Los datos salen solo de tu negocio.</p>
      {msg && <div role={msg.ok ? "status" : "alert"} style={{ ...campo, display: "block", marginBottom: 10 }}>{msg.t}</div>}

      {cat && fuente && (
        <form onSubmit={(e) => { e.preventDefault(); ejecutar(); }} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
          {[
            ["Analizar", "fuente", Object.fromEntries(Object.entries(cat.fuentes).map(([k, v]) => [k, v.nombre]))],
            ["Medir", "medida", fuente.medidas],
            ["Agrupar", "dimension", fuente.dimensiones],
            ["Periodo", "periodo", cat.periodos],
          ].map(([etiqueta, clave, opciones]: any) => (
            <label key={clave} style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>{etiqueta}
              <select value={(spec as any)[clave]} onChange={(e) => (clave === "fuente" ? cambiarFuente(e.target.value) : setSpec({ ...spec, [clave]: e.target.value }))} style={{ ...campo, display: "block", marginTop: 3, minWidth: 150 }}>
                {Object.entries(opciones).map(([k, v]) => <option key={k} value={k}>{String(v)}</option>)}
              </select>
            </label>
          ))}
          <button type="submit" style={boton} disabled={cargando}>{cargando ? "Generando…" : "Generar reporte"}</button>
        </form>
      )}

      {res && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "rgb(var(--text-1))" }}>{res.titulo}</div>
          <div style={{ fontSize: 12, color: "rgb(var(--text-3))", marginBottom: 6 }}>{res.periodo.nombre} ({res.periodo.desde} al {res.periodo.hasta})</div>
          {res.filas.length === 0 ? <p style={{ fontSize: 13, color: "rgb(var(--text-3))" }}>No hay datos en ese periodo.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "rgb(var(--text-1))" }}>
              <caption style={{ position: "absolute", left: -9999 }}>{res.titulo}</caption>
              <thead><tr style={{ textAlign: "left", color: "rgb(var(--text-3))" }}><th scope="col" style={{ padding: "5px 8px" }}>Grupo</th><th scope="col" style={{ textAlign: "right" }}>Valor</th><th scope="col" aria-hidden="true" style={{ width: "40%" }} /></tr></thead>
              <tbody>
                {res.filas.map((f) => (
                  <tr key={f.etiqueta} style={{ borderTop: "1px solid rgb(var(--border))" }}>
                    <td style={{ padding: "5px 8px" }}>{f.etiqueta}</td>
                    <td style={{ textAlign: "right" }}>{fmt(f.valor, res.esDinero)}</td>
                    <td aria-hidden="true"><div style={{ height: 8, borderRadius: 4, width: `${Math.max(2, (f.valor / maximo) * 100)}%`, background: "rgb(var(--accent))" }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {puedeCrear && (
            <form onSubmit={guardar} style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input required minLength={3} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre para guardar este reporte" aria-label="Nombre del reporte" style={{ ...campo, flex: 1 }} />
              <button type="submit" style={boton}>Guardar reporte</button>
            </form>
          )}
        </div>
      )}

      {plantillas.length > 0 && (
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 600, margin: "6px 0", color: "rgb(var(--text-1))" }}>Mis reportes guardados</h4>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {plantillas.map((p) => (
              <li key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", borderTop: "1px solid rgb(var(--border))", fontSize: 13, color: "rgb(var(--text-1))" }}>
                <span style={{ flex: 1 }}>{p.nombre}</span>
                <button style={boton} onClick={() => { setSpec(p.spec); ejecutar(p.spec); }}>Abrir</button>
                {puedeCrear && <button style={boton} onClick={() => borrar(p.id)} aria-label={`Borrar ${p.nombre}`}>Borrar</button>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
