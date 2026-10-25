import { useEffect, useMemo, useState } from "react";
import { api } from "../../core/api/api";
import {
  FILTROS_INICIALES, agruparPorEmpleado, fechaCorta, paramsSolicitudes, totalPaginas,
  type EmpleadoBasico, type FiltrosUI, type SolicitudRH,
} from "./solicitudes.utils";

interface Respuesta {
  vacaciones: SolicitudRH[];
  permisos: SolicitudRH[];
  totalVacaciones: number;
  totalPermisos: number;
  total: number;
}

const VACIA: Respuesta = { vacaciones: [], permisos: [], totalVacaciones: 0, totalPermisos: 0, total: 0 };

const card: React.CSSProperties = { padding: 14, borderRadius: 10, background: '#141820', border: '1px solid rgba(255,255,255,0.07)' };
const tenue: React.CSSProperties = { fontSize: 11.5, color: 'rgba(255,255,255,0.35)', margin: 0 };
const campo: React.CSSProperties = { padding: '5px 8px', fontSize: 12, borderRadius: 6, background: '#0f131a', border: '1px solid rgba(255,255,255,0.12)', color: '#c8cdd8' };
const btn = (verde: boolean): React.CSSProperties => ({
  padding: '4px 12px', fontSize: 11.5, borderRadius: 5, cursor: 'pointer',
  background: verde ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
  border: `1px solid ${verde ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
  color: verde ? '#4ade80' : 'rgba(252,165,165,0.8)',
});

export function SolicitudesTab({ headers, employees, onTotalPendientes }: {
  headers: Record<string, string>;
  employees: EmpleadoBasico[];
  onTotalPendientes?: (n: number) => void;
}) {
  const [filtros, setFiltros] = useState<FiltrosUI>(FILTROS_INICIALES);
  // El resultado guarda la petición a la que pertenece: "cargando" se deriva (sin setState síncrono en el efecto).
  const [resultado, setResultado] = useState<{ clave: string; data: Respuesta; error: string }>({ clave: "", data: VACIA, error: "" });
  const [errorAccion, setErrorAccion] = useState("");
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [recarga, setRecarga] = useState(0);
  const clave = JSON.stringify([filtros, recarga]);
  const cargando = resultado.clave !== clave;
  const data = resultado.data;
  const error = errorAccion || (cargando ? "" : resultado.error);

  useEffect(() => {
    let vigente = true;
    api.get("/hr/requests/pending", { headers, params: paramsSolicitudes(filtros) })
      .then((res) => {
        if (!vigente) return;
        const d = res.data ?? {};
        setResultado({
          clave,
          error: "",
          data: {
            vacaciones: d.vacaciones ?? [], permisos: d.permisos ?? [],
            totalVacaciones: d.totalVacaciones ?? (d.vacaciones?.length ?? 0),
            totalPermisos: d.totalPermisos ?? (d.permisos?.length ?? 0),
            total: d.total ?? ((d.vacaciones?.length ?? 0) + (d.permisos?.length ?? 0)),
          },
        });
        if (filtros.estado === 'PENDIENTE' && !filtros.desde && !filtros.hasta && !filtros.employeeId) onTotalPendientes?.(d.total ?? 0);
      })
      .catch(() => { if (vigente) setResultado({ clave, data: VACIA, error: "No se pudieron cargar las solicitudes." }); });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, recarga]);

  const cambiar = (parcial: Partial<FiltrosUI>) => setFiltros((f) => ({ ...f, page: 1, ...parcial }));
  const grupos = useMemo(() => agruparPorEmpleado(data.vacaciones, data.permisos, employees), [data, employees]);
  const paginas = totalPaginas(data.totalVacaciones, data.totalPermisos, filtros.limit);

  async function resolver(tipo: "vacation" | "permission", id: string, accion: "approve" | "reject") {
    let body: Record<string, string> = {};
    if (accion === "reject") {
      const nota = prompt("Motivo del rechazo:");
      if (nota === null) return;
      body = { responseNote: nota };
    }
    try {
      await api.put(`/hr/requests/${tipo}/${id}/${accion}`, body, { headers });
      setErrorAccion("");
      setRecarga((n) => n + 1);
    } catch { setErrorAccion("No se pudo actualizar la solicitud."); }
  }

  const acciones = (tipo: "vacation" | "permission", s: SolicitudRH) => (
    s.status && s.status !== 'PENDIENTE'
      ? <span style={tenue}>{s.status === 'APROBADA' ? 'Aprobada' : 'Rechazada'}</span>
      : <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => resolver(tipo, s.id, "approve")} style={btn(true)}>Aprobar</button>
          <button onClick={() => resolver(tipo, s.id, "reject")} style={btn(false)}>Rechazar</button>
        </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#c8cdd8' }}>Solicitudes</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <select aria-label="Estado" value={filtros.estado} onChange={(e) => cambiar({ estado: e.target.value as FiltrosUI['estado'] })} style={campo}>
          <option value="PENDIENTE">Pendientes</option>
          <option value="APROBADA">Aprobadas</option>
          <option value="RECHAZADA">Rechazadas</option>
          <option value="TODAS">Todas</option>
        </select>
        <select aria-label="Empleado" value={filtros.employeeId} onChange={(e) => cambiar({ employeeId: e.target.value })} style={campo}>
          <option value="">Todos los empleados</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{`${e.nombre} ${e.apellidos || ''}`.trim()}</option>)}
        </select>
        <label style={{ ...tenue, display: 'flex', alignItems: 'center', gap: 4 }}>Desde
          <input type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => cambiar({ desde: e.target.value })} style={campo} />
        </label>
        <label style={{ ...tenue, display: 'flex', alignItems: 'center', gap: 4 }}>Hasta
          <input type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => cambiar({ hasta: e.target.value })} style={campo} />
        </label>
        {(filtros.desde || filtros.hasta || filtros.employeeId || filtros.estado !== 'PENDIENTE') && (
          <button onClick={() => setFiltros(FILTROS_INICIALES)} style={{ ...campo, cursor: 'pointer' }}>Limpiar</button>
        )}
      </div>

      {error && <div style={{ ...card, color: 'rgba(252,165,165,0.9)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {cargando ? (
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Cargando...</div>
      ) : grupos.length === 0 && !error ? (
        <div style={{ ...card, padding: 24, color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
          {filtros.estado === 'PENDIENTE' ? 'Sin solicitudes pendientes' : 'Sin solicitudes con estos filtros'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {grupos.map((g) => {
            const abierto = abiertos[g.employeeId] ?? grupos.length <= 3;
            return (
              <div key={g.employeeId} style={card}>
                <button
                  onClick={() => setAbiertos((a) => ({ ...a, [g.employeeId]: !abierto }))}
                  aria-expanded={abierto}
                  style={{ all: 'unset', cursor: 'pointer', display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#c8cdd8' }}>{g.nombre}</span>
                    {g.puesto && <span style={{ ...tenue, marginLeft: 8 }}>{g.puesto}</span>}
                  </span>
                  <span style={tenue}>
                    {g.vacaciones.length > 0 && `${g.vacaciones.length} vacaciones`}
                    {g.vacaciones.length > 0 && g.permisos.length > 0 && ' · '}
                    {g.permisos.length > 0 && `${g.permisos.length} permisos`} {abierto ? '▾' : '▸'}
                  </span>
                </button>
                {abierto && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                    {g.vacaciones.map((v) => (
                      <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <p style={tenue}>🏖 {fechaCorta(v.startDate)} — {fechaCorta(v.endDate)} ({v.daysRequested} días)</p>
                        {acciones("vacation", v)}
                      </div>
                    ))}
                    {g.permisos.map((p) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <p style={tenue}>{fechaCorta(p.date)} · {p.hours}h · {p.type}</p>
                        {acciones("permission", p)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <span style={tenue}>{data.totalVacaciones} vacaciones · {data.totalPermisos} permisos en total</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={filtros.page <= 1 || cargando} onClick={() => setFiltros((f) => ({ ...f, page: f.page - 1 }))} style={{ ...campo, cursor: 'pointer' }}>‹ Anterior</button>
          <span style={tenue}>Página {filtros.page} de {paginas}</span>
          <button disabled={filtros.page >= paginas || cargando} onClick={() => setFiltros((f) => ({ ...f, page: f.page + 1 }))} style={{ ...campo, cursor: 'pointer' }}>Siguiente ›</button>
        </div>
      </div>
    </div>
  );
}
