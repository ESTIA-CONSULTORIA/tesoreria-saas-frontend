import { Link, useLocation, useNavigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  employee?: { nombre?: string; puesto?: string } | null;
}

export default function EmployeeLayout({ children, employee }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  function logout() {
    sessionStorage.removeItem("employee_token");
    sessionStorage.removeItem("employee_user");
    navigate("/employee");
  }

  const navItems = [
    { label: "Inicio", to: "/employee/home" },
    { label: "Mis Solicitudes", to: "/employee/requests" },
    { label: "Mis Documentos", to: "/employee/documents" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0A0A0A", color: "#F5F5F5" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ backgroundColor: "#101010", borderColor: "#2D2D2D" }}
      >
        <div>
          <span className="font-semibold text-sm">Portal del Empleado</span>
          {employee?.nombre && (
            <span className="text-xs ml-2" style={{ color: "#9A9A9A" }}>
              — {employee.nombre}
            </span>
          )}
        </div>
        <button onClick={logout} className="text-xs px-3 py-1.5 rounded" style={{ backgroundColor: "#1A1A1A", color: "#9A9A9A" }}>
          Salir
        </button>
      </header>

      {/* Nav */}
      <nav className="flex gap-1 px-4 py-2 border-b" style={{ borderColor: "#2D2D2D" }}>
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="text-xs px-3 py-1.5 rounded"
              style={{
                backgroundColor: active ? "#2D2D2D" : "transparent",
                color: active ? "#F5F5F5" : "#9A9A9A",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="p-4">{children}</main>
    </div>
  );
}
