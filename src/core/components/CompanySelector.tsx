import { useState, useEffect } from "react";
import { api } from "../api/api";
import { useCompanyStore } from "../store/useCompanyStore";

interface Company {
  id: string;
  legalName: string;
  tradeName: string;
}

interface Branch {
  id: string;
  name: string;
}

export default function CompanySelector() {
  const { activeCompany, activeBranch, setActiveCompany, setActiveBranch } = useCompanyStore();
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      const response = await api.get("/companies");
      setCompanies(Array.isArray(response.data) ? response.data : []);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadBranches(companyId: string) {
    try {
      setLoading(true);
      const response = await api.get(`/branches?companyId=${companyId}`);
      setBranches(Array.isArray(response.data) ? response.data : []);
    } catch {
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }

  function handleCompanyClick(company: Company) {
    setSelectedCompanyId(company.id);
    setActiveCompany({ id: company.id, name: company.tradeName || company.legalName });
    setActiveBranch(null);
    loadBranches(company.id);
  }

  function handleBranchClick(branch: Branch) {
    setActiveBranch({ id: branch.id, name: branch.name });
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
      >
        <span className="text-sm font-medium">
          {activeCompany?.name || "Seleccionar empresa"}
          {activeBranch && ` — ${activeBranch.name}`}
        </span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-700 bg-slate-900 shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">Seleccionar Empresa y Sucursal</h3>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-slate-400">Cargando...</div>
          ) : (
            <div className="p-2">
              {companies.length === 0 ? (
                <div className="p-4 text-sm text-slate-400">No hay empresas disponibles</div>
              ) : (
                companies.map((company) => (
                  <div key={company.id} className="mb-2">
                    <button
                      onClick={() => handleCompanyClick(company)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-slate-800 transition-colors"
                      style={{
                        backgroundColor: selectedCompanyId === company.id ? '#1e3a5f' : 'transparent',
                      }}
                    >
                      <div className="text-sm font-medium text-white">
                        {company.tradeName || company.legalName}
                      </div>
                      <div className="text-xs text-slate-400">{company.legalName}</div>
                    </button>

                    {selectedCompanyId === company.id && branches.length > 0 && (
                      <div className="ml-4 mt-1 space-y-1">
                        {branches.map((branch) => (
                          <button
                            key={branch.id}
                            onClick={() => handleBranchClick(branch)}
                            className="w-full text-left px-3 py-1.5 rounded text-sm hover:bg-slate-800 transition-colors"
                            style={{
                              backgroundColor: activeBranch?.id === branch.id ? '#1e3a5f' : 'transparent',
                            }}
                          >
                            <span className="text-slate-300">{branch.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
