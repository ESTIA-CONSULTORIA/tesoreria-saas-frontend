import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EmployeeLayout from "./EmployeeLayout";
import { employeeApi } from "../../core/api/employeeApi";

interface Employee {
  id: string;
  nombre: string;
  apellidos?: string;
  puesto?: string;
  departamento?: string;
  email?: string;
  whatsapp?: string;
  salarioQuincenal?: number;
  fechaIngreso?: string;
  status?: string;
  curp?: string;
  rfc?: string;
  nss?: string;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid #141414" }}>
      <div style={{ color: "#383838", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: "#D0D0D0", fontSize: "0.92rem" }}>{String(value)}</div>
    </div>
  );
}

export default function EmployeeProfile() {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    employeeApi
      .get("/hr/portal/me")
      .then((res) => setEmployee(res.data))
      .catch(() => navigate("/employee"))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    // Auditoría de seguridad (GoodsHabits, cookies httpOnly, Pendiente 3): antes solo
    // limpiaba sessionStorage — el Portal comparte cookie (access_token/refresh_token) con
    // el ERP normal (a propósito, ver auth.service.ts::portalLogin()), y solo el servidor
    // puede invalidarla. Sin este POST, la cookie httpOnly seguía viva y un GET /auth/me
    // posterior reautenticaba en silencio a alguien que ya "cerró sesión" — grave en un
    // dispositivo compartido (kiosk de empleados). Mismo patrón que
    // useAuthStore.ts::logout(): await obligatorio antes de navegar, si no la navegación
    // puede abortar la conexión antes de que el navegador procese el Set-Cookie de
    // limpieza.
    await employeeApi.post("/auth/logout").catch(() => {});
    sessionStorage.removeItem("employee_user");
    navigate("/employee");
  }

  return (
    <EmployeeLayout>
      <div style={{ padding: "28px 20px 0" }}>
        <h1 style={{ color: "#F5F5F5", fontSize: "1.2rem", fontWeight: 600, marginBottom: 24 }}>Mi Perfil</h1>

        {loading ? (
          <div style={{ color: "#383838", fontSize: "0.8rem", letterSpacing: "0.1em", textAlign: "center", padding: "40px 0" }}>
            CARGANDO
          </div>
        ) : !employee ? (
          <div style={{ color: "#383838", fontSize: "0.85rem", textAlign: "center", padding: "40px 0" }}>
            No se encontró perfil de empleado vinculado.
          </div>
        ) : (
          <>
            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "#1A1A1A",
                  border: "1px solid #2A2A2A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#505050",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {employee.nombre[0].toUpperCase()}
              </div>
              <div>
                <div style={{ color: "#F5F5F5", fontSize: "1.1rem", fontWeight: 600 }}>
                  {employee.nombre} {employee.apellidos ?? ""}
                </div>
                {employee.puesto && (
                  <div style={{ color: "#505050", fontSize: "0.8rem", marginTop: 2 }}>{employee.puesto}</div>
                )}
              </div>
            </div>

            {/* Fields */}
            <div
              style={{
                background: "#0E0E0E",
                border: "1px solid #1C1C1C",
                borderRadius: 16,
                padding: "4px 18px",
                marginBottom: 16,
              }}
            >
              <Field label="Departamento" value={employee.departamento} />
              <Field label="Correo" value={employee.email} />
              <Field label="WhatsApp" value={employee.whatsapp} />
              <Field label="Fecha de ingreso" value={employee.fechaIngreso ? new Date(employee.fechaIngreso).toLocaleDateString("es-MX") : null} />
              <Field label="Salario quincenal" value={employee.salarioQuincenal ? `$${Number(employee.salarioQuincenal).toLocaleString("es-MX")}` : null} />
              <Field label="Estatus" value={employee.status ?? "ACTIVO"} />
              <Field label="CURP" value={employee.curp} />
              <Field label="RFC" value={employee.rfc} />
              <Field label="NSS" value={employee.nss} />
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              style={{
                width: "100%",
                padding: "15px",
                background: "#EF4444",
                border: "none",
                borderRadius: 12,
                color: "#FFFFFF",
                fontSize: "0.9rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              Cerrar Sesión
            </button>
          </>
        )}
      </div>
    </EmployeeLayout>
  );
}
