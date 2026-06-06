import { useAuthStore } from "../store/useAuthStore";
import CompanySelector from "../components/CompanySelector";

interface Props {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
}

export default function Header({ onMenuClick, onSearchClick }: Props) {
  const { user, logout } = useAuthStore();
  const tenantName = localStorage.getItem("tenant_name") || "Tesorería SaaS";
  const tenantLogo = localStorage.getItem("tenant_logo_url") || "";
  const sidebarColor = localStorage.getItem("tenant_sidebar_color") || "";

  function handleLogout() {
    logout();
    window.location.href = "/";
  }

  return (
    <header className="h-12 border-b flex items-center justify-between px-4 md:px-6" style={{ backgroundColor: '#101010', borderColor: '#2D2D2D' }}>
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-white"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#222222'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {tenantLogo ? <img src={tenantLogo} alt="Tenant logo" className="h-6 w-6 rounded object-cover" /> : null}
        <h1 className="text-sm font-semibold" style={{ color: '#F5F5F5' }}>{tenantName}</h1>
      </div>

      <div className="flex items-center gap-4">
        <CompanySelector />
        <button
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ backgroundColor: '#161616', color: '#9A9A9A', border: '1px solid #2D2D2D' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1B1B1B'; e.currentTarget.style.color = '#F5F5F5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#161616'; e.currentTarget.style.color = '#9A9A9A'; }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Buscar</span>
          <kbd className="px-1.5 py-0.5 text-xs" style={{ backgroundColor: '#222222', color: '#7E7E7E' }}>Ctrl+K</kbd>
        </button>

        <div className="text-right hidden sm:block">
          <div className="text-sm" style={{ color: '#F5F5F5' }}>
            {user?.name || "Administrador"}
          </div>
          <div className="text-xs" style={{ color: '#9A9A9A' }}>
            {user?.email || ""}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
          style={{ backgroundColor: 'transparent', color: '#9B3A3A', border: '1px solid #9B3A3A' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#9B3A3A'; e.currentTarget.style.color = '#F5F5F5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9B3A3A'; }}
        >
          Salir
        </button>
      </div>
    </header>
  );
}