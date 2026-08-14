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
          const savedBranchId = localStorage.getItem('active_branch_id');
          handleCompanySelect(myCompany, true);
          if (savedBranchId) {
            loadBranches(myCompany.id).then((loadedBranches: Branch[]) => {
              const savedBranch = loadedBranches?.find((b: Branch) => b.id === savedBranchId);
              if (savedBranch) {
                setActiveBranch({ id: savedBranch.id, name: savedBranch.name });
                localStorage.setItem('active_branch_id', savedBranch.id);
                localStorage.setItem('active_branch_name', savedBranch.name);
              }
            });
          }
        }
      } else if (isAdmin) {
        console.log('[CompanySelector] isAdmin branch — savedBranchId:', localStorage.getItem('active_branch_id'));
        localStorage.removeItem('active_company_id');
        localStorage.removeItem('active_company_name');
        setActiveCompany(null);
        const savedBranchId = localStorage.getItem('active_branch_id');
        if (!savedBranchId) {
          localStorage.removeItem('active_branch_id');
          localStorage.removeItem('active_branch_name');
          setActiveBranch(null);
        }
      }
    }
  }, [companies, activeCompany, userCompanyId, userBranchId]);

  // Restaurar sucursal al montar si hay empresa guardada en localStorage
  useEffect(() => {
    const savedCompanyId = localStorage.getItem('active_company_id');
    const savedBranchId = localStorage.getItem('active_branch_id');
    console.log('[CompanySelector] mount — savedCompanyId:', savedCompanyId, 'savedBranchId:', savedBranchId);

    if (savedCompanyId && savedBranchId) {
      api.get(`/branches?companyId=${savedCompanyId}`)
        .then((res: any) => {
          const branchList: Branch[] = Array.isArray(res.data) ? res.data : [];
          console.log('[CompanySelector] branches cargadas:', branchList.length, '— buscando:', savedBranchId);
          setBranches(branchList);
          const found = branchList.find(b => b.id === savedBranchId);
          console.log('[CompanySelector] sucursal encontrada:', found);
          if (found) {
            setActiveBranch({ id: found.id, name: found.name });
            localStorage.setItem('active_branch_id', found.id);
            localStorage.setItem('active_branch_name', found.name);
          }
        })
        .catch((err: any) => { console.log('[CompanySelector] error cargando branches:', err); });
    } else if (savedCompanyId) {
      console.log('[CompanySelector] solo empresa, sin sucursal — cargando branches');
      api.get(`/branches?companyId=${savedCompanyId}`)
        .then((res: any) => {
          const branchList: Branch[] = Array.isArray(res.data) ? res.data : [];
          console.log('[CompanySelector] branches (solo empresa):', branchList.length);
          setBranches(branchList);
        })
        .catch(() => {});
    }
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      const response = await api.get("/companies");
      const data = Array.isArray(response.data) ? response.data : [];
      // Deduplicar por id
      const unique = data.filter((company, index, self) =>
        index === self.findIndex(c => c.id === company.id)
      );
      setCompanies(unique);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadBranches(companyId: string): Promise<Branch[]> {
    try {
      setLoading(true);
      const response = await api.get(`/branches?companyId=${companyId}`);
      const data: Branch[] = Array.isArray(response.data) ? response.data : [];
      setBranches(data);
      return data;
    } catch {
      setBranches([]);
      return [];
    } finally {
      setLoading(false);
    }
  }

  const handleCompanySelect = (company: Company, preserveBranch = false) => {
    setActiveCompany({ id: company.id, name: company.tradeName || company.legalName });
    localStorage.setItem('active_company_id', company.id);
    localStorage.setItem('active_company_name', company.tradeName || company.legalName);
    if (!preserveBranch) {
      setActiveBranch(null);
      localStorage.removeItem('active_branch_id');
      localStorage.removeItem('active_branch_name');
    }
    loadBranches(company.id);
    setCompanyDropdownOpen(false);

    // Switch company context — best-effort, fire and forget. El backend ya puso las
    // cookies httpOnly nuevas; el body solo trae el user actualizado.
    api.post('/auth/switch-company', { companyId: company.id }).then((res: any) => {
      const newUser = res.data?.user;
      if (newUser) {
        const modulosActivos = JSON.parse(localStorage.getItem('modulos_activos') || '[]');
        useAuthStore.getState().login(
          {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            roleCode: newUser.roleCode,
            tenantId: newUser.tenantId,
            companyId: company.id,
          },
          modulosActivos
        );
      }
    }).catch(() => {});
  };

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
