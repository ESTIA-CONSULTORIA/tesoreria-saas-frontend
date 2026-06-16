import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EmployeeLayout from "./EmployeeLayout";
import { api } from "../../core/api/api";

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

  const token = localStorage.getItem("employee_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) { navigate("/employee"); return; }
    api.get("/hr/portal/me", { headers })
      .then((res) => setEmployee(res.data))
      .catch(() => { navigate("/employee"); })
      .finally(() => setLoading(false));
  }, []);

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
        {/* Perfil */}
        <div className="rounded-xl p-5 border" style={{ backgroundColor: "#161616", borderColor: "#2D2D2D" }}>
          <h2 className="font-semibold mb-3">Mi perfil</h2>
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
