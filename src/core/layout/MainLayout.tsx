import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import Header from "./Header";
import { theme } from "../theme/theme";
import { useModulo } from "../hooks/useModulo";
import { useAuthStore } from "../store/useAuthStore";
import { useBrandingStore } from "../store/useBrandingStore";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import GlobalSearchModal from "../components/GlobalSearchModal";
import CompanySelector from "../components/CompanySelector";

interface Props {
  children: React.ReactNode;
}

const navItems = [
  { label: "Dashboard", to: "/dashboard", modulo: "dashboard", shortcut: "Alt+1", category: "OPERACIÓN" },
  { label: "Empresas", to: "/companies", modulo: "empresas", category: "OPERACIÓN" },
  { label: "Sucursales", to: "/branches", modulo: "sucursales", category: "OPERACIÓN" },
  { label: "Bancos", to: "/banks", modulo: "bancos", category: "TESORERÍA" },
  { label: "Movimientos", to: "/movements", modulo: "movimientos", shortcut: "Alt+2", category: "TESORERÍA" },
  { label: "Transferencias", to: "/transfers", modulo: "transferencias", shortcut: "Alt+3", category: "TESORERÍA" },
  { label: "Tesorería", to: "/treasury", modulo: "tesoreria", category: "TESORERÍA" },
  { label: "Conciliación", to: "/reconciliation", modulo: "conciliacion", category: "TESORERÍA" },
  { label: "Proveedores", to: "/suppliers", modulo: "proveedores", category: "COMPRAS" },
  { label: "Compras", to: "/purchases", modulo: "compras", category: "COMPRAS" },
  { label: "Costos", to: "/costs", modulo: "costos", category: "COMPRAS" },
  { label: "OCR Documentos", to: "/ocr", modulo: "ocr", category: "COMPRAS" },
  { label: "Reportes", to: "/reports", modulo: "reportes", shortcut: "Alt+4", category: "ANÁLISIS" },
  { label: "POS", to: "/pos", modulo: "pos", category: "ANÁLISIS" },
  { label: "Recursos Humanos", to: "/hr", modulo: "rh", category: "RRHH" },
  { label: "Portal Empleado", to: "/employee", modulo: "rh", category: "RRHH" },
  { label: "Integraciones", to: "/integrations", modulo: "integraciones", category: "CONTROL" },
  { label: "Configuración", to: "/settings", modulo: "configuracion", category: "CONTROL" },
  { label: "Config. Login", to: "/settings/login-config", modulo: "configuracion", category: "CONTROL" },
];

const soporteNavItems = [
  { label: "Dashboard Soporte", to: "/soporte/dashboard", modulo: "soporte-dashboard" },
  { label: "Gestión de Clientes", to: "/soporte/clientes", modulo: "soporte-clientes" },
  { label: "Planes y Módulos", to: "/soporte/planes", modulo: "soporte-planes" },
  { label: "Monitoreo", to: "/soporte/monitoreo", modulo: "soporte-monitoreo" },
  { label: "Configuración Global", to: "/soporte/config", modulo: "soporte-config" },
];

export default function MainLayout({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isSoporte = user?.roleCode === "SOPORTE";
  const { systemName, logoUrl, backgroundImage } = useBrandingStore();

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
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      color: '#F5F5F5',
      ...(backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      } : {}),
    }}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex relative overflow-x-hidden min-w-0">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static z-50 lg:z-auto w-[220px] min-h-[calc(100vh-48px)] border-r flex-col py-2 transition-transform duration-300
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            ${sidebarOpen ? "flex" : "hidden lg:flex"}`}
          style={{ backgroundColor: '#101010', borderColor: '#2D2D2D' }}
        >
          {/* Logo del cliente */}
          <div className="px-4 pb-2 border-b" style={{ borderColor: '#2D2D2D' }}>
            {logoUrl ? (
              <img src={logoUrl} alt={systemName} style={{ height: '28px', maxWidth: '160px', objectFit: 'contain' }} />
            ) : (
              <h2 className="text-xs font-semibold" style={{ color: '#F5F5F5' }}>
                {systemName}
              </h2>
            )}
          </div>

          {/* Selector de Empresa/Sucursal */}
          <div className="px-4 pb-2 border-b" style={{ borderColor: '#2D2D2D' }}>
            <CompanySelector />
          </div>

          <nav className="flex flex-col gap-0 px-2 flex-1 overflow-hidden">
            {isSoporte ? (
              // Navegación para SOPORTE
              <>
                <div className="px-3 py-1 text-xs font-semibold" style={{ color: '#7E7E7E', letterSpacing: '0.08em' }}>
                  PANEL DE SOPORTE
                </div>
                {soporteNavItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className="px-4 py-1 text-xs font-medium transition-colors"
                      style={{
                        color: isActive ? '#F5F5F5' : '#9A9A9A',
                        borderLeft: isActive ? '2px solid #BDBDBD' : '2px solid transparent',
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = '#222222'; e.currentTarget.style.color = '#F5F5F5'; } }}
                      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9A9A9A'; } }}
                    >
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <div className="mt-2 px-3 py-1 text-xs font-semibold border-t" style={{ color: '#7E7E7E', letterSpacing: '0.08em', borderColor: '#2D2D2D' }}>
                  MÓDULOS DEL SISTEMA
                </div>
                {navItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center justify-between px-4 py-1 text-xs font-medium transition-colors"
                      style={{
                        color: isActive ? '#F5F5F5' : '#9A9A9A',
                        borderLeft: isActive ? '2px solid #BDBDBD' : '2px solid transparent',
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = '#222222'; e.currentTarget.style.color = '#F5F5F5'; } }}
                      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9A9A9A'; } }}
                    >
                      <span>{item.label}</span>
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
                const categories = ['OPERACIÓN', 'TESORERÍA', 'COMPRAS', 'ANÁLISIS', 'RRHH', 'CONTROL'] as const;
                return categories.map((category) => {
                  const categoryItems = navItems.filter((item) => item.category === category);
                  if (categoryItems.length === 0) return null;

                  return (
                    <div key={category}>
                      <div className="px-3 py-1 text-xs font-semibold" style={{ color: '#7E7E7E', letterSpacing: '0.08em' }}>
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
                            className="flex items-center justify-between px-4 py-1 text-xs font-medium transition-colors"
                            style={{
                              color: isActive ? '#F5F5F5' : '#9A9A9A',
                              borderLeft: isActive ? '2px solid #BDBDBD' : '2px solid transparent',
                              backgroundColor: 'transparent',
                            }}
                            onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = '#222222'; e.currentTarget.style.color = '#F5F5F5'; } }}
                            onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9A9A9A'; } }}
                          >
                            <span>{item.label}</span>
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
          <div className="px-4 py-2 border-t mt-auto" style={{ borderColor: '#2D2D2D' }}>
            <p className="text-xs" style={{ color: '#7E7E7E' }}>
              powered by ESTIA
            </p>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0" style={{ backgroundColor: '#0A0A0A' }}>
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}