import { Link, useLocation } from "react-router-dom";
import Header from "./Header";
import { theme } from "../theme/theme";
import { useModulo } from "../hooks/useModulo";

interface Props {
  children: React.ReactNode;
}

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: "📊", modulo: "dashboard" },
  { label: "Empresas", to: "/companies", icon: "🏢", modulo: "empresas" },
  { label: "Sucursales", to: "/branches", icon: "🏪", modulo: "sucursales" },
  { label: "Usuarios y Roles", to: "/users", icon: "👤", modulo: "usuarios" },
  { label: "Bancos", to: "/banks", icon: "🏦", modulo: "bancos" },
  { label: "Movimientos", to: "/movements", icon: "🧾", modulo: "movimientos" },
  { label: "Transferencias", to: "/transfers", icon: "🔁", modulo: "transferencias" },
  { label: "Reportes", to: "/reports", icon: "📑", modulo: "reportes" },
  { label: "Tesorería", to: "/treasury", icon: "💰", modulo: "tesoreria" },
  { label: "Conciliación", to: "/reconciliation", icon: "📋", modulo: "conciliacion" },
  { label: "Administración", to: "/administration", icon: "🔐", adminOnly: true, modulo: "administracion" },
  { label: "Configuración", to: "/settings", icon: "⚙️", modulo: "configuracion" },
  { label: "Configuración POS", to: "/pos-config", icon: "🖥️", modulo: "configuracion-pos" },
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
              const moduloActivo = useModulo(item.modulo);

              if (!moduloActivo) return null;

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