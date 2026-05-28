import { Link, useLocation } from "react-router-dom";
import Header from "./Header";
import { theme } from "../theme/theme";

interface Props {
  children: React.ReactNode;
}

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: "📊" },
  { label: "Empresas", to: "/companies", icon: "🏢" },
  { label: "Sucursales", to: "/branches", icon: "🏪" },
  { label: "Usuarios", to: "/users", icon: "👤" },
  { label: "Roles", to: "/roles", icon: "🛡️" },
  { label: "Bancos", to: "/banks", icon: "🏦" },
  { label: "Movimientos", to: "/movements", icon: "🧾" },
  { label: "Transferencias", to: "/transfers", icon: "🔁" },
  { label: "Reportes", to: "/reports", icon: "📑" },
  { label: "Tesorería", to: "/treasury", icon: "💰" },
  { label: "Configuración", to: "/settings", icon: "⚙️" },
];

export default function MainLayout({ children }: Props) {
  const location = useLocation();
  const primaryColor = localStorage.getItem("tenant_primary_color") || "";
  const sidebarColor = localStorage.getItem("tenant_sidebar_color") || "";

  return (
    <div className={`min-h-screen ${theme.colors.background} ${theme.colors.text}`}>
      <Header />

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`hidden md:flex ${theme.sidebar.width} min-h-[calc(100vh-64px)] border-r ${theme.colors.border} ${theme.colors.surface} flex-col py-2`}
          style={sidebarColor ? { backgroundColor: sidebarColor } : undefined}
        >
          <nav className="flex flex-col gap-1 px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive
                        ? `${theme.colors.text}`
                        : `${theme.colors.textMuted} ${theme.colors.surfaceHover}`
                    }`}
                  style={isActive && primaryColor ? { backgroundColor: primaryColor } : undefined}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer del sidebar */}
          <div className={`mt-auto px-4 py-4 border-t ${theme.colors.border}`}>
            <p className={`text-xs ${theme.colors.textMuted}`}>
              {theme.appName}
            </p>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}