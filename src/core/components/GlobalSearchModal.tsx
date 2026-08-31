import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/api";
import { useAuthStore } from "../store/useAuthStore";

interface SearchResult {
  id: string;
  type: "movement" | "supplier" | "account" | "company" | "page";
  title: string;
  subtitle?: string;
  path?: string;
  icon?: string;
  // Auditoría de seguridad (Hallazgo 1b, GoodsHabits): páginas gateadas por rol (no por
  // módulo) en el frontend — ver RoleRoute.tsx. Sin esto, este buscador las mostraba a
  // cualquiera aunque el acceso directo a la ruta ya estuviera bloqueado por rol.
  roles?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const pages: SearchResult[] = [
  { id: "dashboard", type: "page", title: "Dashboard", path: "/dashboard", icon: "📊" },
  { id: "movements", type: "page", title: "Movimientos", path: "/movements", icon: "🧾" },
  { id: "transfers", type: "page", title: "Traslado de Fondos", path: "/transfers", icon: "🔁" },
  { id: "reconciliation", type: "page", title: "Conciliación", path: "/reconciliation", icon: "📋" },
  { id: "purchases", type: "page", title: "Compras", path: "/purchases", icon: "🛒" },
  { id: "suppliers", type: "page", title: "Proveedores", path: "/suppliers", icon: "🚚" },
  { id: "banks", type: "page", title: "Cuentas Bancarias", path: "/banks", icon: "🏦" },
  { id: "companies", type: "page", title: "Empresas", path: "/companies", icon: "🏢" },
  { id: "branches", type: "page", title: "Sucursales", path: "/branches", icon: "🏪" },
  { id: "costs", type: "page", title: "Costos", path: "/costs", icon: "🏭" },
  { id: "reports", type: "page", title: "Reportes", path: "/reports", icon: "📑" },
  { id: "users", type: "page", title: "Usuarios", path: "/users", icon: "👤" },
  { id: "administration", type: "page", title: "Administración", path: "/administration", icon: "🔐", roles: ["SOPORTE"] },
];

const typeIcons: Record<string, string> = {
  movement: "🧾",
  supplier: "🚚",
  account: "🏦",
  company: "🏢",
  page: "📄",
};

const typeLabels: Record<string, string> = {
  movement: "Movimientos",
  supplier: "Proveedores",
  account: "Cuentas",
  company: "Empresas",
  page: "Páginas",
};

export default function GlobalSearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const roleCode = useAuthStore((state) => state.user?.roleCode);
  // Mismo criterio que RoleRoute: una página con `roles` solo aparece en el buscador si el
  // rol del usuario está en esa lista — evita que "Administración" (o cualquier página
  // gateada por rol a futuro) aparezca como resultado para quien no puede entrar.
  const visiblePages = useMemo(
    () => pages.filter((page) => !page.roles || (!!roleCode && page.roles.includes(roleCode))),
    [roleCode],
  );

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const searchAPI = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(visiblePages);
      setSelectedIndex(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [movementsRes, suppliersRes, accountsRes, companiesRes] = await Promise.all([
        api.get(`/movements?search=${searchQuery}&limit=5`).catch(() => ({ data: [] })),
        api.get(`/suppliers?search=${searchQuery}&limit=5`).catch(() => ({ data: [] })),
        api.get(`/accounts?search=${searchQuery}&limit=5`).catch(() => ({ data: [] })),
        api.get(`/companies?search=${searchQuery}&limit=5`).catch(() => ({ data: [] })),
      ]);

      const movementResults: SearchResult[] = (movementsRes.data || []).map((m: any) => ({
        id: `movement-${m.id}`,
        type: "movement",
        title: m.description || "Movimiento",
        subtitle: `$${m.amount?.toFixed(2) || '0.00'}`,
        icon: typeIcons.movement,
      }));

      const supplierResults: SearchResult[] = (suppliersRes.data || []).map((s: any) => ({
        id: `supplier-${s.id}`,
        type: "supplier",
        title: s.name || "Proveedor",
        subtitle: s.email || "",
        icon: typeIcons.supplier,
      }));

      const accountResults: SearchResult[] = (accountsRes.data || []).map((a: any) => ({
        id: `account-${a.id}`,
        type: "account",
        title: a.name || "Cuenta",
        subtitle: a.accountNumber || "",
        icon: typeIcons.account,
      }));

      const companyResults: SearchResult[] = (companiesRes.data || []).map((c: any) => ({
        id: `company-${c.id}`,
        type: "company",
        title: c.tradeName || c.legalName || "Empresa",
        subtitle: c.taxId || "",
        icon: typeIcons.company,
      }));

      const pageResults = visiblePages.filter((page) =>
        page.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

      const allResults = [
        ...movementResults,
        ...supplierResults,
        ...accountResults,
        ...companyResults,
        ...pageResults,
      ];

      setResults(allResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error("Error searching:", error);
      setResults(visiblePages.filter((page) =>
        page.title.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } finally {
      setLoading(false);
    }
  }, [visiblePages]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAPI(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchAPI]);

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

  if (!open) {
    return (
      <div className="fixed inset-0 pointer-events-none" />
    );
  }

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

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
          {loading ? (
            <p className="text-center text-slate-400 py-8">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No se encontraron resultados</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedResults).map(([type, typeResults]) => (
                <div key={type}>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {typeLabels[type] || type}
                  </div>
                  <div className="space-y-1">
                    {typeResults.map((result) => {
                      const globalIndex = results.indexOf(result);
                      return (
                        <button
                          key={result.id}
                          onClick={() => {
                            if (result.path) {
                              navigate(result.path);
                              onClose();
                            }
                          }}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                            globalIndex === selectedIndex
                              ? "bg-blue-600 text-white"
                              : "bg-slate-800 text-white hover:bg-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{result.icon || typeIcons[result.type]}</span>
                            <div className="flex-1">
                              <div className="font-medium">{result.title}</div>
                              {result.subtitle && (
                                <div className="text-sm opacity-70">{result.subtitle}</div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
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
