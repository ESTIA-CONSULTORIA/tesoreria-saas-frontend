import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";

type Tab = "empleados" | "expedientes" | "nomina";

interface Employee {
  id: string;
  nombre: string;
  apellidos?: string;
  puesto?: string;
  departamento?: string;
  fechaIngreso?: string;
  curp?: string;
  rfc?: string;
  nss?: string;
  salarioQuincenal: number;
  deducciones: number;
  status: string;
}

interface HrDocument {
  id: string;
  employeeId: string;
  tipo: string;
  nombre?: string;
  url?: string;
  notas?: string;
  uploadedAt: string;
}

const TIPOS_DOC = ["INE", "CURP", "NSS", "CONTRATO", "COMPROBANTE_DOMICILIO", "ACTA_NACIMIENTO", "FOTO", "OTRO"];

const STATUS_COLOR: Record<string, string> = {
  ACTIVO: "#22C55E", BAJA: "#EF4444", VACACIONES: "#F59E0B",
};

const EMPTY_EMP: Partial<Employee> = {
  nombre: "", apellidos: "", puesto: "", departamento: "",
  fechaIngreso: "", curp: "", rfc: "", nss: "",
  salarioQuincenal: 0, deducciones: 0, status: "ACTIVO",
};

export default function HRPage() {
  const [tab, setTab] = useState<Tab>("empleados");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Partial<Employee>>(EMPTY_EMP);
  const [isEdit, setIsEdit] = useState(false);

  // Expedientes
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [docs, setDocs] = useState<HrDocument[]>([]);
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState({ tipo: "INE", nombre: "", url: "", notas: "" });

  const tenantId = useAuthStore((s) => s.tenantId);
  const companyId = useAuthStore((s) => s.companyId);

  const headers = { "x-tenant-id": tenantId ?? "", "x-company-id": companyId ?? "" };

  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    setLoading(true);
    try {
      const res = await api.get("/hr/employees", { headers });
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch { setError("Error al cargar empleados"); }
    finally { setLoading(false); }
  }

  async function loadDocs(empId: string) {
    try {
      const res = await api.get(`/hr/employees/${empId}/documents`);
      setDocs(Array.isArray(res.data) ? res.data : []);
    } catch { setDocs([]); }
  }

  async function saveEmployee() {
    try {
      if (isEdit && editingEmp.id) {
        await api.put(`/hr/employees/${editingEmp.id}`, editingEmp);
      } else {
        await api.post("/hr/employees", editingEmp, { headers });
      }
      setShowEmpModal(false);
      loadEmployees();
    } catch { setError("Error al guardar empleado"); }
  }

  async function deleteEmployee(id: string) {
    if (!confirm("¿Eliminar este empleado?")) return;
    await api.delete(`/hr/employees/${id}`);
    loadEmployees();
  }

  async function addDocument() {
    if (!selectedEmp) return;
    try {
      await api.post(`/hr/employees/${selectedEmp.id}/documents`, docForm);
      setDocForm({ tipo: "INE", nombre: "", url: "", notas: "" });
      setShowDocForm(false);
      loadDocs(selectedEmp.id);
    } catch { setError("Error al agregar documento"); }
  }

  async function removeDoc(id: string) {
    if (!confirm("¿Eliminar documento?")) return;
    await api.delete(`/hr/documents/${id}`);
    if (selectedEmp) loadDocs(selectedEmp.id);
  }

  function openEdit(emp: Employee) {
    setEditingEmp({ ...emp });
    setIsEdit(true);
    setShowEmpModal(true);
  }

  function openNew() {
    setEditingEmp(EMPTY_EMP);
    setIsEdit(false);
    setShowEmpModal(true);
  }

  function selectForExpediente(emp: Employee) {
    setSelectedEmp(emp);
    loadDocs(emp.id);
    setTab("expedientes");
  }

  const activeCount = employees.filter((e) => e.status === "ACTIVO").length;
  const totalNomina = employees
    .filter((e) => e.status === "ACTIVO")
    .reduce((sum, e) => sum + Number(e.salarioQuincenal) - Number(e.deducciones), 0);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recursos Humanos</h1>
            <p className="text-slate-400 text-sm">{activeCount} empleados activos · Nómina quincenal estimada: ${totalNomina.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
          </div>
          {tab === "empleados" && (
            <button onClick={openNew} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
              + Nuevo Empleado
            </button>
          )}
        </div>

        {error && <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-300 text-sm">{error}</div>}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-800">
          {(["empleados", "expedientes", "nomina"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
              {t === "empleados" ? "Empleados" : t === "expedientes" ? "Expedientes" : "Nómina"}
            </button>
          ))}
        </div>

        {/* ── TAB: Empleados ── */}
        {tab === "empleados" && (
          loading ? (
            <div className="rounded-xl bg-slate-900 p-6 text-slate-400">Cargando...</div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    {["Nombre", "Puesto", "Departamento", "Fecha Ingreso", "Salario Quincenal", "Estado", ""].map((h) => (
                      <th key={h} className="p-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {employees.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-slate-500">Sin empleados registrados</td></tr>
                  )}
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-800/50">
                      <td className="p-3 font-medium">{emp.nombre} {emp.apellidos}</td>
                      <td className="p-3 text-slate-300">{emp.puesto || "—"}</td>
                      <td className="p-3 text-slate-300">{emp.departamento || "—"}</td>
                      <td className="p-3 text-slate-400">{emp.fechaIngreso ? new Date(emp.fechaIngreso).toLocaleDateString("es-MX") : "—"}</td>
                      <td className="p-3">${Number(emp.salarioQuincenal).toLocaleString("es-MX")}</td>
                      <td className="p-3">
                        <span style={{ background: (STATUS_COLOR[emp.status] ?? "#7E7E7E") + "22", color: STATUS_COLOR[emp.status] ?? "#7E7E7E", border: `1px solid ${(STATUS_COLOR[emp.status] ?? "#7E7E7E")}44`, borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button onClick={() => selectForExpediente(emp)} className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600">Expediente</button>
                          <button onClick={() => openEdit(emp)} className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700">Editar</button>
                          <button onClick={() => deleteEmployee(emp.id)} className="rounded bg-red-700 px-2 py-1 text-xs hover:bg-red-600">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── TAB: Expedientes ── */}
        {tab === "expedientes" && (
          <div className="space-y-4">
            {!selectedEmp ? (
              <div className="rounded-xl bg-slate-900 p-6 text-slate-400 text-center">
                Haz clic en <strong>Expediente</strong> en la tab de Empleados para ver sus documentos.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedEmp.nombre} {selectedEmp.apellidos}</h3>
                    <p className="text-sm text-slate-400">{selectedEmp.puesto} · {selectedEmp.departamento}</p>
                  </div>
                  <button onClick={() => setShowDocForm(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">+ Agregar Documento</button>
                </div>

                {showDocForm && (
                  <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-3">
                    <h4 className="font-medium text-sm">Nuevo Documento</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Tipo</label>
                        <select value={docForm.tipo} onChange={(e) => setDocForm((p) => ({ ...p, tipo: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white">
                          {TIPOS_DOC.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Nombre del archivo</label>
                        <input value={docForm.nombre} onChange={(e) => setDocForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej: INE frente" className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-slate-400 block mb-1">URL / referencia</label>
                        <input value={docForm.url} onChange={(e) => setDocForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-slate-400 block mb-1">Notas</label>
                        <input value={docForm.notas} onChange={(e) => setDocForm((p) => ({ ...p, notas: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowDocForm(false)} className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-white">Cancelar</button>
                      <button onClick={addDocument} className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">Guardar</button>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-slate-400 border-b border-slate-800">
                      <tr>
                        {["Tipo", "Nombre", "URL", "Notas", "Fecha", ""].map((h) => <th key={h} className="p-3 text-left font-medium">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {docs.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Sin documentos</td></tr>}
                      {docs.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-800/50">
                          <td className="p-3 font-medium">{d.tipo}</td>
                          <td className="p-3 text-slate-300">{d.nombre || "—"}</td>
                          <td className="p-3 text-slate-400">{d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Ver</a> : "—"}</td>
                          <td className="p-3 text-slate-400">{d.notas || "—"}</td>
                          <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(d.uploadedAt).toLocaleDateString("es-MX")}</td>
                          <td className="p-3"><button onClick={() => removeDoc(d.id)} className="rounded bg-red-700 px-2 py-1 text-xs hover:bg-red-600">Eliminar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB: Nómina ── */}
        {tab === "nomina" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    {["Empleado", "Puesto", "Salario Quincenal", "Deducciones", "Neto a Pagar", "Estado"].map((h) => <th key={h} className="p-3 text-left font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {employees.filter((e) => e.status === "ACTIVO").map((emp) => {
                    const neto = Number(emp.salarioQuincenal) - Number(emp.deducciones);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-800/50">
                        <td className="p-3 font-medium">{emp.nombre} {emp.apellidos}</td>
                        <td className="p-3 text-slate-300">{emp.puesto || "—"}</td>
                        <td className="p-3">${Number(emp.salarioQuincenal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-red-400">${Number(emp.deducciones).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-green-400 font-semibold">${neto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3">
                          <span style={{ background: "#22C55E22", color: "#22C55E", border: "1px solid #22C55E44", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>ACTIVO</span>
                        </td>
                      </tr>
                    );
                  })}
                  {employees.filter((e) => e.status === "ACTIVO").length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-slate-500">Sin empleados activos</td></tr>
                  )}
                </tbody>
                <tfoot className="border-t border-slate-700">
                  <tr>
                    <td colSpan={4} className="p-3 text-right text-slate-400 font-medium">Total nómina quincenal:</td>
                    <td className="p-3 text-green-400 font-bold">${totalNomina.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal empleado */}
      {showEmpModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEmpModal(false); }}>
          <div style={{ background: "#161616", border: "1px solid #2D2D2D", borderRadius: 12, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
            <h2 className="text-xl font-bold mb-5">{isEdit ? "Editar Empleado" : "Nuevo Empleado"}</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Nombre", key: "nombre" },
                { label: "Apellidos", key: "apellidos" },
                { label: "Puesto", key: "puesto" },
                { label: "Departamento", key: "departamento" },
                { label: "Fecha de Ingreso", key: "fechaIngreso", type: "date" },
                { label: "CURP", key: "curp" },
                { label: "RFC", key: "rfc" },
                { label: "NSS", key: "nss" },
                { label: "Salario Quincenal", key: "salarioQuincenal", type: "number" },
                { label: "Deducciones", key: "deducciones", type: "number" },
              ].map(({ label, key, type = "text" }) => (
                <div key={key} className={key === "nombre" || key === "apellidos" ? "col-span-1" : ""}>
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(editingEmp as any)[key] ?? ""}
                    onChange={(e) => setEditingEmp((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Estado</label>
                <select value={editingEmp.status ?? "ACTIVO"} onChange={(e) => setEditingEmp((p) => ({ ...p, status: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white">
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="BAJA">BAJA</option>
                  <option value="VACACIONES">VACACIONES</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowEmpModal(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={saveEmployee} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
