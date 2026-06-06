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
  { label: "Dashboard", to: "/dashboard", icon: "📊", modulo: "dashboard", shortcut: "Alt+1", category: "OPERACIÓN" },
  { label: "Empresas", to: "/companies", icon: "🏢", modulo: "empresas", category: "OPERACIÓN" },
  { label: "Sucursales", to: "/branches", icon: "🏪", modulo: "sucursales", category: "OPERACIÓN" },
  { label: "Bancos", to: "/banks", icon: "🏦", modulo: "bancos", category: "TESORERÍA" },
  { label: "Movimientos", to: "/movements", icon: "🧾", modulo: "movimientos", shortcut: "Alt+2", category: "TESORERÍA" },
  { label: "Transferencias", to: "/transfers", icon: "🔁", modulo: "transferencias", shortcut: "Alt+3", category: "TESORERÍA" },
  { label: "Tesorería", to: "/treasury", icon: "💰", modulo: "tesoreria", category: "TESORERÍA" },
  { label: "Conciliación", to: "/reconciliation", icon: "📋", modulo: "conciliacion", category: "TESORERÍA" },
  { label: "Proveedores", to: "/suppliers", icon: "📦", modulo: "proveedores", category: "COMPRAS" },
  { label: "Compras", to: "/purchases", icon: "🛒", modulo: "compras", category: "COMPRAS" },
  { label: "Costos", to: "/costs", icon: "🏭", modulo: "costos", category: "COMPRAS" },
  { label: "Reportes", to: "/reports", icon: "📑", modulo: "reportes", shortcut: "Alt+4", category: "ANÁLISIS" },
  { label: "POS", to: "/pos", icon: "🖥️", modulo: "pos", category: "ANÁLISIS" },
  { label: "Configuración", to: "/settings", icon: "⚙️", modulo: "configuracion", category: "CONTROL" },
  { label: "Config. Login", to: "/settings/login-config", icon: "🔐", modulo: "configuracion", category: "CONTROL" },
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
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A', color: '#F5F5F5' }}>
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
          className={`fixed lg:static z-50 lg:z-auto w-[220px] min-h-[calc(100vh-48px)] border-r flex-col py-4 transition-transform duration-300
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            ${sidebarOpen ? "flex" : "hidden lg:flex"}`}
          style={{ backgroundColor: '#101010', borderColor: '#2D2D2D' }}
        >
          {/* Logo del cliente */}
          <div className="px-4 pb-4 border-b" style={{ borderColor: '#2D2D2D' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#F5F5F5' }}>
              {localStorage.getItem("tenant_name") || "Tesorería SaaS"}
            </h2>
          </div>

          <nav className="flex flex-col gap-0 px-2 flex-1 overflow-y-auto">
            {isSoporte ? (
              // Navegación para SOPORTE
              <>
                <div className="px-3 py-2 text-xs font-semibold" style={{ color: '#7E7E7E', letterSpacing: '0.08em' }}>
                  PANEL DE SOPORTE
                </div>
                {soporteNavItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors"
                      style={{
                        color: isActive ? '#F5F5F5' : '#9A9A9A',
                        borderLeft: isActive ? '2px solid #BDBDBD' : '2px solid transparent',
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = '#222222'; e.currentTarget.style.color = '#F5F5F5'; } }}
                      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9A9A9A'; } }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <div className="mt-4 px-3 py-2 text-xs font-semibold border-t" style={{ color: '#7E7E7E', letterSpacing: '0.08em', borderColor: '#2D2D2D' }}>
                  MÓDULOS DEL SISTEMA
                </div>
                {navItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-sm font-medium transition-colors"
                      style={{
                        color: isActive ? '#F5F5F5' : '#9A9A9A',
                        borderLeft: isActive ? '2px solid #BDBDBD' : '2px solid transparent',
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = '#222222'; e.currentTarget.style.color = '#F5F5F5'; } }}
                      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9A9A9A'; } }}
                    >
                      <div className="flex items-center gap-3">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {item.shortcut && (
                        <kbd className="text-xs px-1.5 py-0.5" style={{ backgroundColor: '#222222', color: '#7E7E7E' }}>{item.shortcut}</kbd>
                      )}
                    </Link>
                  );
                })}
              </>
            ) : (
              // Navegación para CLIENTE (ADMIN) - Agrupada por categorías
              (() => {
                const categories = ['OPERACIÓN', 'TESORERÍA', 'COMPRAS', 'ANÁLISIS', 'CONTROL'] as const;
                return categories.map((category) => {
                  const categoryItems = navItems.filter((item) => item.category === category);
                  if (categoryItems.length === 0) return null;

                  return (
                    <div key={category}>
                      <div className="px-3 py-2 text-xs font-semibold" style={{ color: '#7E7E7E', letterSpacing: '0.08em' }}>
                        {category}
                      </div>
                      {categoryItems.map((item) => {
                        const isActive = location.pathname === item.to;
                        const moduloActivo = useModulo(item.modulo);

                        if (!moduloActivo) return null;

                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setSidebarOpen(false)}
                            className="flex items-center justify-between px-3 py-2 text-sm font-medium transition-colors"
                            style={{
                              color: isActive ? '#F5F5F5' : '#9A9A9A',
                              borderLeft: isActive ? '2px solid #BDBDBD' : '2px solid transparent',
                              backgroundColor: 'transparent',
                            }}
                            onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = '#222222'; e.currentTarget.style.color = '#F5F5F5'; } }}
                            onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9A9A9A'; } }}
                          >
                            <div className="flex items-center gap-3">
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                            </div>
                            {item.shortcut && (
                              <kbd className="text-xs px-1.5 py-0.5" style={{ backgroundColor: '#222222', color: '#7E7E7E' }}>{item.shortcut}</kbd>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  );
                });
              })()
            )}
          </nav>

          {/* Footer del sidebar */}
          <div className="px-4 py-3 border-t mt-auto" style={{ borderColor: '#2D2D2D' }}>
            <p className="text-xs" style={{ color: '#7E7E7E' }}>
              powered by ESTIA
            </p>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto w-full" style={{ backgroundColor: '#0A0A0A', padding: '24px' }}>
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}