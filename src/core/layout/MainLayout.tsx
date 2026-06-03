import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import Header from "./Header";
import { theme } from "../theme/theme";
import { useModulo } from "../hooks/useModulo";
import { useAuthStore } from "../store/useAuthStore";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import GlobalSearchModal from "../components/GlobalSearchModal";

interface Props {
  children: React.ReactNode;
}

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: "📊", modulo: "dashboard", shortcut: "Alt+1" },
  { label: "Empresas", to: "/companies", icon: "🏢", modulo: "empresas" },
  { label: "Sucursales", to: "/branches", icon: "🏪", modulo: "sucursales" },
  { label: "Usuarios y Roles", to: "/users", icon: "👤", modulo: "usuarios" },
  { label: "Bancos", to: "/banks", icon: "🏦", modulo: "bancos" },
  { label: "Movimientos", to: "/movements", icon: "🧾", modulo: "movimientos", shortcut: "Alt+2" },
  { label: "Transferencias", to: "/transfers", icon: "🔁", modulo: "transferencias", shortcut: "Alt+3" },
  { label: "Proveedores", to: "/suppliers", icon: "🚚", modulo: "proveedores" },
  { label: "Compras", to: "/purchases", icon: "🛒", modulo: "compras" },
  { label: "Costos y Producción", to: "/costs", icon: "🏭", modulo: "costos" },
  { label: "Reportes", to: "/reports", icon: "📑", modulo: "reportes", shortcut: "Alt+4" },
  { label: "Tesorería", to: "/treasury", icon: "💰", modulo: "tesoreria" },
  { label: "Conciliación", to: "/reconciliation", icon: "📋", modulo: "conciliacion" },
  { label: "Administración", to: "/administration", icon: "🔐", adminOnly: true, modulo: "administracion" },
  { label: "Configuración", to: "/settings", icon: "⚙️", modulo: "configuracion" },
  { label: "Configuración POS", to: "/pos-config", icon: "🖥️", modulo: "configuracion-pos" },
];

const soporteNavItems = [
  { label: "Dashboard Soporte", to: "/soporte/dashboard", icon: "📊", modulo: "soporte-dashboard" },
  { label: "Gestión de Clientes", to: "/soporte/clientes", icon: "👥", modulo: "soporte-clientes" },
  { label: "Planes y Módulos", to: "/soporte/planes", icon: "📦", modulo: "soporte-planes" },
  { label: "Monitoreo", to: "/soporte/monitoreo", icon: "📡", modulo: "soporte-monitoreo" },
  { label: "Configuración Global", to: "/soporte/config", icon: "⚙️", modulo: "soporte-config" },
];

export default function MainLayout({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const primaryColor = localStorage.getItem("tenant_primary_color") || "";
  const sidebarColor = localStorage.getItem("tenant_sidebar_color") || "";
  const user = useAuthStore((state) => state.user);
  const isSoporte = user?.roleCode === "SOPORTE";

  // Atajos globales
  useKeyboardShortcuts([
    { key: "k", ctrl: true, action: () => setSearchOpen(true) },
    { key: "Escape", action: () => { if (searchOpen) setSearchOpen(false); } },
    { key: "1", alt: true, action: () => navigate("/dashboard") },
    { key: "2", alt: true, action: () => navigate("/movements") },
    { key: "3", alt: true, action: () => navigate("/transfers") },
    { key: "4", alt: true, action: () => navigate("/reports") },
  ]);

  return (
    <div className={`min-h-screen ${theme.colors.background} ${theme.colors.text}`}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} onSearchClick={() => setSearchOpen(true)} />

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
            {isSoporte ? (
              // Navegación para SOPORTE
              <>
                <div className={`px-3 py-2 text-xs font-semibold ${theme.colors.textMuted}`}>
                  PANEL DE SOPORTE
                </div>
                {soporteNavItems.map((item) => {
                  const isActive = location.pathname === item.to;
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
                <div className={`mt-4 px-3 py-2 text-xs font-semibold ${theme.colors.textMuted} border-t ${theme.colors.border}`}>
                  MÓDULOS DEL SISTEMA
                </div>
                {navItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                        ${
                          isActive
                            ? `${theme.colors.text}`
                            : `${theme.colors.textMuted} ${theme.colors.surfaceHover}`
                        }`}
                      style={isActive && primaryColor ? { backgroundColor: primaryColor } : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {item.shortcut && (
                        <kbd className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">{item.shortcut}</kbd>
                      )}
                    </Link>
                  );
                })}
              </>
            ) : (
              // Navegación para CLIENTE (ADMIN)
              navItems.map((item) => {
                const isActive = location.pathname === item.to;
                const moduloActivo = useModulo(item.modulo);

                if (!moduloActivo) return null;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${
                        isActive
                          ? `${theme.colors.text}`
                          : `${theme.colors.textMuted} ${theme.colors.surfaceHover}`
                      }`}
                    style={isActive && primaryColor ? { backgroundColor: primaryColor } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.shortcut && (
                      <kbd className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">{item.shortcut}</kbd>
                    )}
                  </Link>
                );
              })
            )}
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

      {/* Global Search Modal */}
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}