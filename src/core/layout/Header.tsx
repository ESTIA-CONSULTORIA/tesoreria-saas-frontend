import { useAuthStore } from "../store/useAuthStore";

export default function Header() {
  const { user, logout } = useAuthStore();
  const tenantName = localStorage.getItem("tenant_name") || "Tesorería SaaS";
  const tenantLogo = localStorage.getItem("tenant_logo_url") || "";
  const sidebarColor = localStorage.getItem("tenant_sidebar_color") || "";

  function handleLogout() {
    logout();
    window.location.href = "/";
  }

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6" style={sidebarColor ? { backgroundColor: sidebarColor } : undefined}>
      <div className="flex items-center gap-3">
        {tenantLogo ? <img src={tenantLogo} alt="Tenant logo" className="h-8 w-8 rounded object-cover" /> : null}
        <h1 className="text-lg font-bold text-white">{tenantName}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
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