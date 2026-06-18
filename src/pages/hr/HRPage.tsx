import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";

type Tab = "empleados" | "expedientes" | "nomina" | "asistencia" | "turnos" | "solicitudes";

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
  // Datos personales
  domicilio?: string;
  colonia?: string;
  ciudad?: string;
  estado?: string;
  codigoPostal?: string;
  numeroIne?: string;
  // Relación laboral
  tipoJornada?: string;
  tipoContrato?: string;
  tipoSalario?: string;
  salarioDiarioIntegrado?: number;
  claveRiesgoTrabajo?: string;
  // Nómina
  banco?: string;
  clabe?: string;
}

interface HrDocument {
  id: string;
  employeeId: string;
  tipo: string;
  nombre?: string;
  url?: string;
  fileData?: string;
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
  domicilio: "", colonia: "", ciudad: "", estado: "", codigoPostal: "", numeroIne: "",
  tipoJornada: "COMPLETA", tipoContrato: "INDETERMINADO", tipoSalario: "FIJO",
  salarioDiarioIntegrado: 0, claveRiesgoTrabajo: "",
  banco: "", clabe: "",
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
  const [docForm, setDocForm] = useState({ tipo: "INE", nombre: "", fileData: "", notas: "" });

  // Asistencia
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Turnos
  const [shifts, setShifts] = useState<any[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftForm, setShiftForm] = useState({ name: "", startTime: "09:00", endTime: "18:00" });

  // Solicitudes pendientes
  const [pendingRequests, setPendingRequests] = useState<{ vacaciones: any[]; permisos: any[] }>({ vacaciones: [], permisos: [] });
  const [loadingPending, setLoadingPending] = useState(false);

  // Carga masiva
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<{ file: File; tipo: string; status: "pending" | "uploading" | "done" | "error" }[]>([]);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkRunning, setBulkRunning] = useState(false);

  // Modal tabs + OCR
  const [modalTab, setModalTab] = useState<'personal' | 'laboral' | 'nomina' | 'expediente'>('personal');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPanel, setOcrPanel] = useState(false);
  const [ocrFields, setOcrFields] = useState<Record<string, string>>({});
  const [ocrDocumentId, setOcrDocumentId] = useState('');
  const [ocrTipo, setOcrTipo] = useState('INE');
  const [toast, setToast] = useState('');

  const tenantId = useAuthStore((s) => s.tenantId);
  const companyId = useAuthStore((s) => s.companyId);

  const headers = { "x-tenant-id": tenantId ?? "", "x-company-id": companyId ?? "" };

  useEffect(() => { loadEmployees(); }, []);

  useEffect(() => {
    if (tab === "asistencia") loadAttendance();
    if (tab === "turnos") loadShifts();
    if (tab === "solicitudes") loadPending();
  }, [tab]);

  async function loadAttendance() {
    setLoadingAttendance(true);
    try {
      const res = await api.get("/hr/attendance/today", { headers });
      setAttendance(Array.isArray(res.data) ? res.data : []);
    } catch { setAttendance([]); }
    finally { setLoadingAttendance(false); }
  }

  async function loadShifts() {
    setLoadingShifts(true);
    try {
      const res = await api.get("/hr/shifts", { headers });
      setShifts(Array.isArray(res.data) ? res.data : []);
    } catch { setShifts([]); }
    finally { setLoadingShifts(false); }
  }

  async function loadPending() {
    setLoadingPending(true);
    try {
      const res = await api.get("/hr/requests/pending", { headers });
      setPendingRequests(res.data ?? { vacaciones: [], permisos: [] });
    } catch { setPendingRequests({ vacaciones: [], permisos: [] }); }
    finally { setLoadingPending(false); }
  }

  async function saveShift() {
    try {
      await api.post("/hr/shifts", shiftForm, { headers });
      setShowShiftForm(false);
      setShiftForm({ name: "", startTime: "09:00", endTime: "18:00" });
      loadShifts();
    } catch { setError("Error al guardar turno"); }
  }

  async function deleteShift(id: string) {
    if (!confirm("¿Eliminar turno?")) return;
    await api.delete(`/hr/shifts/${id}`, { headers });
    loadShifts();
  }

  async function approveRequest(type: "vacation" | "permission", id: string) {
    await api.put(`/hr/requests/${type === "vacation" ? "vacation" : "permission"}/${id}/approve`, {}, { headers });
    loadPending();
  }

  async function rejectRequest(type: "vacation" | "permission", id: string) {
    const note = prompt("Motivo del rechazo:");
    if (note === null) return;
    await api.put(`/hr/requests/${type === "vacation" ? "vacation" : "permission"}/${id}/reject`, { responseNote: note }, { headers });
    loadPending();
  }

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
      const res = await api.get(`/hr/employees/${empId}/documents`, { headers });
      setDocs(Array.isArray(res.data) ? res.data : []);
    } catch { setDocs([]); }
  }

  function handleBulkSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setBulkFiles(files.map((f) => ({ file: f, tipo: "OTRO", status: "pending" })));
    e.target.value = "";
  }

  async function runBulkUpload() {
    if (!selectedEmp || bulkFiles.length === 0 || bulkRunning) return;
    setBulkRunning(true);
    setBulkProgress(0);
    for (let i = 0; i < bulkFiles.length; i++) {
      setBulkFiles((prev) => prev.map((bf, idx) => idx === i ? { ...bf, status: "uploading" } : bf));
      try {
        const fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(bulkFiles[i].file);
        });
        await api.post(`/hr/employees/${selectedEmp.id}/documents`, {
          tipo: bulkFiles[i].tipo,
          nombre: bulkFiles[i].file.name,
          fileData,
        });
        setBulkFiles((prev) => prev.map((bf, idx) => idx === i ? { ...bf, status: "done" } : bf));
      } catch {
        setBulkFiles((prev) => prev.map((bf, idx) => idx === i ? { ...bf, status: "error" } : bf));
      }
      setBulkProgress(i + 1);
    }
    setBulkRunning(false);
    loadDocs(selectedEmp.id);
  }

  function handleDocFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDocForm((p) => ({
        ...p,
        fileData: reader.result as string,
        nombre: p.nombre || file.name,
      }));
    };
    reader.readAsDataURL(file);
  }

  function openDoc(doc: HrDocument) {
    const src = doc.fileData || doc.url;
    if (!src) return;

    if (src.startsWith("data:")) {
      const [header, base64] = src.split(",");
      const mimeType = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } else {
      window.open(src, "_blank");
    }
  }

  async function saveEmployee() {
    if (!editingEmp.nombre?.trim()) { setError("El nombre es obligatorio"); return; }
    if (editingEmp.curp && editingEmp.curp.length !== 18) { setError("CURP debe tener exactamente 18 caracteres"); return; }
    if (editingEmp.rfc && ![12, 13].includes(editingEmp.rfc.length)) { setError("RFC debe tener 12 o 13 caracteres"); return; }
    if (editingEmp.nss && !/^\d{11}$/.test(editingEmp.nss)) { setError("NSS debe tener exactamente 11 dígitos"); return; }
    if (editingEmp.clabe && !/^\d{18}$/.test(editingEmp.clabe)) { setError("CLABE debe tener exactamente 18 dígitos"); return; }
    setError("");
    try {
      if (isEdit && (editingEmp as any).id) {
        await api.put(`/hr/employees/${(editingEmp as any).id}`, editingEmp);
      } else {
        await api.post("/hr/employees", editingEmp, { headers });
      }
      setShowEmpModal(false);
      loadEmployees();
    } catch { setError("Error al guardar empleado"); }
  }

  async function uploadOcrDocument(e: React.ChangeEvent<HTMLInputElement>, tipo: string) {
    const file = e.target.files?.[0];
    if (!file || !(editingEmp as any).id) return;
    e.target.value = "";
    setOcrLoading(true);
    try {
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await api.post(`/hr/employees/${(editingEmp as any).id}/documents/ocr`, { fileData, tipo }, { headers });
      setOcrFields(res.data.extractedFields ?? {});
      setOcrDocumentId(res.data.documentId);
      setOcrTipo(tipo);
      setOcrPanel(true);
    } catch { setError("Error al analizar documento"); }
    finally { setOcrLoading(false); }
  }

  async function confirmOcr() {
    try {
      const res = await api.post(
        `/hr/employees/${(editingEmp as any).id}/documents/ocr/${ocrDocumentId}/confirm`,
        { fields: ocrFields },
        { headers },
      );
      setEditingEmp((p) => ({ ...p, ...res.data }));
      setOcrPanel(false);
      setOcrDocumentId('');
      setOcrFields({});
      loadDocs((editingEmp as any).id);
      setToast("Datos aplicados correctamente");
      setTimeout(() => setToast(""), 3000);
    } catch { setError("Error al confirmar datos OCR"); }
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
      setDocForm({ tipo: "INE", nombre: "", fileData: "", notas: "" });
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
    setModalTab('personal');
    loadDocs(emp.id);
  }

  function openNew() {
    setEditingEmp(EMPTY_EMP);
    setIsEdit(false);
    setShowEmpModal(true);
    setModalTab('personal');
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
        <div className="flex gap-0 border-b border-slate-800 overflow-x-auto">
          {(["empleados", "expedientes", "nomina", "asistencia", "turnos", "solicitudes"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
              {t === "empleados" ? "Empleados" : t === "expedientes" ? "Expedientes" : t === "nomina" ? "Nómina" : t === "asistencia" ? "Asistencia" : t === "turnos" ? "Turnos" : "Solicitudes"}
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
                  <div className="flex gap-2">
                    <button onClick={() => { setShowBulkPanel(false); setShowDocForm(true); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">+ Agregar Documento</button>
                    <button onClick={() => { setShowDocForm(false); setBulkFiles([]); setBulkProgress(0); setShowBulkPanel(true); }} className="rounded-lg border border-blue-600 px-4 py-2 text-sm text-blue-400 hover:bg-blue-900/30">Carga masiva</button>
                  </div>
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
                        <label className="text-xs text-slate-400 block mb-1">Archivo (PDF, JPG, PNG)</label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleDocFile}
                          className="w-full text-sm text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                        />
                        {docForm.fileData && (
                          docForm.fileData.startsWith("data:image") ? (
                            <img src={docForm.fileData} alt="preview" className="mt-2 max-h-24 rounded border border-slate-700 object-contain" />
                          ) : (
                            <p className="mt-1 text-xs text-green-400">Archivo cargado correctamente</p>
                          )
                        )}
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

                {showBulkPanel && (
                  <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Carga masiva de documentos</h4>
                      <button onClick={() => setShowBulkPanel(false)} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Seleccionar archivos (PDF, JPG, PNG)</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        onChange={handleBulkSelect}
                        className="w-full text-sm text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                      />
                    </div>

                    {bulkFiles.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {bulkFiles.map((bf, i) => (
                          <div key={i} className="flex items-center gap-3 rounded border border-slate-700 bg-slate-800 px-3 py-2">
                            <span className="flex-1 text-xs text-slate-300 truncate">{bf.file.name}</span>
                            <select
                              value={bf.tipo}
                              disabled={bulkRunning}
                              onChange={(e) => setBulkFiles((prev) => prev.map((x, idx) => idx === i ? { ...x, tipo: e.target.value } : x))}
                              className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-white"
                            >
                              {TIPOS_DOC.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <span className="text-xs w-16 text-right" style={{
                              color: bf.status === "done" ? "#22C55E" : bf.status === "error" ? "#EF4444" : bf.status === "uploading" ? "#3B82F6" : "#7E7E7E"
                            }}>
                              {bf.status === "done" ? "✓ Listo" : bf.status === "error" ? "✗ Error" : bf.status === "uploading" ? "..." : "Pendiente"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {bulkRunning && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Subiendo {bulkProgress} de {bulkFiles.length}...</p>
                        <div className="bg-slate-700 rounded h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded transition-all" style={{ width: `${Math.round((bulkProgress / bulkFiles.length) * 100)}%` }} />
                        </div>
                      </div>
                    )}

                    {!bulkRunning && bulkProgress === bulkFiles.length && bulkFiles.length > 0 && (
                      <p className="text-xs text-green-400">Carga completada: {bulkFiles.filter(f => f.status === "done").length} exitosos, {bulkFiles.filter(f => f.status === "error").length} errores.</p>
                    )}

                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowBulkPanel(false)} className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-white">Cerrar</button>
                      <button
                        onClick={runBulkUpload}
                        disabled={bulkRunning || bulkFiles.length === 0}
                        className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bulkRunning ? `Subiendo ${bulkProgress}/${bulkFiles.length}...` : `Subir todos (${bulkFiles.length})`}
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-slate-400 border-b border-slate-800">
                      <tr>
                        {["Tipo", "Nombre", "Documento", "Notas", "Fecha", ""].map((h) => <th key={h} className="p-3 text-left font-medium">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {docs.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Sin documentos</td></tr>}
                      {docs.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-800/50">
                          <td className="p-3 font-medium">{d.tipo}</td>
                          <td className="p-3 text-slate-300">{d.nombre || "—"}</td>
                          <td className="p-3">
                            {d.fileData ? (
                              d.fileData.startsWith("data:image") ? (
                                <button onClick={() => openDoc(d)} className="focus:outline-none">
                                  <img src={d.fileData} alt={d.nombre || d.tipo} className="max-h-10 rounded border border-slate-700 object-contain hover:opacity-80" />
                                </button>
                              ) : (
                                <button onClick={() => openDoc(d)} className="text-blue-400 hover:underline text-sm">Ver PDF</button>
                              )
                            ) : d.url ? (
                              <a href={d.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-sm">Ver enlace</a>
                            ) : "—"}
                          </td>
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

        {/* ── TAB: Asistencia ── */}
        {tab === "asistencia" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Asistencia de hoy</h2>
              <button onClick={loadAttendance} className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-400">Actualizar</button>
            </div>
            {loadingAttendance ? (
              <div className="text-slate-400 text-sm">Cargando...</div>
            ) : attendance.length === 0 ? (
              <div className="rounded-xl bg-slate-900 p-6 text-slate-400 text-sm">Sin registros de asistencia hoy</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                      <th className="pb-2 pr-4">Empleado</th>
                      <th className="pb-2 pr-4">Entrada</th>
                      <th className="pb-2 pr-4">Salida</th>
                      <th className="pb-2 pr-4">Método</th>
                      <th className="pb-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a) => (
                      <tr key={a.id} className="border-b border-slate-800/50">
                        <td className="py-2 pr-4">{a.employeeId}</td>
                        <td className="py-2 pr-4">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString("es-MX") : "—"}</td>
                        <td className="py-2 pr-4">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString("es-MX") : "—"}</td>
                        <td className="py-2 pr-4">{a.method}</td>
                        <td className="py-2"><span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: a.status === "PRESENTE" ? "#22C55E22" : "#EF444422", color: a.status === "PRESENTE" ? "#22C55E" : "#EF4444" }}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Turnos ── */}
        {tab === "turnos" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Turnos de trabajo</h2>
              <button onClick={() => setShowShiftForm(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ Nuevo Turno</button>
            </div>
            {loadingShifts ? (
              <div className="text-slate-400 text-sm">Cargando...</div>
            ) : shifts.length === 0 ? (
              <div className="rounded-xl bg-slate-900 p-6 text-slate-400 text-sm">Sin turnos configurados</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {shifts.map((s) => (
                  <div key={s.id} className="rounded-xl p-4 bg-slate-900 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{s.name}</span>
                      <button onClick={() => deleteShift(s.id)} className="text-xs text-red-400 hover:text-red-300">Eliminar</button>
                    </div>
                    <p className="text-xs text-slate-400">{s.startTime} — {s.endTime}</p>
                    <p className="text-xs text-slate-500 mt-1">Tolerancia: {s.toleranceMinutes} min</p>
                  </div>
                ))}
              </div>
            )}
            {showShiftForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
                <div className="rounded-xl p-6 w-full max-w-sm space-y-4" style={{ backgroundColor: "#161616", border: "1px solid #2D2D2D" }}>
                  <h3 className="font-semibold">Nuevo Turno</h3>
                  <div>
                    <label className="text-xs block mb-1 text-slate-400">Nombre</label>
                    <input value={shiftForm.name} onChange={(e) => setShiftForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs block mb-1 text-slate-400">Entrada</label>
                      <input type="time" value={shiftForm.startTime} onChange={(e) => setShiftForm((p) => ({ ...p, startTime: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs block mb-1 text-slate-400">Salida</label>
                      <input type="time" value={shiftForm.endTime} onChange={(e) => setShiftForm((p) => ({ ...p, endTime: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowShiftForm(false)} className="flex-1 py-2 text-sm rounded border border-slate-700 text-slate-400">Cancelar</button>
                    <button onClick={saveShift} className="flex-1 py-2 text-sm rounded bg-blue-600 text-white font-medium">Guardar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Solicitudes ── */}
        {tab === "solicitudes" && (
          <div>
            <h2 className="font-semibold mb-4">Solicitudes pendientes</h2>
            {loadingPending ? (
              <div className="text-slate-400 text-sm">Cargando...</div>
            ) : (
              <>
                {pendingRequests.vacaciones.length === 0 && pendingRequests.permisos.length === 0 && (
                  <div className="rounded-xl bg-slate-900 p-6 text-slate-400 text-sm">Sin solicitudes pendientes</div>
                )}
                {pendingRequests.vacaciones.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Vacaciones</h3>
                    <div className="space-y-2">
                      {pendingRequests.vacaciones.map((v: any) => (
                        <div key={v.id} className="rounded-xl p-4 bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{v.employeeId}</p>
                            <p className="text-xs text-slate-400">{new Date(v.startDate).toLocaleDateString("es-MX")} — {new Date(v.endDate).toLocaleDateString("es-MX")} ({v.daysRequested} días)</p>
                            <p className="text-xs text-slate-500">{v.reason}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => approveRequest("vacation", v.id)} className="text-xs px-3 py-1.5 rounded" style={{ backgroundColor: "#22C55E22", color: "#22C55E" }}>Aprobar</button>
                            <button onClick={() => rejectRequest("vacation", v.id)} className="text-xs px-3 py-1.5 rounded" style={{ backgroundColor: "#EF444422", color: "#EF4444" }}>Rechazar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {pendingRequests.permisos.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Permisos</h3>
                    <div className="space-y-2">
                      {pendingRequests.permisos.map((p: any) => (
                        <div key={p.id} className="rounded-xl p-4 bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{p.employeeId}</p>
                            <p className="text-xs text-slate-400">{new Date(p.date).toLocaleDateString("es-MX")} — {p.hours}h — {p.type}</p>
                            <p className="text-xs text-slate-500">{p.reason}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => approveRequest("permission", p.id)} className="text-xs px-3 py-1.5 rounded" style={{ backgroundColor: "#22C55E22", color: "#22C55E" }}>Aprobar</button>
                            <button onClick={() => rejectRequest("permission", p.id)} className="text-xs px-3 py-1.5 rounded" style={{ backgroundColor: "#EF444422", color: "#EF4444" }}>Rechazar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      {/* Modal empleado — 4 pestañas */}
      {showEmpModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEmpModal(false); }}>
          <div style={{ background: "#161616", border: "1px solid #2D2D2D", borderRadius: 12, width: "100%", maxWidth: 640, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
            {/* Header + pestañas */}
            <div style={{ padding: "20px 24px 0", borderBottom: "1px solid #2D2D2D" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{isEdit ? "Editar Empleado" : "Nuevo Empleado"}</h2>
                <button onClick={() => setShowEmpModal(false)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
              </div>
              <div className="flex gap-0 overflow-x-auto">
                {((['personal', 'laboral', 'nomina'] as const) as readonly string[]).concat(isEdit ? ['expediente'] : []).map((t) => (
                  <button key={t} onClick={() => setModalTab(t as any)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${modalTab === t ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
                    {t === 'personal' ? 'Datos Personales' : t === 'laboral' ? 'Relación Laboral' : t === 'nomina' ? 'Nómina' : 'Expediente'}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuerpo */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

              {/* PESTAÑA 1 — Datos Personales */}
              {modalTab === 'personal' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nombre *</label>
                    <input value={editingEmp.nombre ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, nombre: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Apellidos</label>
                    <input value={editingEmp.apellidos ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, apellidos: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">CURP (18 chars)</label>
                    <input value={editingEmp.curp ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, curp: e.target.value.toUpperCase() }))} maxLength={18} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500 font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">RFC (12-13 chars)</label>
                    <input value={editingEmp.rfc ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, rfc: e.target.value.toUpperCase() }))} maxLength={13} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500 font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">NSS (11 dígitos)</label>
                    <input value={editingEmp.nss ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, nss: e.target.value.replace(/\D/g, "").slice(0, 11) }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500 font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Número INE</label>
                    <input value={editingEmp.numeroIne ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, numeroIne: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500 font-mono" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Domicilio</label>
                    <input value={editingEmp.domicilio ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, domicilio: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Colonia</label>
                    <input value={editingEmp.colonia ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, colonia: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Código Postal</label>
                    <input value={editingEmp.codigoPostal ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, codigoPostal: e.target.value.replace(/\D/g, "").slice(0, 5) }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500 font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Ciudad</label>
                    <input value={editingEmp.ciudad ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, ciudad: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Estado</label>
                    <input value={editingEmp.estado ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, estado: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                </div>
              )}

              {/* PESTAÑA 2 — Relación Laboral */}
              {modalTab === 'laboral' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha de Ingreso</label>
                    <input type="date" value={editingEmp.fechaIngreso ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, fechaIngreso: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Puesto</label>
                    <input value={editingEmp.puesto ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, puesto: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Departamento</label>
                    <input value={editingEmp.departamento ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, departamento: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tipo de Jornada</label>
                    <select value={editingEmp.tipoJornada ?? "COMPLETA"} onChange={(e) => setEditingEmp((p) => ({ ...p, tipoJornada: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white">
                      <option value="COMPLETA">Completa</option>
                      <option value="PARCIAL">Parcial</option>
                      <option value="POR_HORAS">Por Horas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tipo de Contrato</label>
                    <select value={editingEmp.tipoContrato ?? "INDETERMINADO"} onChange={(e) => setEditingEmp((p) => ({ ...p, tipoContrato: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white">
                      <option value="INDETERMINADO">Indeterminado</option>
                      <option value="DETERMINADO">Determinado</option>
                      <option value="TEMPORADA">Temporada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tipo de Salario</label>
                    <select value={editingEmp.tipoSalario ?? "FIJO"} onChange={(e) => setEditingEmp((p) => ({ ...p, tipoSalario: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white">
                      <option value="FIJO">Fijo</option>
                      <option value="VARIABLE">Variable</option>
                      <option value="MIXTO">Mixto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Salario Diario Integrado</label>
                    <input type="number" value={editingEmp.salarioDiarioIntegrado ?? 0} onChange={(e) => setEditingEmp((p) => ({ ...p, salarioDiarioIntegrado: parseFloat(e.target.value) || 0 }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Clave Riesgo de Trabajo</label>
                    <input value={editingEmp.claveRiesgoTrabajo ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, claveRiesgoTrabajo: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Estado</label>
                    <select value={editingEmp.status ?? "ACTIVO"} onChange={(e) => setEditingEmp((p) => ({ ...p, status: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white">
                      <option value="ACTIVO">Activo</option>
                      <option value="BAJA">Baja</option>
                      <option value="VACACIONES">Vacaciones</option>
                    </select>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3 — Nómina */}
              {modalTab === 'nomina' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Salario Quincenal</label>
                    <input type="number" value={editingEmp.salarioQuincenal ?? 0} onChange={(e) => setEditingEmp((p) => ({ ...p, salarioQuincenal: parseFloat(e.target.value) || 0 }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Deducciones</label>
                    <input type="number" value={editingEmp.deducciones ?? 0} onChange={(e) => setEditingEmp((p) => ({ ...p, deducciones: parseFloat(e.target.value) || 0 }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Banco</label>
                    <input value={editingEmp.banco ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, banco: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">CLABE (18 dígitos)</label>
                    <input value={editingEmp.clabe ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, clabe: e.target.value.replace(/\D/g, "").slice(0, 18) }))} className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500 font-mono" />
                  </div>
                </div>
              )}

              {/* PESTAÑA 4 — Expediente (solo editar) */}
              {modalTab === 'expediente' && isEdit && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Subir documento con análisis OCR</p>
                    <div className="flex items-center gap-3">
                      <select value={ocrTipo} onChange={(e) => setOcrTipo(e.target.value)} className="rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white">
                        {TIPOS_DOC.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <label className="flex-1 cursor-pointer">
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => uploadOcrDocument(e, ocrTipo)} className="hidden" disabled={ocrLoading} />
                        <span className={`block w-full rounded border border-dashed p-2 text-center text-sm transition-colors ${ocrLoading ? "border-slate-600 text-slate-500 cursor-not-allowed" : "border-blue-600 text-blue-400 hover:bg-blue-900/20 cursor-pointer"}`}>
                          {ocrLoading ? "Analizando documento..." : "Seleccionar archivo (PDF, JPG, PNG)"}
                        </span>
                      </label>
                    </div>
                    {ocrLoading && (
                      <div className="flex items-center gap-2 text-sm text-blue-400">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                        Analizando documento...
                      </div>
                    )}
                  </div>
                  {docs.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Sin documentos en el expediente</p>
                  ) : (
                    <div className="space-y-2">
                      {docs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-3">
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-blue-400 mr-2">{doc.tipo}</span>
                            <span className="text-sm">{doc.nombre || doc.tipo}</span>
                            {(doc as any).ocrConfirmed && <span className="ml-2 text-xs text-green-400">✓ OCR confirmado</span>}
                          </div>
                          <div className="flex gap-2 ml-2 shrink-0">
                            {(doc.fileData || doc.url) && (
                              <button onClick={() => openDoc(doc)} className="text-xs text-blue-400 hover:text-blue-300">Ver</button>
                            )}
                            <button onClick={() => removeDoc(doc.id)} className="text-xs text-red-400 hover:text-red-300">Eliminar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #2D2D2D" }} className="flex gap-3 justify-end">
              <button onClick={() => setShowEmpModal(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
              {modalTab !== 'expediente' && (
                <button onClick={saveEmployee} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">Guardar</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Panel de confirmación OCR */}
      {ocrPanel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16 }}>
          <div style={{ background: "#161616", border: "1px solid #2D2D2D", borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #2D2D2D" }}>
              <h3 className="font-semibold text-lg">Datos detectados — revisa y confirma</h3>
              <p className="text-xs text-slate-400 mt-1">Edita los campos si es necesario antes de aplicar al empleado</p>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }} className="space-y-3">
              {Object.keys(ocrFields).length === 0 ? (
                <p className="text-sm text-slate-500">No se detectaron campos automáticamente en este documento.</p>
              ) : (
                Object.entries(ocrFields).map(([key, val]) => (
                  <div key={key}>
                    <label className="block text-xs text-slate-400 mb-1 capitalize">{key}</label>
                    <input
                      value={val}
                      onChange={(e) => setOcrFields((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder="No detectado"
                      className={`w-full rounded border p-2 text-sm outline-none focus:border-blue-500 ${val ? "border-slate-700 bg-slate-800 text-white" : "border-slate-700 bg-slate-800/50 text-slate-500"}`}
                    />
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #2D2D2D" }} className="flex gap-3 justify-end">
              <button onClick={() => { setOcrPanel(false); setOcrDocumentId(''); setOcrFields({}); }} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={confirmOcr} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">Confirmar y aplicar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1200, background: "#22C55E", color: "white", borderRadius: 8, padding: "10px 20px", fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}
    </MainLayout>
  );
}
