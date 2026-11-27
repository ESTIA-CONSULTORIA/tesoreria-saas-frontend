import { useCallback, useEffect, useState } from "react";
import { api } from "../../core/api/api";
import { usePuede } from "../../core/hooks/usePuede";

// Existencias por almacén y traspasos. El total de cada insumo no cambia al traspasar; el almacén «Principal» tiene lo que no esté en otro.
interface AlmacenCant { almacenId: string; nombre: string; cantidad: number; esPrincipal: boolean }
interface FilaInsumo { insumoId: string; nombre: string; unidad: string; total: number; almacenes: AlmacenCant[] }
interface Almacen { id: string; nombre: string; esPrincipal?: boolean; isActive?: boolean }
interface Traspaso { id: string; folio: string; insumo: string | null; origen: string | null; destino: string | null; cantidad: number; notas?: string | null; createdAt: string }

const campo: React.CSSProperties = { padding: "6px 9px", fontSize: 13, borderRadius: 6, border: "1px solid rgb(var(--border))", background: "transparent", color: "rgb(var(--text-1))" };
const boton: React.CSSProperties = { padding: "7px 14px", fontSize: 13, borderRadius: 6, border: "1px solid rgb(var(--border))", background: "transparent", color: "rgb(var(--text-1))", cursor: "pointer" };

export default function InventarioAlmacenPanel() {
  const puedeCrear = usePuede("costos", "crear");
  const [filas, setFilas] = useState<FilaInsumo[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [traspasos, setTraspasos] = useState<Traspaso[]>([]);
  const [f, setF] = useState({ insumoId: "", origenId: "", destinoId: "", cantidad: "", notas: "" });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [e, a, t] = await Promise.all([api.get("/costs/inventario/existencias"), api.get("/costs/inventario/almacenes"), api.get("/costs/inventario/traspasos")]);
      setFilas(e.data?.insumos ?? []);
      setAlmacenes((Array.isArray(a.data) ? a.data : []).filter((x: Almacen) => x.isActive !== false));
      setTraspasos(Array.isArray(t.data) ? t.data : []);
    } catch (err: any) {
      setMsg({ t: err?.response?.data?.message || "No se pudo cargar el inventario por almacén.", ok: false });
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function traspasar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true); setMsg(null);
    try {
      const r = await api.post("/costs/inventario/traspasos", { ...f, cantidad: Number(f.cantidad) });
      setMsg({ t: `Traspaso ${r.data?.folio} registrado.`, ok: true });
      setF({ ...f, cantidad: "", notas: "" });
      await cargar();
    } catch (err: any) {
      setMsg({ t: err?.response?.data?.message || "No se pudo hacer el traspaso.", ok: false });
    } finally { setEnviando(false); }
  }

  const insumo = filas.find((x) => x.insumoId === f.insumoId);
  const disponible = insumo?.almacenes.find((a) => a.almacenId === f.origenId)?.cantidad;

  return (
    <section aria-label="Inventario por almacén y traspasos" style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 10px", color: "rgb(var(--text-1))" }}>Existencias por almacén</h3>
      {msg && <div role={msg.ok ? "status" : "alert"} style={{ ...campo, marginBottom: 10, display: "block" }}>{msg.t}</div>}

      {puedeCrear && (
        <form onSubmit={traspasar} aria-label="Nuevo traspaso" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>Insumo
            <select required value={f.insumoId} onChange={(e) => setF({ ...f, insumoId: e.target.value })} style={{ ...campo, display: "block", marginTop: 3, minWidth: 170 }}>
              <option value="">Elegir…</option>{filas.map((x) => <option key={x.insumoId} value={x.insumoId}>{x.nombre}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>Desde
            <select required value={f.origenId} onChange={(e) => setF({ ...f, origenId: e.target.value })} style={{ ...campo, display: "block", marginTop: 3 }}>
              <option value="">Elegir…</option>{almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>Hacia
            <select required value={f.destinoId} onChange={(e) => setF({ ...f, destinoId: e.target.value })} style={{ ...campo, display: "block", marginTop: 3 }}>
              <option value="">Elegir…</option>{almacenes.filter((a) => a.id !== f.origenId).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>Cantidad{disponible !== undefined ? ` (hay ${disponible})` : ""}
            <input required type="number" min="0.0001" step="any" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value })} style={{ ...campo, display: "block", marginTop: 3, width: 110 }} />
          </label>
          <label style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>Nota (opcional)
            <input value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} style={{ ...campo, display: "block", marginTop: 3 }} />
          </label>
          <button type="submit" style={boton} disabled={enviando}>{enviando ? "Traspasando…" : "Traspasar"}</button>
        </form>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "rgb(var(--text-1))" }}>
          <caption style={{ position: "absolute", left: -9999 }}>Existencias de cada insumo en cada almacén</caption>
          <thead><tr style={{ textAlign: "left", color: "rgb(var(--text-3))" }}><th scope="col" style={{ padding: "6px 8px" }}>Insumo</th><th scope="col">Total</th><th scope="col">Por almacén</th></tr></thead>
          <tbody>
            {filas.map((x) => (
              <tr key={x.insumoId} style={{ borderTop: "1px solid rgb(var(--border))" }}>
                <td style={{ padding: "6px 8px" }}>{x.nombre}</td>
                <td>{x.total} {x.unidad}</td>
                <td>{x.almacenes.map((a) => `${a.nombre}: ${a.cantidad}`).join(" · ")}</td>
              </tr>
            ))}
            {filas.length === 0 && <tr><td colSpan={3} style={{ padding: 10, color: "rgb(var(--text-3))" }}>Aún no hay insumos.</td></tr>}
          </tbody>
        </table>
      </div>

      <h4 style={{ fontSize: 14, fontWeight: 600, margin: "16px 0 6px", color: "rgb(var(--text-1))" }}>Traspasos recientes</h4>
      {traspasos.length === 0 ? <p style={{ fontSize: 12, color: "rgb(var(--text-3))" }}>Todavía no hay traspasos.</p> : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 13, color: "rgb(var(--text-1))" }}>
          {traspasos.slice(0, 15).map((t) => (
            <li key={t.id} style={{ padding: "5px 0", borderTop: "1px solid rgb(var(--border))" }}>
              <strong>{t.folio}</strong> · {t.insumo} · {Number(t.cantidad)} · {t.origen} → {t.destino} · {new Date(t.createdAt).toLocaleDateString("es-MX")}{t.notas ? ` · ${t.notas}` : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
