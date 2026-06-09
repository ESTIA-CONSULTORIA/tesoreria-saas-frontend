import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateCompanyModal from "./CreateCompanyModal";

interface Company {
  id: string;
  legalName: string;
  tradeName: string;
  taxId?: string;
  baseCurrency: string;
  isActive: boolean;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/companies");
      setCompanies(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "No fue posible cargar empresas"
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteCompany(id: string) {
    if (!confirm("¿Estás seguro de eliminar esta empresa?")) return;
    try {
      await api.delete(`/companies/${id}`);
      loadCompanies();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible eliminar la empresa");
    }
  }

  function handleEdit(company: Company) {
    setSelectedCompany(company);
    setModalOpen(true);
  }

  function handleCreate() {
    setSelectedCompany(null);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setSelectedCompany(null);
  }

  return (
    <MainLayout>
      <CreateCompanyModal
        open={modalOpen}
        onClose={handleCloseModal}
        onCreated={loadCompanies}
        company={selectedCompany}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 400, color: '#F5F5F5', marginBottom: '4px', letterSpacing: '0.01em' }}>
              Empresas
            </h2>
            <p style={{ fontSize: '13px', color: '#9A9A9A' }}>
              Administración de empresas
            </p>
          </div>

          <button
            onClick={handleCreate}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              color: '#BDBDBD',
              backgroundColor: '#1B1B1B',
              border: '1px solid #3D3D3D',
              borderRadius: '6px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#BDBDBD'; e.currentTarget.style.color = '#F5F5F5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3D3D3D'; e.currentTarget.style.color = '#BDBDBD'; }}
          >
            + Nueva Empresa
          </button>
        </div>

        {error && (
          <div style={{ padding: '16px', backgroundColor: '#2D2D2D', border: '1px solid #9B3A3A', borderRadius: '8px', color: '#F5F5F5' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '24px', backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', color: '#9A9A9A' }}>
            Cargando empresas...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
            {companies.length === 0 ? (
              <div style={{ padding: '24px', backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', color: '#9A9A9A' }}>
                No existen empresas registradas
              </div>
            ) : (
              companies.map((company) => {
                const initials = (company.legalName || company.tradeName || 'NA')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                
                return (
                  <div
                    key={company.id}
                    style={{
                      backgroundColor: '#161616',
                      border: '1px solid #2D2D2D',
                      borderRadius: '12px',
                      padding: '24px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: '#2D2D2D',
                        color: '#BDBDBD',
                        fontWeight: 600,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '15px', color: '#F5F5F5', fontWeight: 500, marginBottom: '4px' }}>
                          {company.legalName}
                        </h3>
                        <p style={{ fontSize: '12px', color: '#9A9A9A', marginBottom: '4px' }}>
                          {company.tradeName}
                        </p>
                        <p style={{ fontSize: '11px', color: '#7E7E7E', fontFamily: 'monospace' }}>
                          RFC: {company.taxId || 'Sin RFC'}
                        </p>
                      </div>
                    </div>

                    <div style={{ height: '1px', backgroundColor: '#2D2D2D', margin: '12px 0' }} />

                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '11px', color: '#9A9A9A' }}>
                      <span>Moneda: {company.baseCurrency}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: company.isActive ? '#3B7A57' : '#9B3A3A',
                        backgroundColor: company.isActive ? '#1a2e22' : '#2e1a1a',
                      }}>
                        {company.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEdit(company)}
                        style={{
                          flex: 1,
                          padding: '8px 16px',
                          fontSize: '12px',
                          color: '#BDBDBD',
                          backgroundColor: 'transparent',
                          border: '1px solid #2D2D2D',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3D3D3D'; e.currentTarget.style.color = '#F5F5F5'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2D2D2D'; e.currentTarget.style.color = '#BDBDBD'; }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteCompany(company.id)}
                        style={{
                          flex: 1,
                          padding: '8px 16px',
                          fontSize: '12px',
                          color: '#9B3A3A',
                          backgroundColor: 'transparent',
                          border: '1px solid #2D2D2D',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#9B3A3A'; e.currentTarget.style.backgroundColor = '#2e1a1a'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2D2D2D'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}