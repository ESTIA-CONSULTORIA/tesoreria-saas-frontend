import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
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
  { label: "Proveedores", to: "/suppliers", icon: "🚚", modulo: "proveedores" },
  { label: "Compras", to: "/purchases", icon: "🛒", modulo: "compras" },
  { label: "Costos y Producción", to: "/costs", icon: "🏭", modulo: "costos" },
  { label: "Reportes", to: "/reports", icon: "📑", modulo: "reportes" },
  { label: "Tesorería", to: "/treasury", icon: "💰", modulo: "tesoreria" },
  { label: "Conciliación", to: "/reconciliation", icon: "📋", modulo: "conciliacion" },
  { label: "Administración", to: "/administration", icon: "🔐", adminOnly: true, modulo: "administracion" },
  { label: "Configuración", to: "/settings", icon: "⚙️", modulo: "configuracion" },
  { label: "Configuración POS", to: "/pos-config", icon: "🖥️", modulo: "configuracion-pos" },
];

export default function MainLayout({ children }: Props) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const primaryColor = localStorage.getItem("tenant_primary_color") || "";
  const sidebarColor = localStorage.getItem("tenant_sidebar_color") || "";

  return (
    <div className={`min-h-screen ${theme.colors.background} ${theme.colors.text}`}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex relative">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static z-50 lg:z-auto w-64 min-h-[calc(100vh-64px)] border-r ${theme.colors.border} ${theme.colors.surface} flex-col py-2 transition-transform duration-300
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            ${sidebarOpen ? "flex" : "hidden lg:flex"}`}
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
                  onClick={() => setSidebarOpen(false)}
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
        <main className="flex-1 p-4 md:p-6 overflow-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}