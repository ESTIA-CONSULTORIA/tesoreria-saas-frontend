import { useLocation, useNavigate } from "react-router-dom";
import { PORTAL_CSS } from "./portalPaleta";
import { employeeApi } from "../../core/api/employeeApi";

interface Props {
  children: React.ReactNode;
}

const TABS = [
  { label: "Inicio", to: "/employee/home", icon: "⌂" },
  { label: "Asistencia", to: "/employee/attendance", icon: "◷" },
  { label: "Recibos", to: "/employee/receipts", icon: "▤" },
  { label: "Solicitudes", to: "/employee/requests", icon: "◈" },
  { label: "Documentos", to: "/employee/documents", icon: "◻" },
  { label: "Perfil", to: "/employee/profile", icon: "◯" },
];

// Portal del empleado: barra superior con el logo ESTIA y, en pantallas anchas (laptop 1366x768), la navegación en la misma barra;
// en móvil la navegación pasa abajo. El contenido es lo único que se desplaza.

export default function EmployeeLayout({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  async function logout() {
    // La sesión vive en una cookie httpOnly: solo el servidor puede invalidarla, por eso el await va antes de navegar.
    await employeeApi.post("/auth/logout").catch(() => {});
    sessionStorage.removeItem("employee_user");
    navigate("/employee");
  }

  return (
    <div className="pe-root">
      <style>{PORTAL_CSS}</style>
      <header className="pe-top">
        <img src="/logo-estia-erp.png" alt="ESTIA" />
        <span className="pe-title">Portal del empleado</span>
        <nav className="pe-nav" aria-label="Secciones del portal" data-portal-nav="">
          {TABS.map((t) => (
            <button key={t.to} className="pe-tab" aria-current={location.pathname === t.to ? "page" : undefined} onClick={() => navigate(t.to)}>
              <span aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <button className="pe-out" onClick={logout}>Salir</button>
      </header>
      <main className="pe-main">
        <div className="pe-wrap">{children}</div>
      </main>
    </div>
  );
}
