import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import { useAuthStore } from "../../core/store/useAuthStore";
import { useCompanyStore } from "../../core/store/useCompanyStore";

import { ConceptsEditor } from './ConceptsEditor';
import { IncidenceInput } from './IncidenceInput';
import { PayrollPrint } from './PayrollPrint';
import { ContractsTab } from './ContractsTab';

type Tab = "empleados" | "expedientes" | "nomina" | "asistencia" | "turnos" | "solicitudes" | "cumpleanos";

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
  shiftId?: string;
  userId?: string; // vínculo opcional a un User del sistema (portal empleado)
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
  imssNumber?: string;
  banco?: string;
  clabe?: string;
  periodoPago?: string;
  // Datos personales adicionales
  fechaNacimiento?: string;
  genero?: string;
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
  ocrConfirmed?: boolean;
}

const TIPOS_DOC = ["INE", "CURP", "NSS", "CONTRATO", "COMPROBANTE_DOMICILIO", "ACTA_NACIMIENTO", "FOTO", "OTRO"];

// Badge palette (Parte 1 — nueva paleta)
const STATUS_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  ACTIVO:     { bg: 'rgba(255,255,255,0.04)',  color: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.08)' },
  VACACIONES: { bg: 'rgba(180,150,80,0.08)',   color: '#b09a5a',                border: 'rgba(180,150,80,0.15)' },
  BAJA:       { bg: 'rgba(255,255,255,0.03)',  color: 'rgba(255,255,255,0.25)', border: 'rgba(255,255,255,0.06)' },
};

const EMPTY_EMP: Partial<Employee> = {
  nombre: "", apellidos: "", puesto: "", departamento: "",
  fechaIngreso: "", curp: "", rfc: "", nss: "",
  salarioQuincenal: 0, deducciones: 0, status: "ACTIVO",
  domicilio: "", colonia: "", ciudad: "", estado: "", codigoPostal: "", numeroIne: "",
  tipoJornada: "COMPLETA", tipoContrato: "INDETERMINADO", tipoSalario: "FIJO",
  salarioDiarioIntegrado: 0, claveRiesgoTrabajo: "",
  imssNumber: "", banco: "", clabe: "", periodoPago: "QUINCENAL",
  fechaNacimiento: "", genero: "M",
  userId: "", // "" = Sin vincular
};

function calcPeriodo(sd: number, periodo: string): number {
  const f = periodo === 'SEMANAL' ? 7 : periodo === 'CATORCENAL' ? 14 : 15;
  return sd * f;
}

// Avatar component
function EmpAvatar({ emp, photos }: { emp: Employee; photos: Record<string, string> }) {
  const photo = photos[emp.id];
  const initials = ((emp.nombre?.[0] || '') + (emp.apellidos?.[0] || '')).toUpperCase() || '?';
  if (photo) {
    return <img src={photo} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }} alt={initials} />;
  }
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1c2030', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 600, flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
      {initials}
    </div>
  );
}

const INCIDENCE_KEYS = [
  { key: 'A',   label: 'Asistencia',             color: '#4ade80',               status: 'PRESENTE' },
  { key: 'F',   label: 'Falta',                  color: 'rgba(252,165,165,0.9)', status: 'FALTA' },
  { key: 'PG',  label: 'Permiso con goce',       color: '#60a5fa',               status: 'JUSTIFICADO' },
  { key: 'PS',  label: 'Permiso sin goce',       color: '#f59e0b',               status: 'JUSTIFICADO' },
  { key: 'VG',  label: 'Vacaciones',             color: '#a78bfa',               status: 'JUSTIFICADO' },
  { key: 'IC',  label: 'Incapacidad c/riesgo',  color: '#f97316',               status: 'JUSTIFICADO' },
  { key: 'IS',  label: 'Incapacidad s/riesgo',  color: '#fb923c',               status: 'JUSTIFICADO' },
  { key: 'SU',  label: 'Suspensión',            color: 'rgba(252,165,165,0.6)', status: 'FALTA' },
  { key: 'DF',  label: 'Día festivo',           color: '#94a3b8',               status: 'JUSTIFICADO' },
  { key: 'DFT', label: 'Día festivo trabajado', color: '#4ade80',               status: 'PRESENTE' },
  { key: 'TE',  label: 'Tiempo extra',          color: '#34d399',               status: 'PRESENTE' },
  { key: '7',   label: 'Séptimo día',           color: '#c084fc',               status: 'PRESENTE' },
];

export default function HRPage() {
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab') as Tab;
    return t || 'empleados';
  });

  useEffect(() => {
    const t = searchParams.get('tab') as Tab;
    if (t && t !== tab) setTab(t);
  }, [searchParams]);

  const [employees, setEmployees]           = useState<Employee[]>([]);
  const [systemUsers, setSystemUsers]       = useState<{ id: string; email: string; name?: string }[]>([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [showEmpModal, setShowEmpModal]     = useState(false);
  const [editingEmp, setEditingEmp]         = useState<Partial<Employee>>(EMPTY_EMP);
  const [isEdit, setIsEdit]                 = useState(false);
  const [employeePhotos, setEmployeePhotos] = useState<Record<string, string>>({});

  // Expedientes
  const [expedienteSubTab, setExpedienteSubTab] = useState<'documentos'|'contratos'>('documentos');
  const [selectedEmp, setSelectedEmp]   = useState<Employee | null>(null);
  const [docs, setDocs]                 = useState<HrDocument[]>([]);
  const [showDocForm, setShowDocForm]   = useState(false);
  const [docForm, setDocForm]           = useState({ tipo: "INE", nombre: "", fileData: "", notas: "" });

  // Asistencia
  const [attendance, setAttendance]             = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceCount, setAttendanceCount]   = useState(0);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceForm, setAttendanceForm]     = useState({ employeeId: '', date: new Date().toISOString().split('T')[0], checkIn: '08:00', checkOut: '' });
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  // Asistencia por período (tabla de incidencias)
  const [attendancePeriod, setAttendancePeriod] = useState<{start: string, end: string}>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [periodAttendance, setPeriodAttendance] = useState<any[]>([]);
  const [loadingPeriodAtt, setLoadingPeriodAtt] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [overtimeTarget, setOvertimeTarget] = useState<{employeeId: string, date: string, hours: number, note: string} | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditEmployee, setAuditEmployee] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Turnos
  const [shifts, setShifts]             = useState<any[]>([]);
  const [shiftsMap, setShiftsMap]       = useState<Record<string, string>>({});
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftForm, setShiftForm]       = useState({ name: "", startTime: "09:00", endTime: "18:00" });

  // Solicitudes pendientes
  const [pendingRequests, setPendingRequests] = useState<{ vacaciones: any[]; permisos: any[] }>({ vacaciones: [], permisos: [] });
  const [loadingPending, setLoadingPending]   = useState(false);
  const [vacacionesCount, setVacacionesCount] = useState(0);

  // Cumpleaños
  const [birthdays, setBirthdays]             = useState<any[]>([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState(false);

  // Carga masiva
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkFiles, setBulkFiles]         = useState<{ file: File; tipo: string; status: "pending" | "uploading" | "done" | "error" }[]>([]);
  const [bulkProgress, setBulkProgress]   = useState(0);
  const [bulkRunning, setBulkRunning]     = useState(false);

  // Modal tabs + OCR
  const [modalTab, setModalTab]     = useState<'personal' | 'laboral' | 'nomina' | 'expediente'>('personal');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPanel, setOcrPanel]     = useState(false);
  const [ocrFields, setOcrFields]   = useState<Record<string, string>>({});
  const [ocrDocumentId, setOcrDocumentId] = useState('');
  const [ocrTipo, setOcrTipo]       = useState('INE');
  const [toast, setToast]           = useState('');

  // Nómina (payroll runs)
  const [payrollRuns, setPayrollRuns]       = useState<any[]>([]);
  const [selectedRun, setSelectedRun]       = useState<any>(null);
  const [payrollTab, setPayrollTab]         = useState<'lista' | 'prenomina' | 'nomina' | 'catalogo'>('lista');
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [newRunForm, setNewRunForm]         = useState({ periodStart: '', periodEnd: '', periodType: 'QUINCENAL', notes: '' });
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [selectedEntry, setSelectedEntry]   = useState<any>(null);
  const [showConceptsModal, setShowConceptsModal] = useState(false);
  const [cajas, setCajas]                   = useState<any[]>([]);
  const [selectedCajaId, setSelectedCajaId] = useState('');
  const [catalog, setCatalog] = useState<any[]>([]);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogForm, setCatalogForm] = useState({ name: '', type: 'P', defaultAmount: 0, category: 'OTRO' });
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [lockedDates, setLockedDates] = useState<Set<string>>(new Set());

  const tenantId  = useAuthStore((s) => s.tenantId);
  const companyId = useAuthStore((s) => s.companyId);
  const user      = useAuthStore((s) => s.user);
  const activeCompany = useCompanyStore((s) => s.activeCompany);
  const activeBranch  = useCompanyStore((s) => s.activeBranch);

  const headers = { "x-tenant-id": tenantId ?? "", "x-company-id": companyId ?? "" };

  useEffect(() => {
    loadEmployees();
    loadShifts();
    loadMetrics();
    loadPayrollRuns();
    loadCajas();
    loadCatalog();
    loadSystemUsers();
  }, []);

  useEffect(() => {
    if (tab === "asistencia") loadPeriodAttendance();
    if (tab === "solicitudes") loadPending();
    if (tab === "cumpleanos") loadBirthdays();
  }, [tab]);

  useEffect(() => {
    if (tab === "asistencia" && employees.length > 0) loadPeriodAttendance();
  }, [attendancePeriod, employees]);

  async function loadSystemUsers() {
    try {
      const res = await api.get("/users", { headers });
      setSystemUsers(Array.isArray(res.data) ? res.data : []);
    } catch { /* selector queda vacío, no bloquea el resto del alta */ }
  }

  async function loadEmployees() {
    setLoading(true);
    try {
      const res = await api.get("/hr/employees", { headers });
      const data: Employee[] = Array.isArray(res.data) ? res.data : [];
      setEmployees(data);
      if (data.length > 0) {
        const ids = data.map(e => e.id).join(',');
        try {
          const pr = await api.get(`/hr/employees/photos?employeeIds=${ids}`, { headers });
          setEmployeePhotos(pr.data ?? {});
        } catch { /* photos optional */ }
      }
    } catch (err) { console.error('loadEmployees error:', err); setError("Error al cargar empleados"); }
    finally { setLoading(false); }
  }

  async function loadAttendance() {
    setLoadingAttendance(true);
    try {
      const res = await api.get("/hr/attendance/today", { headers });
      setAttendance(Array.isArray(res.data) ? res.data : []);
    } catch { setAttendance([]); }
    finally { setLoadingAttendance(false); }
  }

  async function loadPeriodAttendance() {
    setLoadingPeriodAtt(true);
    try {
      const activeEmps = employees.filter(e => e.status === 'ACTIVO');
      const results = await Promise.all(
        activeEmps.map(emp =>
          api.get(`/hr/attendance/employee/${emp.id}`, {
            params: { startDate: attendancePeriod.start, endDate: attendancePeriod.end },
            headers,
          }).then(r => ({ employeeId: emp.id, records: r.data }))
            .catch(() => ({ employeeId: emp.id, records: [] }))
        )
      );
      setPeriodAttendance(results);
    } catch (e) { console.error(e); }
    setLoadingPeriodAtt(false);
    loadLockedDates();
  }

  const loadLockedDates = async () => {
    if (!activeBranch?.id) return;
    try {
      const days: string[] = [];
      const start = new Date(attendancePeriod.start + 'T12:00:00');
      const end = new Date(attendancePeriod.end + 'T12:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(d.toISOString().split('T')[0]);
      }
      const results = await Promise.all(
        days.map(date =>
          api.get('/payroll/period-locked', { params: { branchId: activeBranch.id, date } })
            .then(r => r.data ? date : null)
            .catch(() => null)
        )
      );
      setLockedDates(new Set(results.filter(Boolean) as string[]));
    } catch(e) { console.error(e); }
  };

  const loadCatalog = async () => {
    try {
      const res = await api.get('/payroll/catalog');
      setCatalog(Array.isArray(res.data) ? res.data : []);
    } catch(e) { console.error(e); }
  };

  async function setIncidence(employeeId: string, date: string, key: string, overtimeHours?: number, note?: string) {
    const incKey = INCIDENCE_KEYS.find(k => k.key === key);
    if (!incKey) return;

    const reason = window.prompt('Motivo del cambio (requerido):');
    if (reason === null) return;

    await api.post('/hr/attendance/upsert', {
      employeeId,
      date,
      status: incKey.status,
      incidenceType: key,
      overtimeHours: overtimeHours || null,
      incidenceNote: note || key,
      changeReason: reason,
      changedBy: user?.email || 'admin',
    }, { headers });
    await loadPeriodAttendance();
  }

  const loadAudit = async (emp: any) => {
    setAuditEmployee(emp);
    try {
      const res = await api.get(`/hr/attendance/${emp.id}/audit`, { headers });
      setAuditLogs(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); }
    setShowAuditModal(true);
  };

  async function createManualAttendance() {
    if (!attendanceForm.employeeId) { setError('Selecciona un empleado'); return; }
    if (!attendanceForm.date) { setError('Selecciona una fecha'); return; }
    setAttendanceSaving(true);
    try {
      await api.post('/hr/attendance', {
        employeeId: attendanceForm.employeeId,
        date: attendanceForm.date,
        checkIn: attendanceForm.checkIn || undefined,
        checkOut: attendanceForm.checkOut || undefined,
      }, { headers });
      setShowAttendanceModal(false);
      setAttendanceForm({ employeeId: '', date: new Date().toISOString().split('T')[0], checkIn: '08:00', checkOut: '' });
      loadAttendance();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar asistencia');
    } finally {
      setAttendanceSaving(false);
    }
  }

  async function loadShifts() {
    setLoadingShifts(true);
    try {
      const res = await api.get("/hr/shifts", { headers });
      const data = Array.isArray(res.data) ? res.data : [];
      setShifts(data);
      const map: Record<string, string> = {};
      data.forEach((s: any) => { map[s.id] = s.name; });
      setShiftsMap(map);
    } catch { setShifts([]); }
    finally { setLoadingShifts(false); }
  }

  async function loadMetrics() {
    try {
      const [aRes, rRes] = await Promise.all([
        api.get("/hr/attendance/today", { headers }),
        api.get("/hr/requests/pending", { headers }),
      ]);
      setAttendanceCount(Array.isArray(aRes.data) ? aRes.data.length : 0);
      const p = rRes.data ?? { vacaciones: [], permisos: [] };
      setVacacionesCount((p.vacaciones?.length || 0) + (p.permisos?.length || 0));
    } catch {}
  }

  async function loadBirthdays() {
    setLoadingBirthdays(true);
    try {
      const res = await api.get("/hr/employees/birthdays", { headers });
      setBirthdays(Array.isArray(res.data) ? res.data : []);
    } catch { setBirthdays([]); }
    finally { setLoadingBirthdays(false); }
  }

  async function loadPending() {
    setLoadingPending(true);
    try {
      const res = await api.get("/hr/requests/pending", { headers });
      setPendingRequests(res.data ?? { vacaciones: [], permisos: [] });
    } catch { setPendingRequests({ vacaciones: [], permisos: [] }); }
    finally { setLoadingPending(false); }
  }

  // ── Payroll functions ──

  const loadPayrollRuns = async () => {
    try {
      const res = await api.get('/payroll/runs');
      setPayrollRuns(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); }
  };

  const loadCajas = async () => {
    try {
      const res = await api.get('/banks');
      setCajas(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); }
  };

  const loadRun = async (id: string) => {
    try {
      const res = await api.get(`/payroll/runs/${id}`);
      // Backend returns { run, entries } — merge into a flat object
      setSelectedRun({ ...res.data.run, entries: res.data.entries });
    } catch (e) { console.error(e); }
  };

  const createPayrollRun = async () => {
    if (!newRunForm.periodStart || !newRunForm.periodEnd) return;
    setLoadingPayroll(true);
    try {
      const res = await api.post('/payroll/runs', { ...newRunForm, branchId: activeBranch?.id });
      // Backend returns { run, entries }
      setPayrollRuns((prev: any[]) => [res.data.run, ...prev]);
      setSelectedRun({ ...res.data.run, entries: res.data.entries });
      setPayrollTab('prenomina');
      setShowNewRunModal(false);
    } catch (e) { console.error(e); }
    setLoadingPayroll(false);
  };

  const updateEntry = async (entryId: string, concepts: any[]) => {
    try {
      await api.put(`/payroll/entries/${entryId}`, { concepts });
      if (selectedRun?.id) await loadRun(selectedRun.id);
    } catch (e) { console.error(e); }
  };

  const approveRun = async () => {
    if (!selectedRun) return;
    try {
      const res = await api.put(`/payroll/runs/${selectedRun.id}/approve`, {
        approvedBy: (user as any)?.email || 'admin',
      });
      setSelectedRun((prev: any) => ({ ...res.data, entries: prev?.entries }));
      setPayrollTab('nomina');
    } catch (e) { console.error(e); }
  };

  const confirmPayment = async () => {
    if (!selectedRun || !selectedCajaId) return;
    try {
      await api.put(`/payroll/runs/${selectedRun.id}/confirm-payment`, { bankId: selectedCajaId });
      await loadPayrollRuns();
      setSelectedRun(null);
      setPayrollTab('lista');
      setSelectedCajaId('');
    } catch (e) { console.error(e); }
  };

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
        await api.post(`/hr/employees/${selectedEmp.id}/documents`, { tipo: bulkFiles[i].tipo, nombre: bulkFiles[i].file.name, fileData });
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
    reader.onload = () => setDocForm((p) => ({ ...p, fileData: reader.result as string, nombre: p.nombre || file.name }));
    reader.readAsDataURL(file);
  }

  function openDoc(doc: HrDocument) {
    const src = doc.fileData || doc.url;
    if (!src) return;
    if (src.startsWith("data:")) {
      const [header, base64] = src.split(",");
      const mime = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
      const bytes = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
      window.open(URL.createObjectURL(new Blob([bytes], { type: mime })), "_blank");
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
        { fields: ocrFields }, { headers },
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
    .reduce((sum, e) => {
      const sd = Number(e.salarioDiarioIntegrado) || 0;
      const periodo = e.periodoPago || 'QUINCENAL';
      const bruto = sd > 0 ? calcPeriodo(sd, periodo) : Number(e.salarioQuincenal) || 0;
      return sum + bruto - Number(e.deducciones);
    }, 0);

  // Computed for read-only salary preview in modal
  const sdModal = Number(editingEmp.salarioDiarioIntegrado) || 0;
  const periodoModal = editingEmp.periodoPago || 'QUINCENAL';
  const salarioEstimado = calcPeriodo(sdModal, periodoModal);

  // Subtitle empresa·sucursal
  const contextSubtitle = [activeCompany?.name, activeBranch?.name].filter(Boolean).join(' · ') || '—';

  // Tab label helper
  const tabLabel: Record<Tab, string> = {
    empleados: 'Empleados', expedientes: 'Contratos', nomina: 'Nómina',
    asistencia: 'Asistencias', turnos: 'Turnos', solicitudes: 'Vacaciones',
    cumpleanos: 'Cumpleaños',
  };

  // Common input style
  const inp = "w-full rounded border border-slate-700 bg-slate-800 p-2 text-sm text-white outline-none focus:border-blue-500";

  return (
    <MainLayout>
      <div style={{ padding: '24px 28px', minHeight: '100%', color: '#c8cdd8' }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#c8cdd8', margin: 0 }}>{tabLabel[tab]}</h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '3px 0 0' }}>{contextSubtitle}</p>
          </div>

          {tab === "empleados" && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Metrics pills */}
              {[
                { icon: '👥', val: activeCount,                   label: 'Activos' },
                { icon: '✓',  val: attendanceCount,               label: 'Asistencias hoy' },
                { icon: '🏖',  val: vacacionesCount,               label: 'Vacaciones' },
                { icon: '$',  val: `$${totalNomina.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`, label: 'Nómina' },
              ].map(m => (
                <div key={m.label} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  fontSize: 11.5,
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{m.icon}</span>
                  <span style={{ color: '#c8cdd8', fontWeight: 600 }}>{m.val}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>{m.label}</span>
                </div>
              ))}
              <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
              <button onClick={openNew} style={{
                padding: '6px 16px', borderRadius: 6, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                background: '#1e2d45', border: '1px solid rgba(123,156,204,0.3)', color: '#8fafd4',
              }}>
                + Nuevo
              </button>
            </div>
          )}
        </div>

        {error && <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13 }}>{error}</div>}

        {/* ── Internal tabs ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 20, overflowX: 'auto' }}>
          {(["empleados", "expedientes", "nomina", "asistencia", "turnos", "solicitudes", "cumpleanos"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 14px', fontSize: 12.5, fontWeight: tab === t ? 500 : 400,
              color: tab === t ? '#c8cdd8' : 'rgba(255,255,255,0.35)',
              borderBottom: `2px solid ${tab === t ? 'rgba(255,255,255,0.25)' : 'transparent'}`,
              background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              borderBottomWidth: 2, borderBottomStyle: 'solid',
              borderBottomColor: tab === t ? 'rgba(255,255,255,0.25)' : 'transparent',
            }}>
              {tabLabel[t]}
            </button>
          ))}
        </div>

        {/* ── TAB: Empleados ── */}
        {tab === "empleados" && (
          loading ? (
            <div style={{ padding: 24, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Cargando...</div>
          ) : (
            <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {["Empleado", "Área", "Puesto", "Turno", "Estado", ""].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Sin empleados registrados</td></tr>
                  )}
                  {employees.map((emp) => {
                    const badge = STATUS_BADGE[emp.status] ?? STATUS_BADGE.BAJA;
                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        {/* Empleado — avatar + nombre */}
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <EmpAvatar emp={emp} photos={employeePhotos} />
                            <div>
                              <div style={{ fontWeight: 500, color: '#c8cdd8' }}>{emp.nombre} {emp.apellidos}</div>
                              {emp.fechaIngreso && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>{new Date(emp.fechaIngreso).toLocaleDateString('es-MX')}</div>}
                            </div>
                          </div>
                        </td>
                        {/* Área */}
                        <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)' }}>{emp.departamento || '—'}</td>
                        {/* Puesto */}
                        <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)' }}>{emp.puesto || '—'}</td>
                        {/* Turno */}
                        <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                          {emp.shiftId ? (shiftsMap[emp.shiftId] || emp.shiftId.slice(0, 8) + '…') : '—'}
                        </td>
                        {/* Estado */}
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>
                            {emp.status}
                          </span>
                        </td>
                        {/* Acciones */}
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEdit(emp)} style={{ padding: '3px 10px', fontSize: 11.5, borderRadius: 4, background: '#1e2d45', border: '1px solid rgba(123,156,204,0.25)', color: '#8fafd4', cursor: 'pointer' }}>Editar</button>
                            <button onClick={() => deleteEmployee(emp.id)} style={{ padding: '3px 10px', fontSize: 11.5, borderRadius: 4, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.8)', cursor: 'pointer' }}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── TAB: Expedientes ── */}
        {tab === "expedientes" && (
          <div className="space-y-4">
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[{ key: 'documentos', label: 'Expediente' }, { key: 'contratos', label: 'Contratos y firma' }].map(t => (
                <button key={t.key} onClick={() => setExpedienteSubTab(t.key as any)}
                  style={{
                    padding: '6px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                    border: expedienteSubTab === t.key ? '1px solid rgba(123,156,204,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    background: expedienteSubTab === t.key ? 'rgba(123,156,204,0.15)' : 'transparent',
                    color: expedienteSubTab === t.key ? '#8fafd4' : '#c8cdd8',
                  }}>{t.label}</button>
              ))}
            </div>
            {expedienteSubTab === 'documentos' && (<>
            {!selectedEmp ? (
              <div>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 16 }}>Selecciona un empleado para ver sus contratos y documentos.</p>
                <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {["Empleado", "Puesto"].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {employees.map(emp => (
                        <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                          onClick={() => { setSelectedEmp(emp); loadDocs(emp.id); }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          <td style={{ padding: '10px 14px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><EmpAvatar emp={emp} photos={employeePhotos} /><span style={{ fontWeight: 500, color: '#c8cdd8' }}>{emp.nombre} {emp.apellidos}</span></div></td>
                          <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)' }}>{emp.puesto || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 15, margin: 0, color: '#c8cdd8' }}>{selectedEmp.nombre} {selectedEmp.apellidos}</h3>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '3px 0 0' }}>{selectedEmp.puesto} · {selectedEmp.departamento}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setSelectedEmp(null)} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>← Volver</button>
                    <button onClick={() => { setShowBulkPanel(false); setShowDocForm(true); }} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, background: '#1e2d45', border: '1px solid rgba(123,156,204,0.3)', color: '#8fafd4', cursor: 'pointer' }}>+ Agregar Documento</button>
                    <button onClick={() => { setShowDocForm(false); setBulkFiles([]); setBulkProgress(0); setShowBulkPanel(true); }} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, background: 'transparent', border: '1px solid rgba(123,156,204,0.2)', color: 'rgba(139,175,212,0.7)', cursor: 'pointer' }}>Carga masiva</button>
                  </div>
                </div>

                {showDocForm && (
                  <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: '#141820', padding: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 500, margin: '0 0 14px', color: '#c8cdd8' }}>Nuevo Documento</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Tipo</label>
                        <select value={docForm.tipo} onChange={(e) => setDocForm((p) => ({ ...p, tipo: e.target.value }))} className={inp}>
                          {TIPOS_DOC.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Nombre</label>
                        <input value={docForm.nombre} onChange={(e) => setDocForm((p) => ({ ...p, nombre: e.target.value }))} className={inp} placeholder="Ej: INE frente" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-slate-400 block mb-1">Archivo (PDF, JPG, PNG)</label>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleDocFile} className="w-full text-sm text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white cursor-pointer" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-slate-400 block mb-1">Notas</label>
                        <input value={docForm.notas} onChange={(e) => setDocForm((p) => ({ ...p, notas: e.target.value }))} className={inp} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                      <button onClick={() => setShowDocForm(false)} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Cancelar</button>
                      <button onClick={addDocument} style={{ padding: '6px 16px', fontSize: 12, borderRadius: 6, background: '#1e2d45', border: '1px solid rgba(123,156,204,0.3)', color: '#8fafd4', cursor: 'pointer' }}>Guardar</button>
                    </div>
                  </div>
                )}

                {showBulkPanel && (
                  <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: '#141820', padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 500, margin: 0, color: '#c8cdd8' }}>Carga masiva de documentos</h4>
                      <button onClick={() => setShowBulkPanel(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 18 }}>×</button>
                    </div>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleBulkSelect} className="w-full text-sm text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white cursor-pointer" />
                    {bulkFiles.length > 0 && (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                        {bulkFiles.map((bf, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bf.file.name}</span>
                            <select value={bf.tipo} disabled={bulkRunning} onChange={(e) => setBulkFiles((prev) => prev.map((x, idx) => idx === i ? { ...x, tipo: e.target.value } : x))} style={{ background: '#1e2433', border: '1px solid rgba(255,255,255,0.1)', color: '#c8cdd8', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>
                              {TIPOS_DOC.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <span style={{ fontSize: 11, color: bf.status === "done" ? "#4ade80" : bf.status === "error" ? "#f87171" : bf.status === "uploading" ? "#7b9ccc" : "rgba(255,255,255,0.3)" }}>
                              {bf.status === "done" ? "✓" : bf.status === "error" ? "✗" : bf.status === "uploading" ? "..." : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                      <button onClick={() => setShowBulkPanel(false)} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Cerrar</button>
                      <button onClick={runBulkUpload} disabled={bulkRunning || bulkFiles.length === 0} style={{ padding: '6px 16px', fontSize: 12, borderRadius: 6, background: '#1e2d45', border: '1px solid rgba(123,156,204,0.3)', color: '#8fafd4', cursor: 'pointer', opacity: bulkRunning || bulkFiles.length === 0 ? 0.5 : 1 }}>
                        {bulkRunning ? `Subiendo ${bulkProgress}/${bulkFiles.length}...` : `Subir todos (${bulkFiles.length})`}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {["Tipo", "Nombre", "Documento", "Notas", "Fecha", ""].map((h) => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {docs.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>Sin documentos</td></tr>}
                      {docs.map((d) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 500, color: '#7b9ccc', fontSize: 11.5 }}>{d.tipo}</td>
                          <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)' }}>{d.nombre || "—"}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {d.fileData ? (
                              d.fileData.startsWith("data:image") ? (
                                <button onClick={() => openDoc(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                  <img src={d.fileData} alt={d.nombre || d.tipo} style={{ maxHeight: 36, borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', objectFit: 'contain', opacity: 0.9 }} />
                                </button>
                              ) : (
                                <button onClick={() => openDoc(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7b9ccc', fontSize: 12 }}>Ver PDF</button>
                              )
                            ) : d.url ? (
                              <a href={d.url} target="_blank" rel="noreferrer" style={{ color: '#7b9ccc', fontSize: 12 }}>Ver enlace</a>
                            ) : "—"}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{d.notas || "—"}</td>
                          <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>{new Date(d.uploadedAt).toLocaleDateString("es-MX")}</td>
                          <td style={{ padding: '10px 14px' }}><button onClick={() => removeDoc(d.id)} style={{ padding: '3px 10px', fontSize: 11, borderRadius: 4, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.8)', cursor: 'pointer' }}>Eliminar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            </>)}
            {expedienteSubTab === 'contratos' && (
              <ContractsTab
                employees={employees}
                tenantId={tenantId ?? ''}
                companyId={companyId ?? ''}
              />
            )}
          </div>
        )}

        {/* ── TAB: Nómina ── */}
        {tab === "nomina" && (
          <div>
            {/* Sub-tabs internos */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {([
                { key: 'lista',     label: 'Corridas de nómina', disabled: false },
                { key: 'prenomina', label: 'Prenómina',          disabled: !selectedRun },
                { key: 'nomina',    label: 'Nómina confirmada',  disabled: !selectedRun || selectedRun?.status === 'PRENOMINA' },
                { key: 'catalogo',  label: 'Catálogo',           disabled: false },
              ] as { key: string; label: string; disabled: boolean }[]).map(t => (
                <button key={t.key} disabled={t.disabled}
                  onClick={() => !t.disabled && setPayrollTab(t.key as any)}
                  style={{
                    padding: '6px 16px', borderRadius: 8,
                    border: payrollTab === t.key ? '1px solid rgba(123,156,204,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    background: payrollTab === t.key ? 'rgba(123,156,204,0.15)' : 'transparent',
                    color: t.disabled ? 'rgba(255,255,255,0.2)' : payrollTab === t.key ? '#8fafd4' : '#c8cdd8',
                    fontSize: 13, cursor: t.disabled ? 'not-allowed' : 'pointer',
                  }}>{t.label}</button>
              ))}
              <button onClick={() => setShowNewRunModal(true)}
                style={{
                  marginLeft: 'auto', padding: '6px 16px', borderRadius: 8,
                  border: '1px solid rgba(123,156,204,0.3)',
                  background: 'rgba(123,156,204,0.1)', color: '#8fafd4', fontSize: 13, cursor: 'pointer',
                }}>+ Nueva corrida</button>
            </div>

            {/* SUB-TAB: LISTA */}
            {payrollTab === 'lista' && (
              <div>
                {payrollRuns.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', background: '#141820', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
                    No hay corridas de nómina. Crea una nueva para comenzar.
                  </div>
                ) : (
                  <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                          {['Período', 'Tipo', 'Total', 'Estado', 'Acciones'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: 11.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {payrollRuns.map((run: any) => (
                          <tr key={run.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '10px 12px', color: '#c8cdd8' }}>{run.periodStart} — {run.periodEnd}</td>
                            <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{run.periodType}</td>
                            <td style={{ padding: '10px 12px', color: '#4ade80' }}>${Number(run.totalAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                padding: '2px 10px', borderRadius: 99, fontSize: 11,
                                background: run.status === 'PAGADA' ? 'rgba(74,222,128,0.15)' : run.status === 'APROBADA' ? 'rgba(123,156,204,0.15)' : 'rgba(255,255,255,0.07)',
                                color: run.status === 'PAGADA' ? '#4ade80' : run.status === 'APROBADA' ? '#8fafd4' : 'rgba(255,255,255,0.5)',
                              }}>{run.status}</span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <button
                                onClick={async () => { await loadRun(run.id); setPayrollTab(run.status === 'PRENOMINA' ? 'prenomina' : 'nomina'); }}
                                style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#c8cdd8', fontSize: 12, cursor: 'pointer' }}
                              >Ver</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB: PRENÓMINA */}
            {payrollTab === 'prenomina' && selectedRun && (
              <div>
                <div style={{ marginBottom: 16, padding: '12px 16px', background: '#141820', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                    Período: {selectedRun.periodStart} al {selectedRun.periodEnd}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 500, color: '#4ade80' }}>
                      Total: ${Number(selectedRun.totalAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </div>
                    <button onClick={approveRun}
                      style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontSize: 13, cursor: 'pointer' }}
                    >Aprobar prenómina →</button>
                  </div>
                </div>

                <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {['Empleado', 'Días', 'Percepciones', 'Deducciones', 'Neto', 'Acciones'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: 11.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedRun.entries || []).map((entry: any) => {
                        const emp = employees.find(e => e.id === entry.employeeId);
                        const empName = emp ? `${emp.nombre} ${emp.apellidos || ''}`.trim() : entry.employeeId.slice(0, 8) + '…';
                        return (
                          <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '10px 12px', color: '#c8cdd8' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {emp && <EmpAvatar emp={emp} photos={employeePhotos} />}
                                {empName}
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)' }}>{entry.workedDays}</td>
                            <td style={{ padding: '10px 12px', color: '#4ade80' }}>${Number(entry.totalPerceptions).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td style={{ padding: '10px 12px', color: 'rgba(252,165,165,0.8)' }}>-${Number(entry.totalDeductions).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 500, color: '#c8cdd8' }}>${Number(entry.netAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <button onClick={() => { setSelectedEntry(entry); setShowConceptsModal(true); }}
                                style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#c8cdd8', fontSize: 12, cursor: 'pointer' }}
                              >Editar conceptos</button>
                            </td>
                          </tr>
                        );
                      })}
                      {(selectedRun.entries || []).length === 0 && (
                        <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>Sin empleados en esta corrida</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB: NÓMINA CONFIRMADA */}
            {payrollTab === 'nomina' && selectedRun && (
              <div>
                <div style={{ marginBottom: 16, padding: '12px 16px', background: '#141820', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Selecciona la caja desde donde sale el efectivo</div>
                  <select value={selectedCajaId} onChange={e => setSelectedCajaId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13, marginBottom: 12 }}>
                    <option value="">— Seleccionar caja —</option>
                    {cajas.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name} · Saldo: ${Number(b.balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 500, color: '#4ade80' }}>
                      Total a pagar: ${Number(selectedRun.totalAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </div>
                    <button onClick={confirmPayment}
                      disabled={!selectedCajaId || selectedRun.status === 'PAGADA'}
                      style={{
                        padding: '8px 20px', borderRadius: 8,
                        border: '1px solid rgba(74,222,128,0.3)',
                        background: selectedCajaId && selectedRun.status !== 'PAGADA' ? 'rgba(74,222,128,0.1)' : 'transparent',
                        color: selectedCajaId && selectedRun.status !== 'PAGADA' ? '#4ade80' : 'rgba(255,255,255,0.2)',
                        fontSize: 13, cursor: selectedCajaId ? 'pointer' : 'not-allowed',
                      }}
                    >{selectedRun.status === 'PAGADA' ? '✓ Nómina pagada' : 'Confirmar pago en efectivo'}</button>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    Al confirmar se registra un egreso interno "NOMINA" en la caja seleccionada.
                  </div>
                </div>

                <PayrollPrint
                  run={selectedRun}
                  employees={employees}
                  company={activeCompany}
                  branch={activeBranch}
                />

                <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {['Empleado', 'Neto a pagar'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: 11.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedRun.entries || []).map((entry: any) => {
                        const emp = employees.find(e => e.id === entry.employeeId);
                        const empName = emp ? `${emp.nombre} ${emp.apellidos || ''}`.trim() : entry.employeeId.slice(0, 8) + '…';
                        return (
                          <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '10px 12px', color: '#c8cdd8' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {emp && <EmpAvatar emp={emp} photos={employeePhotos} />}
                                {empName}
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 500, color: '#4ade80' }}>${Number(entry.netAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB: CATÁLOGO */}
            {payrollTab === 'catalogo' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    Los conceptos globales (ESTIA) no se pueden modificar. Agrega los propios de tu empresa.
                  </div>
                  <button
                    onClick={() => { setCatalogForm({ name: '', type: 'P', defaultAmount: 0, category: 'OTRO' }); setEditingCatalogId(null); setShowCatalogModal(true); }}
                    style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(123,156,204,0.3)', background: 'rgba(123,156,204,0.1)', color: '#8fafd4', fontSize: 13, cursor: 'pointer' }}
                  >+ Agregar concepto</button>
                </div>

                {/* Percepciones */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Percepciones</div>
                  <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', overflow: 'hidden' }}>
                    {catalog.filter(c => c.type === 'P').map((c: any) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ flex: 1, color: '#c8cdd8', fontSize: 13 }}>{c.name}</div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginRight: 16 }}>{c.category}</div>
                        {c.isGlobal ? (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(123,156,204,0.1)', color: '#8fafd4' }}>ESTIA</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => { setEditingCatalogId(c.id); setCatalogForm({ name: c.name, type: c.type, defaultAmount: c.defaultAmount, category: c.category || 'OTRO' }); setShowCatalogModal(true); }}
                              style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#c8cdd8', fontSize: 11, cursor: 'pointer' }}
                            >Editar</button>
                            <button
                              onClick={async () => { await api.delete(`/payroll/catalog/${c.id}`); await loadCatalog(); }}
                              style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(252,165,165,0.2)', background: 'transparent', color: 'rgba(252,165,165,0.7)', fontSize: 11, cursor: 'pointer' }}
                            >Eliminar</button>
                          </div>
                        )}
                      </div>
                    ))}
                    {catalog.filter(c => c.type === 'P').length === 0 && (
                      <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Sin percepciones</div>
                    )}
                  </div>
                </div>

                {/* Deducciones */}
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(252,165,165,0.8)', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deducciones</div>
                  <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', overflow: 'hidden' }}>
                    {catalog.filter(c => c.type === 'D').map((c: any) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ flex: 1, color: '#c8cdd8', fontSize: 13 }}>{c.name}</div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginRight: 16 }}>{c.category}</div>
                        {c.isGlobal ? (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(123,156,204,0.1)', color: '#8fafd4' }}>ESTIA</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => { setEditingCatalogId(c.id); setCatalogForm({ name: c.name, type: c.type, defaultAmount: c.defaultAmount, category: c.category || 'OTRO' }); setShowCatalogModal(true); }}
                              style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#c8cdd8', fontSize: 11, cursor: 'pointer' }}
                            >Editar</button>
                            <button
                              onClick={async () => { await api.delete(`/payroll/catalog/${c.id}`); await loadCatalog(); }}
                              style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(252,165,165,0.2)', background: 'transparent', color: 'rgba(252,165,165,0.7)', fontSize: 11, cursor: 'pointer' }}
                            >Eliminar</button>
                          </div>
                        )}
                      </div>
                    ))}
                    {catalog.filter(c => c.type === 'D').length === 0 && (
                      <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Sin deducciones</div>
                    )}
                  </div>
                </div>

                {/* Modal agregar/editar concepto */}
                {showCatalogModal && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#141820', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', padding: 24, width: 400 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: '#c8cdd8', marginBottom: 20 }}>
                        {editingCatalogId ? 'Editar concepto' : 'Nuevo concepto'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Nombre</div>
                          <input value={catalogForm.name} onChange={e => setCatalogForm(p => ({ ...p, name: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13 }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Tipo</div>
                          <select value={catalogForm.type} onChange={e => setCatalogForm(p => ({ ...p, type: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13 }}>
                            <option value="P">Percepción</option>
                            <option value="D">Deducción</option>
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Categoría</div>
                          <select value={catalogForm.category} onChange={e => setCatalogForm(p => ({ ...p, category: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13 }}>
                            <option value="SALARIO">Salario</option>
                            <option value="TIEMPO_EXTRA">Tiempo extra</option>
                            <option value="SEPTIMO_DIA">Séptimo día</option>
                            <option value="BONO">Bono</option>
                            <option value="DEDUCCION_FALTA">Deducción por falta</option>
                            <option value="PRESTAMO">Préstamo</option>
                            <option value="OTRO">Otro</option>
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Monto default (0 = se captura al momento)</div>
                          <input type="number" value={catalogForm.defaultAmount}
                            onChange={e => setCatalogForm(p => ({ ...p, defaultAmount: parseFloat(e.target.value) || 0 }))}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13 }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                        <button onClick={() => setShowCatalogModal(false)}
                          style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#c8cdd8', fontSize: 13, cursor: 'pointer' }}>
                          Cancelar
                        </button>
                        <button onClick={async () => {
                          await api.post('/payroll/catalog', { ...catalogForm, id: editingCatalogId });
                          await loadCatalog();
                          setShowCatalogModal(false);
                        }}
                          style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid rgba(123,156,204,0.3)', background: 'rgba(123,156,204,0.1)', color: '#8fafd4', fontSize: 13, cursor: 'pointer' }}>
                          {editingCatalogId ? 'Guardar cambios' : 'Agregar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODAL: Nueva corrida */}
            {showNewRunModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#141820', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', padding: 24, width: 420 }}>
                  <div style={{ fontSize: 16, fontWeight: 500, color: '#c8cdd8', marginBottom: 20 }}>Nueva corrida de nómina</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Fecha inicio</div>
                      <input type="date" value={newRunForm.periodStart}
                        onChange={e => setNewRunForm(p => ({ ...p, periodStart: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Fecha fin</div>
                      <input type="date" value={newRunForm.periodEnd}
                        onChange={e => setNewRunForm(p => ({ ...p, periodEnd: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Tipo de período</div>
                      <select value={newRunForm.periodType}
                        onChange={e => setNewRunForm(p => ({ ...p, periodType: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13 }}>
                        <option value="SEMANAL">Semanal</option>
                        <option value="QUINCENAL">Quincenal</option>
                        <option value="MENSUAL">Mensual</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Notas (opcional)</div>
                      <input value={newRunForm.notes}
                        onChange={e => setNewRunForm(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Ej: Quincena junio primera parte"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                    <button onClick={() => setShowNewRunModal(false)}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#c8cdd8', fontSize: 13, cursor: 'pointer' }}>
                      Cancelar
                    </button>
                    <button onClick={createPayrollRun} disabled={loadingPayroll}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid rgba(123,156,204,0.3)', background: 'rgba(123,156,204,0.1)', color: '#8fafd4', fontSize: 13, cursor: 'pointer', opacity: loadingPayroll ? 0.6 : 1 }}>
                      {loadingPayroll ? 'Creando...' : 'Crear corrida'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: Editar conceptos de un entry */}
            {showConceptsModal && selectedEntry && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#141820', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', padding: 24, width: 500, maxHeight: '80vh', overflowY: 'auto' }}>
                  <div style={{ fontSize: 16, fontWeight: 500, color: '#c8cdd8', marginBottom: 16 }}>
                    Conceptos — {(() => { const e = employees.find(x => x.id === selectedEntry.employeeId); return e ? `${e.nombre} ${e.apellidos || ''}`.trim() : selectedEntry.employeeId.slice(0, 8) + '…'; })()}
                  </div>
                  <ConceptsEditor
                    entry={selectedEntry}
                    catalog={catalog}
                    onSave={async (concepts) => {
                      await updateEntry(selectedEntry.id, concepts);
                      setShowConceptsModal(false);
                    }}
                    onClose={() => setShowConceptsModal(false)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Asistencia ── */}
        {tab === "asistencia" && (
          <div>
            {/* Selector de período */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Del</span>
                <input type="date" value={attendancePeriod.start}
                  onChange={e => setAttendancePeriod(p => ({ ...p, start: e.target.value }))}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>al</span>
                <input type="date" value={attendancePeriod.end}
                  onChange={e => setAttendancePeriod(p => ({ ...p, end: e.target.value }))}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13 }} />
                <button onClick={loadPeriodAttendance}
                  style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(123,156,204,0.3)', background: 'rgba(123,156,204,0.1)', color: '#8fafd4', fontSize: 13, cursor: 'pointer' }}>
                  Cargar
                </button>
              </div>
            </div>

            {loadingPeriodAtt ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>Cargando...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: '100%' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 500, minWidth: 160, position: 'sticky', left: 0, background: '#0f1117' }}>Empleado</th>
                      {(() => {
                        const days: Date[] = [];
                        const start = new Date(attendancePeriod.start + 'T12:00:00');
                        const end = new Date(attendancePeriod.end + 'T12:00:00');
                        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
                        return days.map(d => {
                          const dow = ['D','L','M','X','J','V','S'][d.getDay()];
                          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                          return (
                            <th key={d.toISOString()} style={{
                              padding: '8px 6px', textAlign: 'center', minWidth: 44,
                              color: isWeekend ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)',
                              fontWeight: 500,
                            }}>
                              <div>{dow}</div>
                              <div style={{ fontSize: 10 }}>{d.getDate()}</div>
                            </th>
                          );
                        });
                      })()}
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Días</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.filter(e => e.status === 'ACTIVO').map(emp => {
                      const empData = periodAttendance.find(p => p.employeeId === emp.id);
                      const records: any[] = empData?.records || [];
                      const days: Date[] = [];
                      const start = new Date(attendancePeriod.start + 'T12:00:00');
                      const end = new Date(attendancePeriod.end + 'T12:00:00');
                      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
                      const workedDays = records.filter(r => ['PRESENTE','TARDANZA'].includes(r.status)).length;

                      return (
                        <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px 12px', position: 'sticky', left: 0, background: '#0f1117' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <EmpAvatar emp={emp} photos={employeePhotos} />
                              <span style={{ color: '#c8cdd8', fontWeight: 500 }}>{emp.nombre}</span>
                              <button
                                onClick={() => loadAudit(emp)}
                                style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                              >historial</button>
                            </div>
                          </td>
                          {days.map(d => {
                            const dateStr = d.toISOString().split('T')[0];
                            const rec = records.find(r => r.date?.split('T')[0] === dateStr || r.date === dateStr);
                            const incKey = rec ? INCIDENCE_KEYS.find(k => k.key === rec.incidenceType) || (rec.status === 'PRESENTE' ? INCIDENCE_KEYS[0] : null) : null;
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            return (
                              <td key={dateStr} style={{ padding: '4px 3px', textAlign: 'center' }}>
                                <IncidenceInput
                                  value={incKey?.key || ''}
                                  isWeekend={isWeekend}
                                  locked={lockedDates.has(dateStr)}
                                  onChange={async (val) => {
                                    if (val === 'TE') {
                                      setOvertimeTarget({ employeeId: emp.id, date: dateStr, hours: 1, note: '' });
                                      setShowOvertimeModal(true);
                                    } else {
                                      await setIncidence(emp.id, dateStr, val);
                                    }
                                  }}
                                />
                              </td>
                            );
                          })}
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#4ade80', fontWeight: 500 }}>
                            {workedDays}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal: captura horas extra */}
            {showOvertimeModal && overtimeTarget && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#141820', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', padding: 24, width: 340 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#c8cdd8', marginBottom: 16 }}>Tiempo extra — {overtimeTarget.date}</div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Horas extra</div>
                    <input type="number" min={0.5} max={12} step={0.5}
                      value={overtimeTarget.hours}
                      onChange={e => setOvertimeTarget(p => p ? ({ ...p, hours: parseFloat(e.target.value) || 0 }) : p)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13 }} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Nota (opcional)</div>
                    <input value={overtimeTarget.note}
                      onChange={e => setOvertimeTarget(p => p ? ({ ...p, note: e.target.value }) : p)}
                      placeholder="Ej: Cierre de mes"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117', color: '#c8cdd8', fontSize: 13 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setShowOvertimeModal(false); setOvertimeTarget(null); }}
                      style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#c8cdd8', fontSize: 13, cursor: 'pointer' }}>
                      Cancelar
                    </button>
                    <button onClick={async () => {
                      if (overtimeTarget) {
                        await setIncidence(overtimeTarget.employeeId, overtimeTarget.date, 'TE', overtimeTarget.hours, overtimeTarget.note);
                        setShowOvertimeModal(false);
                        setOvertimeTarget(null);
                      }
                    }}
                      style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid rgba(123,156,204,0.3)', background: 'rgba(123,156,204,0.1)', color: '#8fafd4', fontSize: 13, cursor: 'pointer' }}>
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: historial de auditoría de incidencias */}
            {showAuditModal && auditEmployee && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#141820', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', padding: 24, width: 660, maxHeight: '80vh', overflowY: 'auto' }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#c8cdd8', marginBottom: 16 }}>
                    Historial de cambios — {auditEmployee.nombre} {auditEmployee.apellidos}
                  </div>
                  {auditLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.3)' }}>Sin cambios registrados</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                          {['Fecha', 'Día', 'Anterior', 'Nuevo', 'Motivo', 'Por', 'Autorizado', 'Acciones'].map(h => (
                            <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: 11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log: any) => (
                          <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: log.reverted ? 0.4 : 1 }}>
                            <td style={{ padding: '8px 6px', color: 'rgba(255,255,255,0.5)' }}>{new Date(log.createdAt).toLocaleDateString('es-MX')}</td>
                            <td style={{ padding: '8px 6px', color: '#c8cdd8' }}>{log.date}</td>
                            <td style={{ padding: '8px 6px', color: 'rgba(252,165,165,0.8)' }}>{log.previousIncidenceType || log.previousStatus || '—'}</td>
                            <td style={{ padding: '8px 6px', color: '#4ade80' }}>{log.newIncidenceType || log.newStatus || '—'}</td>
                            <td style={{ padding: '8px 6px', color: 'rgba(255,255,255,0.5)' }}>{log.changeReason || '—'}</td>
                            <td style={{ padding: '8px 6px', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{log.changedBy}</td>
                            <td style={{ padding: '8px 6px', color: log.approvedBy ? '#4ade80' : 'rgba(255,255,255,0.2)', fontSize: 11 }}>{log.approvedBy || 'Pendiente'}</td>
                            <td style={{ padding: '8px 6px' }}>
                              {!log.reverted && (
                                <button
                                  onClick={async () => {
                                    if (!window.confirm('¿Revertir este cambio?')) return;
                                    await api.post(`/hr/attendance/audit/${log.id}/revert`, { revertedBy: user?.email || 'admin' }, { headers });
                                    await loadAudit(auditEmployee);
                                    await loadPeriodAttendance();
                                  }}
                                  style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(252,165,165,0.3)', background: 'transparent', color: 'rgba(252,165,165,0.7)', cursor: 'pointer' }}
                                >Revertir</button>
                              )}
                              {log.reverted && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Revertido</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <button onClick={() => setShowAuditModal(false)}
                    style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#c8cdd8', fontSize: 13, cursor: 'pointer', width: '100%' }}>
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Turnos ── */}
        {tab === "turnos" && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#c8cdd8' }}>Turnos de trabajo</h2>
              <button onClick={() => setShowShiftForm(true)} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, background: '#1e2d45', border: '1px solid rgba(123,156,204,0.3)', color: '#8fafd4', cursor: 'pointer' }}>+ Nuevo Turno</button>
            </div>
            {loadingShifts ? (
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Cargando...</div>
            ) : shifts.length === 0 ? (
              <div style={{ padding: 24, borderRadius: 10, background: '#141820', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Sin turnos configurados</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {shifts.map((s) => (
                  <div key={s.id} style={{ borderRadius: 10, padding: 16, background: '#141820', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 500, fontSize: 13, color: '#c8cdd8' }}>{s.name}</span>
                      <button onClick={() => deleteShift(s.id)} style={{ fontSize: 11, color: 'rgba(252,165,165,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>Eliminar</button>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{s.startTime} — {s.endTime}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: '4px 0 0' }}>Tolerancia: {s.toleranceMinutes} min</p>
                  </div>
                ))}
              </div>
            )}
            {showShiftForm && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                <div style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: 24, width: "100%", maxWidth: 360 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: '#c8cdd8' }}>Nuevo Turno</h3>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Nombre</label>
                    <input value={shiftForm.name} onChange={(e) => setShiftForm((p) => ({ ...p, name: e.target.value }))} className={inp} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Entrada</label>
                      <input type="time" value={shiftForm.startTime} onChange={(e) => setShiftForm((p) => ({ ...p, startTime: e.target.value }))} className={inp} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Salida</label>
                      <input type="time" value={shiftForm.endTime} onChange={(e) => setShiftForm((p) => ({ ...p, endTime: e.target.value }))} className={inp} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowShiftForm(false)} style={{ flex: 1, padding: '8px', fontSize: 12, borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={saveShift} style={{ flex: 1, padding: '8px', fontSize: 12, borderRadius: 6, background: '#1e2d45', border: '1px solid rgba(123,156,204,0.3)', color: '#8fafd4', fontWeight: 500, cursor: 'pointer' }}>Guardar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Solicitudes ── */}
        {tab === "solicitudes" && (
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16, color: '#c8cdd8' }}>Solicitudes pendientes</h2>
            {loadingPending ? (
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Cargando...</div>
            ) : (
              <>
                {pendingRequests.vacaciones.length === 0 && pendingRequests.permisos.length === 0 && (
                  <div style={{ padding: 24, borderRadius: 10, background: '#141820', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Sin solicitudes pendientes</div>
                )}
                {pendingRequests.vacaciones.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>Vacaciones</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {pendingRequests.vacaciones.map((v: any) => (
                        <div key={v.id} style={{ padding: 14, borderRadius: 10, background: '#141820', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 3px', color: '#c8cdd8' }}>{v.employeeId}</p>
                            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{new Date(v.startDate).toLocaleDateString("es-MX")} — {new Date(v.endDate).toLocaleDateString("es-MX")} ({v.daysRequested} días)</p>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => approveRequest("vacation", v.id)} style={{ padding: '4px 12px', fontSize: 11.5, borderRadius: 5, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', cursor: 'pointer' }}>Aprobar</button>
                            <button onClick={() => rejectRequest("vacation", v.id)} style={{ padding: '4px 12px', fontSize: 11.5, borderRadius: 5, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.8)', cursor: 'pointer' }}>Rechazar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {pendingRequests.permisos.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>Permisos</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {pendingRequests.permisos.map((p: any) => (
                        <div key={p.id} style={{ padding: 14, borderRadius: 10, background: '#141820', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 3px', color: '#c8cdd8' }}>{p.employeeId}</p>
                            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{new Date(p.date).toLocaleDateString("es-MX")} — {p.hours}h — {p.type}</p>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => approveRequest("permission", p.id)} style={{ padding: '4px 12px', fontSize: 11.5, borderRadius: 5, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', cursor: 'pointer' }}>Aprobar</button>
                            <button onClick={() => rejectRequest("permission", p.id)} style={{ padding: '4px 12px', fontSize: 11.5, borderRadius: 5, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.8)', cursor: 'pointer' }}>Rechazar</button>
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

        {/* ── TAB: Cumpleaños ── */}
        {tab === "cumpleanos" && (() => {
          const today = new Date();
          const todayDay   = today.getDate();
          const todayMonth = today.getMonth() + 1;
          return (
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16, color: '#c8cdd8' }}>
                Cumpleaños este mes
              </h2>
              {loadingBirthdays ? (
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Cargando...</div>
              ) : birthdays.length === 0 ? (
                <div style={{ padding: 24, borderRadius: 10, background: '#141820', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center' }}>
                  Sin cumpleaños este mes
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {birthdays.map((b: any) => {
                    const bDate = new Date(b.fechaNacimiento);
                    const bDay  = bDate.getUTCDate();
                    const bMonth = bDate.getUTCMonth() + 1;
                    const isToday = bDay === todayDay && bMonth === todayMonth;
                    const age = todayMonth > bMonth || (todayMonth === bMonth && todayDay >= bDay)
                      ? today.getFullYear() - bDate.getUTCFullYear()
                      : today.getFullYear() - bDate.getUTCFullYear() - 1;
                    const emp = employees.find(e => e.id === b.id);
                    return (
                      <div key={b.id} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 16px', borderRadius: 10,
                        background: isToday ? 'rgba(123,156,204,0.06)' : '#141820',
                        border: `1px solid ${isToday ? 'rgba(123,156,204,0.2)' : 'rgba(255,255,255,0.07)'}`,
                      }}>
                        {emp
                          ? <EmpAvatar emp={emp} photos={employeePhotos} />
                          : (
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1c2030', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 600, flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                              {((b.nombre?.[0] || '') + (b.apellidos?.[0] || '')).toUpperCase() || '?'}
                            </div>
                          )
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, color: '#c8cdd8', fontSize: 13 }}>
                            {b.nombre} {b.apellidos}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                            {b.puesto}{b.departamento ? ` · ${b.departamento}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 12.5, color: isToday ? '#7b9ccc' : 'rgba(255,255,255,0.55)', fontWeight: isToday ? 600 : 400 }}>
                            {String(bDay).padStart(2, '0')}/{String(bMonth).padStart(2, '0')}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                            {age} años
                          </div>
                        </div>
                        {isToday && (
                          <div style={{ fontSize: 18, marginLeft: 4 }} title="¡Cumpleaños hoy!">🎂</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

      </div>

      {/* ── Modal Registrar Asistencia Manual ── */}
      {showAttendanceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAttendanceModal(false); }}>
          <div style={{ background: '#141820', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#c8cdd8' }}>Registrar Asistencia</h3>
              <button onClick={() => setShowAttendanceModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Empleado</label>
                <select value={attendanceForm.employeeId} onChange={(e) => setAttendanceForm(p => ({ ...p, employeeId: e.target.value }))} className={inp}>
                  <option value="">Seleccionar empleado...</option>
                  {employees.filter(e => e.status === 'ACTIVO').map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellidos || ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Fecha</label>
                <input type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm(p => ({ ...p, date: e.target.value }))} className={inp} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Hora entrada</label>
                  <input type="time" value={attendanceForm.checkIn} onChange={(e) => setAttendanceForm(p => ({ ...p, checkIn: e.target.value }))} className={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Hora salida <span style={{ opacity: 0.5, fontSize: 10 }}>(opcional)</span></label>
                  <input type="time" value={attendanceForm.checkOut} onChange={(e) => setAttendanceForm(p => ({ ...p, checkOut: e.target.value }))} className={inp} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowAttendanceModal(false)} style={{ padding: '7px 14px', fontSize: 12, borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={createManualAttendance} disabled={attendanceSaving} style={{ padding: '7px 18px', fontSize: 12, borderRadius: 6, background: '#1e2d45', border: '1px solid rgba(123,156,204,0.3)', color: '#8fafd4', fontWeight: 500, cursor: 'pointer', opacity: attendanceSaving ? 0.6 : 1 }}>
                {attendanceSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal empleado — 4 pestañas ── */}
      {showEmpModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEmpModal(false); }}>
          <div style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, width: "100%", maxWidth: 640, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#c8cdd8' }}>{isEdit ? "Editar Empleado" : "Nuevo Empleado"}</h2>
                <button onClick={() => setShowEmpModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
                {((['personal', 'laboral', 'nomina'] as const) as readonly string[]).concat(isEdit ? ['expediente'] : []).map((t) => (
                  <button key={t} onClick={() => setModalTab(t as any)} style={{
                    padding: '8px 14px', fontSize: 12.5, fontWeight: modalTab === t ? 500 : 400,
                    color: modalTab === t ? '#c8cdd8' : 'rgba(255,255,255,0.35)',
                    borderBottom: `2px solid ${modalTab === t ? '#7b9ccc' : 'transparent'}`,
                    background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                    borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: modalTab === t ? '#7b9ccc' : 'transparent',
                  }}>
                    {t === 'personal' ? 'Datos Personales' : t === 'laboral' ? 'Relación Laboral' : t === 'nomina' ? 'Nómina' : 'Expediente'}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

              {/* PESTAÑA 1 — Datos Personales */}
              {modalTab === 'personal' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-slate-400 mb-1">Nombre *</label><input value={editingEmp.nombre ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, nombre: e.target.value }))} className={inp} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Apellidos</label><input value={editingEmp.apellidos ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, apellidos: e.target.value }))} className={inp} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Fecha de Nacimiento</label><input type="date" value={editingEmp.fechaNacimiento ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, fechaNacimiento: e.target.value }))} className={inp} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Género</label>
                    <select value={editingEmp.genero ?? "M"} onChange={(e) => setEditingEmp((p) => ({ ...p, genero: e.target.value }))} className={inp}>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div><label className="block text-xs text-slate-400 mb-1">CURP (18 chars)</label><input value={editingEmp.curp ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, curp: e.target.value.toUpperCase() }))} maxLength={18} className={`${inp} font-mono`} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">RFC (12-13 chars)</label><input value={editingEmp.rfc ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, rfc: e.target.value.toUpperCase() }))} maxLength={13} className={`${inp} font-mono`} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">NSS (11 dígitos)</label><input value={editingEmp.nss ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, nss: e.target.value.replace(/\D/g, "").slice(0, 11) }))} className={`${inp} font-mono`} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Número INE</label><input value={editingEmp.numeroIne ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, numeroIne: e.target.value }))} className={`${inp} font-mono`} /></div>
                  <div className="col-span-2"><label className="block text-xs text-slate-400 mb-1">Domicilio</label><input value={editingEmp.domicilio ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, domicilio: e.target.value }))} className={inp} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Colonia</label><input value={editingEmp.colonia ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, colonia: e.target.value }))} className={inp} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Código Postal</label><input value={editingEmp.codigoPostal ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, codigoPostal: e.target.value.replace(/\D/g, "").slice(0, 5) }))} className={`${inp} font-mono`} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Ciudad</label><input value={editingEmp.ciudad ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, ciudad: e.target.value }))} className={inp} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Estado</label><input value={editingEmp.estado ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, estado: e.target.value }))} className={inp} /></div>
                </div>
              )}

              {/* PESTAÑA 2 — Relación Laboral */}
              {modalTab === 'laboral' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-slate-400 mb-1">Fecha de Ingreso</label><input type="date" value={editingEmp.fechaIngreso ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, fechaIngreso: e.target.value }))} className={inp} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Puesto</label><input value={editingEmp.puesto ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, puesto: e.target.value }))} className={inp} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Departamento</label><input value={editingEmp.departamento ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, departamento: e.target.value }))} className={inp} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Tipo de Jornada</label>
                    <select value={editingEmp.tipoJornada ?? "COMPLETA"} onChange={(e) => setEditingEmp((p) => ({ ...p, tipoJornada: e.target.value }))} className={inp}>
                      <option value="COMPLETA">Completa</option><option value="PARCIAL">Parcial</option><option value="POR_HORAS">Por Horas</option>
                    </select>
                  </div>
                  <div><label className="block text-xs text-slate-400 mb-1">Tipo de Contrato</label>
                    <select value={editingEmp.tipoContrato ?? "INDETERMINADO"} onChange={(e) => setEditingEmp((p) => ({ ...p, tipoContrato: e.target.value }))} className={inp}>
                      <option value="INDETERMINADO">Indeterminado</option><option value="DETERMINADO">Determinado</option><option value="TEMPORADA">Temporada</option>
                    </select>
                  </div>
                  <div><label className="block text-xs text-slate-400 mb-1">Tipo de Salario</label>
                    <select value={editingEmp.tipoSalario ?? "FIJO"} onChange={(e) => setEditingEmp((p) => ({ ...p, tipoSalario: e.target.value }))} className={inp}>
                      <option value="FIJO">Fijo</option><option value="VARIABLE">Variable</option><option value="MIXTO">Mixto</option>
                    </select>
                  </div>
                  <div><label className="block text-xs text-slate-400 mb-1">S.D.I. (Salario Diario Integrado)</label><input type="number" value={editingEmp.salarioDiarioIntegrado ?? 0} onChange={(e) => setEditingEmp((p) => ({ ...p, salarioDiarioIntegrado: parseFloat(e.target.value) || 0 }))} className={inp} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Clave Riesgo de Trabajo</label><input value={editingEmp.claveRiesgoTrabajo ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, claveRiesgoTrabajo: e.target.value }))} className={inp} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Estado</label>
                    <select value={editingEmp.status ?? "ACTIVO"} onChange={(e) => setEditingEmp((p) => ({ ...p, status: e.target.value }))} className={inp}>
                      <option value="ACTIVO">Activo</option><option value="BAJA">Baja</option><option value="VACACIONES">Vacaciones</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Usuario vinculado (opcional)</label>
                    <select
                      value={editingEmp.userId ?? ""}
                      onChange={(e) => setEditingEmp((p) => ({ ...p, userId: e.target.value }))}
                      className={inp}
                    >
                      <option value="">— Sin vincular —</option>
                      {systemUsers
                        .filter((u) => u.id === editingEmp.userId || !employees.some((e) => e.userId === u.id && e.id !== (editingEmp as any).id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>{u.name ? `${u.name} (${u.email})` : u.email}</option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Solo necesario si esta persona debe iniciar sesión en el sistema (portal empleado, checador, etc.). Los usuarios ya vinculados a otro empleado no aparecen en la lista.</p>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3 — Nómina (Parte 3) */}
              {modalTab === 'nomina' && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Salario Diario (SD) */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Salario Diario (SD)</label>
                    <input type="number" step="0.01" value={editingEmp.salarioDiarioIntegrado ?? 0}
                      onChange={(e) => setEditingEmp((p) => ({ ...p, salarioDiarioIntegrado: parseFloat(e.target.value) || 0 }))}
                      className={inp} />
                  </div>
                  {/* Período de Pago */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Período de Pago</label>
                    <select value={editingEmp.periodoPago ?? "QUINCENAL"}
                      onChange={(e) => setEditingEmp((p) => ({ ...p, periodoPago: e.target.value }))}
                      className={inp}>
                      <option value="QUINCENAL">Quincenal (×15)</option>
                      <option value="CATORCENAL">Catorcenal (×14)</option>
                      <option value="SEMANAL">Semanal (×7)</option>
                    </select>
                  </div>
                  {/* Salario estimado — solo lectura */}
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Salario estimado por período</label>
                    <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(123,156,204,0.06)', border: '1px solid rgba(123,156,204,0.15)', fontSize: 14, fontWeight: 600, color: '#7b9ccc' }}>
                      ${salarioEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
                        {sdModal} × {periodoModal === 'SEMANAL' ? 7 : periodoModal === 'CATORCENAL' ? 14 : 15} días
                      </span>
                    </div>
                  </div>
                  {/* Deducciones */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Deducciones</label>
                    <input type="number" value={editingEmp.deducciones ?? 0}
                      onChange={(e) => setEditingEmp((p) => ({ ...p, deducciones: parseFloat(e.target.value) || 0 }))}
                      className={inp} />
                  </div>
                  {/* Banco */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Banco</label>
                    <input value={editingEmp.banco ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, banco: e.target.value }))} className={inp} />
                  </div>
                  {/* CLABE */}
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">CLABE (18 dígitos)</label>
                    <input value={editingEmp.clabe ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, clabe: e.target.value.replace(/\D/g, "").slice(0, 18) }))} className={`${inp} font-mono`} />
                  </div>
                  {/* No. IMSS */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">No. IMSS</label>
                    <input value={editingEmp.imssNumber ?? ""} onChange={(e) => setEditingEmp((p) => ({ ...p, imssNumber: e.target.value }))} placeholder="Ej: 12345678901" className={`${inp} font-mono`} />
                  </div>
                </div>
              )}

              {/* PESTAÑA 4 — Expediente (solo editar) */}
              {modalTab === 'expediente' && isEdit && (
                <div className="space-y-4">
                  <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: 16 }}>
                    <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Subir documento con análisis OCR</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <select value={ocrTipo} onChange={(e) => setOcrTipo(e.target.value)} style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', color: '#c8cdd8', borderRadius: 6, padding: '7px 10px', fontSize: 12 }}>
                        {TIPOS_DOC.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <label style={{ flex: 1, cursor: ocrLoading ? 'not-allowed' : 'pointer' }}>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => uploadOcrDocument(e, ocrTipo)} className="hidden" disabled={ocrLoading} />
                        <span style={{ display: 'block', borderRadius: 6, border: `1px dashed ${ocrLoading ? 'rgba(255,255,255,0.1)' : 'rgba(123,156,204,0.4)'}`, padding: '7px 14px', textAlign: 'center', fontSize: 12.5, color: ocrLoading ? 'rgba(255,255,255,0.25)' : '#7b9ccc', transition: 'all 0.15s' }}>
                          {ocrLoading ? "Analizando..." : "Seleccionar archivo (PDF, JPG, PNG)"}
                        </span>
                      </label>
                    </div>
                    {(ocrTipo === 'INE' || ocrTipo === 'CURP') && (
                      <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'rgba(180,150,80,0.9)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ flexShrink: 0 }}>⚠</span>
                        Para mejores resultados con el OCR, sube el INE como imagen JPG o PNG. Los PDF escaneados no contienen texto y el análisis puede fallar.
                      </p>
                    )}
                  </div>
                  {docs.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13, padding: '16px 0' }}>Sin documentos en el expediente</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {docs.map((doc) => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', padding: '10px 14px' }}>
                          <div style={{ overflow: 'hidden' }}>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#7b9ccc', marginRight: 8 }}>{doc.tipo}</span>
                            <span style={{ fontSize: 13, color: '#c8cdd8' }}>{doc.nombre || doc.tipo}</span>
                            {doc.ocrConfirmed && <span style={{ marginLeft: 8, fontSize: 11, color: '#4ade80' }}>✓ OCR confirmado</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                            {(doc.fileData || doc.url) && <button onClick={() => openDoc(doc)} style={{ fontSize: 11.5, color: '#7b9ccc', background: 'none', border: 'none', cursor: 'pointer' }}>Ver</button>}
                            <button onClick={() => removeDoc(doc.id)} style={{ fontSize: 11.5, color: 'rgba(252,165,165,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}>Eliminar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.08)", display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEmpModal(false)} style={{ padding: '7px 16px', fontSize: 12.5, borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>Cancelar</button>
              {modalTab !== 'expediente' && (
                <button onClick={saveEmployee} style={{ padding: '7px 20px', fontSize: 12.5, fontWeight: 500, borderRadius: 6, background: '#1e2d45', border: '1px solid rgba(123,156,204,0.3)', color: '#8fafd4', cursor: 'pointer' }}>Guardar</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Panel de confirmación OCR */}
      {ocrPanel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16 }}>
          <div style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#c8cdd8' }}>Datos detectados — revisa y confirma</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Edita los campos si es necesario antes de aplicar al empleado</p>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.keys(ocrFields).length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No se detectaron campos automáticamente en este documento.</p>
              ) : (
                Object.entries(ocrFields).map(([key, val]) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,0.35)', textTransform: 'capitalize', marginBottom: 4 }}>{key}</label>
                    <input value={val} onChange={(e) => setOcrFields((p) => ({ ...p, [key]: e.target.value }))} className={inp} placeholder="No detectado" />
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.08)", display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setOcrPanel(false); setOcrDocumentId(''); setOcrFields({}); }} style={{ padding: '7px 16px', fontSize: 12.5, borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmOcr} style={{ padding: '7px 20px', fontSize: 12.5, fontWeight: 500, borderRadius: 6, background: '#1e2d45', border: '1px solid rgba(123,156,204,0.3)', color: '#8fafd4', cursor: 'pointer' }}>Confirmar y aplicar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1200, background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 8, padding: "10px 20px", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}
    </MainLayout>
  );
}
