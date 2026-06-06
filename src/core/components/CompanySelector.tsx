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

  function handleViewAllCompany() {
    setActiveBranch(null);
    setIsOpen(false);
  }

  function handleGlobalView() {
    setActiveCompany(null);
    setActiveBranch(null);
    setSelectedCompanyId(null);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={{ backgroundColor: '#161616', color: '#F5F5F5', border: '1px solid #2D2D2D' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1B1B1B'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#161616'; }}
      >
        <span>
          {!activeCompany ? "Seleccionar empresa" :
           activeBranch ? `${activeCompany.name} — ${activeBranch.name}` :
           `${activeCompany.name} — Todas las sucursales`}
        </span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto" style={{ backgroundColor: '#161616', border: '1px solid #2D2D2D' }}>
          <div className="p-4 border-b" style={{ borderColor: '#2D2D2D' }}>
            <h3 className="text-sm font-semibold" style={{ color: '#F5F5F5' }}>Seleccionar Empresa y Sucursal</h3>
          </div>

          {loading ? (
            <div className="p-4 text-sm" style={{ color: '#9A9A9A' }}>Cargando...</div>
          ) : (
            <div className="p-2">
              {/* Opción Vista Global */}
              <button
                onClick={handleGlobalView}
                className="w-full text-left px-3 py-2 rounded transition-colors mb-2"
                style={{
                  backgroundColor: !activeCompany ? '#222222' : 'transparent',
                  color: '#F5F5F5',
                }}
                onMouseEnter={(e) => { if (!activeCompany) e.currentTarget.style.backgroundColor = '#2A2A2A'; }}
                onMouseLeave={(e) => { if (!activeCompany) e.currentTarget.style.backgroundColor = '#222222'; }}
              >
                <div className="text-sm font-medium flex items-center gap-2">
                  <span>🌐</span>
                  <span>Vista Global</span>
                </div>
              </button>

              {companies.length === 0 ? (
                <div className="p-4 text-sm" style={{ color: '#9A9A9A' }}>No hay empresas disponibles</div>
              ) : (
                companies.map((company) => (
                  <div key={company.id} className="mb-2">
                    <button
                      onClick={() => handleCompanyClick(company)}
                      className="w-full text-left px-3 py-2 rounded transition-colors"
                      style={{
                        backgroundColor: selectedCompanyId === company.id ? '#222222' : 'transparent',
                        color: '#F5F5F5',
                      }}
                      onMouseEnter={(e) => { if (selectedCompanyId !== company.id) e.currentTarget.style.backgroundColor = '#1B1B1B'; }}
                      onMouseLeave={(e) => { if (selectedCompanyId !== company.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div className="text-sm font-medium">
                        {company.tradeName || company.legalName}
                      </div>
                      <div className="text-xs" style={{ color: '#9A9A9A' }}>{company.legalName}</div>
                    </button>

                    {selectedCompanyId === company.id && branches.length > 0 && (
                      <div className="ml-4 mt-1 space-y-1">
                        {/* Opción Ver toda la empresa */}
                        <button
                          onClick={handleViewAllCompany}
                          className="w-full text-left px-3 py-1.5 rounded text-sm transition-colors"
                          style={{
                            backgroundColor: !activeBranch && activeCompany?.id === company.id ? '#222222' : 'transparent',
                            color: '#9A9A9A',
                          }}
                          onMouseEnter={(e) => { if (!(!activeBranch && activeCompany?.id === company.id)) e.currentTarget.style.backgroundColor = '#1B1B1B'; }}
                          onMouseLeave={(e) => { if (!(!activeBranch && activeCompany?.id === company.id)) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <span className="flex items-center gap-2">
                            <span>📊</span>
                            <span>Ver toda la empresa</span>
                          </span>
                        </button>

                        {branches.map((branch) => (
                          <button
                            key={branch.id}
                            onClick={() => handleBranchClick(branch)}
                            className="w-full text-left px-3 py-1.5 rounded text-sm transition-colors"
                            style={{
                              backgroundColor: activeBranch?.id === branch.id ? '#222222' : 'transparent',
                              color: '#9A9A9A',
                            }}
                            onMouseEnter={(e) => { if (activeBranch?.id !== branch.id) e.currentTarget.style.backgroundColor = '#1B1B1B'; }}
                            onMouseLeave={(e) => { if (activeBranch?.id !== branch.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <span>{branch.name}</span>
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
