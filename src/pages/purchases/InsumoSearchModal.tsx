import { useState, useEffect, useRef } from "react";
import { api } from "../../core/api/api";

interface Insumo {
  id: string;
  codigo: string;
  nombre: string;
  presentacion: string;
  unidadMedida: string;
  costoUnitario: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (insumo: Insumo) => void;
}

export default function InsumoSearchModal({ open, onClose, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Insumo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (search.length >= 2) {
        setLoading(true);
        try {
          const response = await api.get("/costs/insumos/search", {
            params: { search, limit: 20 },
          });
          setResults(Array.isArray(response.data) ? response.data : []);
          setSelectedIndex(0);
        } catch (err) {
          setResults([]);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search]);

  useEffect(() => {
    // Scroll selected item into view
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, results.length]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      onSelect(results[selectedIndex]);
      handleClose();
    } else if (e.key === "Escape") {
      handleClose();
    }
  }

  function handleClose() {
    setSearch("");
    setResults([]);
    setSelectedIndex(0);
    onClose();
  }

  function handleSelect(insumo: Insumo) {
    onSelect(insumo);
    handleClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[80vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex-shrink-0 p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar insumo por código, nombre o descripción..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              onClick={handleClose}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
            >
              Cancelar
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Usa ↑↓ para navegar, Enter para seleccionar, Escape para cerrar
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-slate-400 py-8">Buscando...</div>
          ) : search.length < 2 ? (
            <div className="text-center text-slate-400 py-8">
              Escribe al menos 2 caracteres para buscar
            </div>
          ) : results.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              No se encontraron insumos
            </div>
          ) : (
            <div ref={resultsRef} className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2">Código</th>
                    <th className="p-2">Nombre</th>
                    <th className="p-2">Presentación</th>
                    <th className="p-2">Unidad</th>
                    <th className="p-2">Costo Unit.</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((insumo, index) => (
                    <tr
                      key={insumo.id}
                      onClick={() => handleSelect(insumo)}
                      className={`border-t border-slate-800 cursor-pointer transition-colors ${
                        index === selectedIndex
                          ? "bg-blue-900/40 text-white"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      <td className="p-2">{insumo.codigo || "-"}</td>
                      <td className="p-2 font-medium">{insumo.nombre}</td>
                      <td className="p-2">{insumo.presentacion || "-"}</td>
                      <td className="p-2">{insumo.unidadMedida}</td>
                      <td className="p-2">{Number(insumo.costoUnitario).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-3 border-t border-slate-800 text-center text-xs text-slate-500">
          {results.length} resultado{results.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
