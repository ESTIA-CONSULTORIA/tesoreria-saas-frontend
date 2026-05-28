import { useAuthStore } from "../store/useAuthStore";

export default function Header() {
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    window.location.href = "/";
  }

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-bold text-white">
          Tesorería SaaS
        </h1>
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