import { useAuthStore } from "../store/useAuthStore";

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
    <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 md:px-6" style={sidebarColor ? { backgroundColor: sidebarColor } : undefined}>
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {tenantLogo ? <img src={tenantLogo} alt="Tenant logo" className="h-8 w-8 rounded object-cover" /> : null}
        <h1 className="text-lg font-bold text-white">{tenantName}</h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm">Buscar</span>
          <kbd className="px-1.5 py-0.5 text-xs bg-slate-700 rounded">Ctrl+K</kbd>
        </button>

        <div className="text-right hidden sm:block">
          <div className="text-sm text-white">
            {user?.name || "Administrador"}
          </div>

          <div className="text-xs text-slate-400">
            {user?.email || ""}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Salir
        </button>
      </div>
    </header>
  );
}