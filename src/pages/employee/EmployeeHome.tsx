import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EmployeeLayout from "./EmployeeLayout";
import { employeeApi } from "../../core/api/employeeApi";

interface Employee {
  id: string;
  nombre: string;
  puesto?: string;
  departamento?: string;
  email?: string;
  whatsapp?: string;
  salario?: number;
  fechaIngreso?: string;
  status?: string;
}

export default function EmployeeHome() {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkMsg, setCheckMsg] = useState("");

  const token = sessionStorage.getItem("employee_token");

  useEffect(() => {
    if (!token) { navigate("/employee"); return; }
    employeeApi.get("/hr/portal/me")
      .then((res) => setEmployee(res.data))
      .catch(() => { navigate("/employee"); })
      .finally(() => setLoading(false));
  }, []);

  async function handleCheckin() {
    setCheckingIn(true);
    setCheckMsg("");
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      await employeeApi.post("/hr/attendance/check-in", {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        method: "GPS",
      });
      setCheckMsg("✓ Entrada registrada correctamente");
    } catch (err: any) {
      if (err.code === 1) {
        setCheckMsg("Sin acceso a ubicación — registrando sin GPS...");
        try {
          await employeeApi.post("/hr/attendance/check-in", { method: "MANUAL" });
          setCheckMsg("✓ Entrada registrada (sin GPS)");
        } catch (e2: any) {
          setCheckMsg(e2?.response?.data?.message || "Error al registrar entrada");
        }
      } else {
        setCheckMsg(err?.response?.data?.message || "Error al registrar entrada");
      }
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckout() {
    setCheckingIn(true);
    setCheckMsg("");
    try {
      await employeeApi.post("/hr/attendance/check-out", {});
      setCheckMsg("✓ Salida registrada correctamente");
    } catch (err: any) {
      setCheckMsg(err?.response?.data?.message || "Error al registrar salida");
    } finally {
      setCheckingIn(false);
    }
  }

  if (loading) {
    return (
      <EmployeeLayout>
        <p className="text-sm" style={{ color: "#9A9A9A" }}>Cargando...</p>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout employee={employee}>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Checada */}
        <div className="rounded-xl p-5 border" style={{ backgroundColor: "#161616", borderColor: "#2D2D2D" }}>
          <h2 className="font-semibold mb-3 text-sm">Registrar asistencia</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleCheckin}
              disabled={checkingIn}
              className="text-sm px-4 py-2 rounded font-medium"
              style={{ backgroundColor: "#22C55E22", color: "#22C55E", border: "1px solid #22C55E44" }}
            >
              {checkingIn ? "Registrando..." : "Entrada"}
            </button>
            <button
              onClick={handleCheckout}
              disabled={checkingIn}
              className="text-sm px-4 py-2 rounded font-medium"
              style={{ backgroundColor: "#EF444422", color: "#EF4444", border: "1px solid #EF444444" }}
            >
              {checkingIn ? "Registrando..." : "Salida"}
            </button>
          </div>
          {checkMsg && (
            <p className="text-xs mt-2" style={{ color: checkMsg.startsWith("✓") ? "#22C55E" : "#EF4444" }}>
              {checkMsg}
            </p>
          )}
        </div>

        {/* Perfil */}
        <div className="rounded-xl p-5 border" style={{ backgroundColor: "#161616", borderColor: "#2D2D2D" }}>
          <h2 className="font-semibold mb-3 text-sm">Mi perfil</h2>
          {employee ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs" style={{ color: "#9A9A9A" }}>Nombre</span>
                <p className="font-medium">{employee.nombre}</p>
              </div>
              {employee.puesto && (
                <div>
                  <span className="text-xs" style={{ color: "#9A9A9A" }}>Puesto</span>
                  <p className="font-medium">{employee.puesto}</p>
                </div>
              )}
              {employee.departamento && (
                <div>
                  <span className="text-xs" style={{ color: "#9A9A9A" }}>Departamento</span>
                  <p className="font-medium">{employee.departamento}</p>
                </div>
              )}
              {employee.email && (
                <div>
                  <span className="text-xs" style={{ color: "#9A9A9A" }}>Correo</span>
                  <p className="font-medium">{employee.email}</p>
                </div>
              )}
              {employee.fechaIngreso && (
                <div>
                  <span className="text-xs" style={{ color: "#9A9A9A" }}>Fecha ingreso</span>
                  <p className="font-medium">{new Date(employee.fechaIngreso).toLocaleDateString("es-MX")}</p>
                </div>
              )}
              <div>
                <span className="text-xs" style={{ color: "#9A9A9A" }}>Estatus</span>
                <p className="font-medium">{employee.status ?? "ACTIVO"}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "#9A9A9A" }}>No se encontró perfil de empleado vinculado a tu usuario.</p>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/employee/requests")}
            className="rounded-xl p-4 border text-left"
            style={{ backgroundColor: "#161616", borderColor: "#2D2D2D" }}
          >
            <div className="text-lg mb-1">📋</div>
            <div className="text-sm font-medium">Mis Solicitudes</div>
            <div className="text-xs" style={{ color: "#9A9A9A" }}>Vacaciones y permisos</div>
          </button>
          <button
            onClick={() => navigate("/employee/documents")}
            className="rounded-xl p-4 border text-left"
            style={{ backgroundColor: "#161616", borderColor: "#2D2D2D" }}
          >
            <div className="text-lg mb-1">📁</div>
            <div className="text-sm font-medium">Mis Documentos</div>
            <div className="text-xs" style={{ color: "#9A9A9A" }}>Contratos, constancias</div>
          </button>
        </div>
      </div>
    </EmployeeLayout>
  );
}
