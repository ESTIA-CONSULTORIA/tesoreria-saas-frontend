import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  type: "movement" | "supplier" | "account" | "page";
  title: string;
  subtitle?: string;
  path?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const pages: SearchResult[] = [
  { id: "dashboard", type: "page", title: "Dashboard", path: "/dashboard" },
  { id: "movements", type: "page", title: "Movimientos", path: "/movements" },
  { id: "transfers", type: "page", title: "Transferencias", path: "/transfers" },
  { id: "reconciliation", type: "page", title: "Conciliación", path: "/reconciliation" },
  { id: "purchases", type: "page", title: "Compras", path: "/purchases" },
  { id: "suppliers", type: "page", title: "Proveedores", path: "/suppliers" },
  { id: "banks", type: "page", title: "Cuentas Bancarias", path: "/banks" },
  { id: "companies", type: "page", title: "Empresas", path: "/companies" },
  { id: "branches", type: "page", title: "Sucursales", path: "/branches" },
  { id: "costs", type: "page", title: "Costos", path: "/costs" },
  { id: "reports", type: "page", title: "Reportes", path: "/reports" },
  { id: "users", type: "page", title: "Usuarios", path: "/users" },
  { id: "administration", type: "page", title: "Administración", path: "/administration" },
];

export default function GlobalSearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!query) {
      setResults(pages);
      setSelectedIndex(0);
      return;
    }

    const filtered = pages.filter((page) =>
      page.title.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      const selected = results[selectedIndex];
      if (selected.path) {
        navigate(selected.path);
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header - flex-shrink-0 */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar páginas, movimientos, proveedores..."
              className="flex-1 bg-transparent text-2xl text-white outline-none placeholder-slate-500"
              autoFocus
            />
            <kbd className="px-2 py-1 text-xs text-slate-400 bg-slate-800 rounded">ESC</kbd>
          </div>
        </div>

        {/* Body - flex-1 overflow-y-auto */}
        <div className="flex-1 overflow-y-auto p-4">
          {results.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No se encontraron resultados</p>
          ) : (
            <div className="space-y-1">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => {
                    if (result.path) {
                      navigate(result.path);
                      onClose();
                    }
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    index === selectedIndex
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-white hover:bg-slate-700"
                  }`}
                >
                  <div className="font-medium">{result.title}</div>
                  {result.subtitle && (
                    <div className="text-sm opacity-70">{result.subtitle}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer - flex-shrink-0 */}
        <div className="flex-shrink-0 p-4 border-t border-slate-800 text-center text-xs text-slate-500">
          <span className="mr-4">↑↓ para navegar</span>
          <span className="mr-4">Enter para seleccionar</span>
          <span>ESC para cerrar</span>
        </div>
      </div>
    </div>
  );
}
