import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "./portalPaleta";
import EmployeeLayout from "./EmployeeLayout";
import { employeeApi } from "../../core/api/employeeApi";
import { Aviso, Titulo, Vacio, abrirDocumento, botonSec, card, mensajeError } from "./portalUi";

interface Recibo { id: string; nombre: string; fecha: string }

export default function EmployeeReceipts() {
  const navigate = useNavigate();
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [leyenda, setLeyenda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [bajando, setBajando] = useState<string | null>(null);

  useEffect(() => {
    employeeApi.get("/hr/portal/recibos")
      .then((r) => { setRecibos(r.data?.recibos ?? []); setLeyenda(r.data?.leyenda ?? ""); })
      .catch((e) => { if (e?.response?.status === 401) navigate("/employee"); else setError(mensajeError(e, "No se pudieron cargar tus recibos.")); })
      .finally(() => setCargando(false));
  }, [navigate]);

  async function descargar(r: Recibo) {
    setBajando(r.id);
    setError("");
    try {
      const d = (await employeeApi.get(`/hr/portal/documento/${r.id}`)).data;
      if (!abrirDocumento({ nombre: r.nombre, fileData: d.fileData, url: d.url })) setError("Este recibo no tiene archivo disponible. Pídelo a RH desde Solicitudes.");
    } catch (e: any) {
      setError(mensajeError(e, "No se pudo descargar el recibo."));
    } finally {
      setBajando(null);
    }
  }

  return (
    <EmployeeLayout>
      <Titulo aside={<button style={botonSec} onClick={() => navigate("/employee/requests")}>Pedir un recibo</button>}>Mis recibos de nómina</Titulo>
      {leyenda && <p style={{ ...card, color: C.aviso, borderColor: C.avisoBorde2, fontSize: "0.82rem", margin: "0 0 14px" }}>{leyenda}</p>}
      <Aviso texto={error} />
      {cargando ? <Vacio texto="Cargando…" /> : recibos.length === 0 ? <Vacio texto="Todavía no tienes recibos emitidos. Si necesitas uno, pídelo en Solicitudes." /> : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {recibos.map((r) => (
            <li key={r.id} style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: "0.9rem" }}>{r.nombre}</div>
                <div style={{ fontSize: "0.74rem", color: C.suave }}>Emitido el {new Date(r.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</div>
              </div>
              <button style={botonSec} disabled={bajando === r.id} onClick={() => descargar(r)}>{bajando === r.id ? "Descargando…" : "Descargar PDF"}</button>
            </li>
          ))}
        </ul>
      )}
    </EmployeeLayout>
  );
}
