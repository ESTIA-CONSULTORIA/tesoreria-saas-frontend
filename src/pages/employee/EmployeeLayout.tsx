import { useLocation, useNavigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
}

const TABS = [
  { label: "INICIO", to: "/employee/home", icon: "⌂" },
  { label: "SOLICITUDES", to: "/employee/requests", icon: "◈" },
  { label: "DOCUMENTOS", to: "/employee/documents", icon: "◻" },
  { label: "PERFIL", to: "/employee/profile", icon: "◯" },
];

export default function EmployeeLayout({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  function logout() {
    sessionStorage.removeItem("employee_token");
    sessionStorage.removeItem("employee_user");
    navigate("/employee");
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        maxWidth: 430,
        margin: "0 auto",
        background: "linear-gradient(160deg, #0A0A0A 0%, #111111 50%, #0D0D0D 100%)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Scrollable content area */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 76 }}>
        {children}
      </div>

      {/* Bottom Navigation */}
      <nav
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 72,
          background: "#080808",
          borderTop: "1px solid #1C1C1C",
          display: "flex",
          alignItems: "center",
        }}
      >
        {TABS.map((tab) => {
          const active = location.pathname === tab.to;
          return (
            <button
              key={tab.to}
              onClick={() => navigate(tab.to)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                height: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: active ? "#FFFFFF" : "#505050",
                transition: "color 0.15s",
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
              <span
                style={{
                  fontSize: "0.55rem",
                  letterSpacing: "0.2em",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
