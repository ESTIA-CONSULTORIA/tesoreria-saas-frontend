import { useState, useEffect } from "react";
import { api } from "../api/api";
import { useCompanyStore } from "../store/useCompanyStore";
import { useAuthStore } from "../store/useAuthStore";

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
  const { companyId: userCompanyId, branchId: userBranchId, user } = useAuthStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  const isCompanyRestricted = !!userCompanyId;
  const isBranchRestricted = !!userBranchId;
  const isAdmin = user?.roleCode === 'ADMIN' || user?.roleCode === 'SOPORTE';

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (companies.length > 0 && !activeCompany) {
      if (userCompanyId) {
        const myCompany = companies.find(c => c.id === userCompanyId);
        if (myCompany) {
          handleCompanySelect(myCompany);
          if (userBranchId) {
            loadBranches(myCompany.id).then(() => {
              const myBranch = branches.find(b => b.id === userBranchId);
              if (myBranch) {
                setActiveBranch({ id: myBranch.id, name: myBranch.name });
              }
            });
          }
        }
      } else if (isAdmin) {
        // Admin starts with global view - clear localStorage to ensure no previous selection
        localStorage.removeItem('active_company_id');
        localStorage.removeItem('active_company_name');
        localStorage.removeItem('active_branch_id');
        localStorage.removeItem('active_branch_name');
        setActiveCompany(null);
        setActiveBranch(null);
      }
    }
  }, [companies, activeCompany, userCompanyId, userBranchId]);

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

  function handleCompanySelect(company: Company) {
    setActiveCompany({ id: company.id, name: company.tradeName || company.legalName });
    setActiveBranch(null);
    localStorage.setItem('active_company_id', company.id);
    localStorage.setItem('active_company_name', company.tradeName || company.legalName);
    localStorage.removeItem('active_branch_id');
    localStorage.removeItem('active_branch_name');
    loadBranches(company.id);
    setCompanyDropdownOpen(false);
  }

  function handleBranchSelect(branch: Branch) {
    setActiveBranch({ id: branch.id, name: branch.name });
    localStorage.setItem('active_branch_id', branch.id);
    localStorage.setItem('active_branch_name', branch.name);
    setBranchDropdownOpen(false);
  }

  function handleGlobalView() {
    setActiveCompany(null);
    setActiveBranch(null);
    setBranches([]);
    localStorage.removeItem('active_company_id');
    localStorage.removeItem('active_company_name');
    localStorage.removeItem('active_branch_id');
    localStorage.removeItem('active_branch_name');
    setCompanyDropdownOpen(false);
  }

  function handleViewAllBranches() {
    setActiveBranch(null);
    localStorage.removeItem('active_branch_id');
    localStorage.removeItem('active_branch_name');
    setBranchDropdownOpen(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* SELECTOR 1 - EMPRESA */}
      <div>
        <div style={{ fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
          Empresa
        </div>
        
        {isCompanyRestricted ? (
          // Texto no editable para usuario con restricción
          <div style={{
            background: '#1B1B1B',
            border: '1px solid #2D2D2D',
            borderRadius: '6px',
            padding: '8px 12px',
            width: '100%',
            cursor: 'default'
          }}>
            <span style={{ fontSize: '12px', color: '#F5F5F5', fontWeight: 500 }}>
              {activeCompany?.name || 'Cargando...'}
            </span>
          </div>
        ) : isAdmin ? (
          // Dropdown para ADMIN/SOPORTE
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
              style={{
                background: '#1B1B1B',
                border: '1px solid #2D2D2D',
                borderRadius: '6px',
                padding: '8px 12px',
                width: '100%',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '12px', color: '#F5F5F5', fontWeight: 500 }}>
                {!activeCompany ? '🌐 Vista Global' : activeCompany.name}
              </span>
              <span style={{ color: '#9A9A9A', fontSize: '10px' }}>
                {companyDropdownOpen ? '▲' : '▼'}
              </span>
            </div>

            {companyDropdownOpen && (
              <div style={{
                background: '#161616',
                border: '1px solid #2D2D2D',
                borderRadius: '6px',
                position: 'absolute',
                zIndex: 1000,
                width: '100%',
                maxHeight: '200px',
                overflowY: 'auto',
                marginTop: '4px'
              }}>
                {/* Vista Global */}
                <div
                  onClick={handleGlobalView}
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: !activeCompany ? '#F5F5F5' : '#9A9A9A',
                    cursor: 'pointer',
                    background: !activeCompany ? '#222222' : 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#222222'}
                  onMouseLeave={(e) => e.currentTarget.style.background = !activeCompany ? '#222222' : 'transparent'}
                >
                  🌐 Vista Global
                </div>

                {companies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => handleCompanySelect(company)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: activeCompany?.id === company.id ? '#F5F5F5' : '#9A9A9A',
                      cursor: 'pointer',
                      background: activeCompany?.id === company.id ? '#222222' : 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#222222'}
                    onMouseLeave={(e) => e.currentTarget.style.background = activeCompany?.id === company.id ? '#222222' : 'transparent'}
                  >
                    {company.tradeName || company.legalName}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* SELECTOR 2 - SUCURSAL */}
      {activeCompany && (
        <div>
          <div style={{ fontSize: '10px', color: '#7E7E7E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            Sucursal
          </div>
          
          {isBranchRestricted ? (
            // Texto no editable para usuario con restricción
            <div style={{
              background: '#1B1B1B',
              border: '1px solid #2D2D2D',
              borderRadius: '6px',
              padding: '8px 12px',
              width: '100%',
              cursor: 'default'
            }}>
              <span style={{ fontSize: '12px', color: '#F5F5F5', fontWeight: 500 }}>
                {activeBranch?.name || 'Cargando...'}
              </span>
            </div>
          ) : (
            // Dropdown para todos los usuarios con empresa
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                style={{
                  background: '#1B1B1B',
                  border: '1px solid #2D2D2D',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  width: '100%',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '12px', color: '#F5F5F5', fontWeight: 500 }}>
                  {!activeBranch ? '📊 Todas las sucursales' : activeBranch.name}
                </span>
                <span style={{ color: '#9A9A9A', fontSize: '10px' }}>
                  {branchDropdownOpen ? '▲' : '▼'}
                </span>
              </div>

              {branchDropdownOpen && (
                <div style={{
                  background: '#161616',
                  border: '1px solid #2D2D2D',
                  borderRadius: '6px',
                  position: 'absolute',
                  zIndex: 1000,
                  width: '100%',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}>
                  {/* Todas las sucursales */}
                  <div
                    onClick={handleViewAllBranches}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: !activeBranch ? '#F5F5F5' : '#9A9A9A',
                      cursor: 'pointer',
                      background: !activeBranch ? '#222222' : 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#222222'}
                    onMouseLeave={(e) => e.currentTarget.style.background = !activeBranch ? '#222222' : 'transparent'}
                  >
                    📊 Todas las sucursales
                  </div>

                  {branches.map((branch) => (
                    <div
                      key={branch.id}
                      onClick={() => handleBranchSelect(branch)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        color: activeBranch?.id === branch.id ? '#F5F5F5' : '#9A9A9A',
                        cursor: 'pointer',
                        background: activeBranch?.id === branch.id ? '#222222' : 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#222222'}
                      onMouseLeave={(e) => e.currentTarget.style.background = activeBranch?.id === branch.id ? '#222222' : 'transparent'}
                    >
                      {branch.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
