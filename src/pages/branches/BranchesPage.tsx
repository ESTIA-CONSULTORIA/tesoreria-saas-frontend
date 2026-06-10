import { useEffect, useState } from "react";
import MainLayout from "../../core/layout/MainLayout";
import { api } from "../../core/api/api";
import CreateBranchModal from "./CreateBranchModal";
import { useCompanyStore } from "../../core/store/useCompanyStore";

interface Branch {
  id: string;
  name: string;
  code?: string;
  city?: string;
  address?: string;
  isActive: boolean;
}

export default function BranchesPage() {
  const { activeCompany } = useCompanyStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  useEffect(() => {
    loadBranches();
  }, [activeCompany?.id]);

  async function loadBranches() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/branches");
      setBranches(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible cargar sucursales");
    } finally {
      setLoading(false);
    }
  }

  async function deleteBranch(id: string) {
    if (!confirm("¿Estás seguro de eliminar esta sucursal?")) return;
    try {
      await api.delete(`/branches/${id}`);
      loadBranches();
    } catch (err: any) {
      setError(err.response?.data?.message || "No fue posible eliminar la sucursal");
    }
  }

  function handleEdit(branch: Branch) {
    setSelectedBranch(branch);
    setModalOpen(true);
  }

  function handleCreate() {
    setSelectedBranch(null);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setSelectedBranch(null);
  }

  return (
    <MainLayout>
      <CreateBranchModal
        open={modalOpen}
        onClose={handleCloseModal}
        onCreated={loadBranches}
        branch={selectedBranch}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 400, color: '#F5F5F5', marginBottom: '4px', letterSpacing: '0.01em' }}>
              Sucursales
            </h2>
            <p style={{ fontSize: '13px', color: '#9A9A9A' }}>
              Administración de sucursales
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
            + Nueva Sucursal
          </button>
        </div>

        {error && (
          <div style={{ padding: '16px', backgroundColor: '#2D2D2D', border: '1px solid #9B3A3A', borderRadius: '8px', color: '#F5F5F5' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '24px', backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', color: '#9A9A9A' }}>
            Cargando sucursales...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
            {branches.length === 0 ? (
              <div style={{ padding: '24px', backgroundColor: '#161616', border: '1px solid #2D2D2D', borderRadius: '8px', color: '#9A9A9A' }}>
                No existen sucursales registradas
              </div>
            ) : (
              branches.map((branch) => {
                const initials = (branch.name || 'NA')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                
                return (
                  <div
                    key={branch.id}
                    style={{
                      backgroundColor: '#161616',
                      border: '1px solid #2D2D2D',
                      borderRadius: '12px',
                      padding: '24px',
                    }}
                  >
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#7E7E7E',
                        marginBottom: '4px',
                        display: 'block',
                      }}>
                        {branch.code || 'SIN-CODIGO'}
                      </span>
                      <h3 style={{ fontSize: '15px', color: '#F5F5F5', fontWeight: 500, marginBottom: '4px' }}>
                        {branch.name}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#9A9A9A' }}>
                        {branch.city || 'Sin ciudad'}
                      </p>
                      <p style={{ fontSize: '11px', color: '#7E7E7E' }}>
                        {branch.address || 'Sin dirección'}
                      </p>
                    </div>

                    <div style={{ height: '1px', backgroundColor: '#2D2D2D', margin: '12px 0' }} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: branch.isActive ? '#3B7A57' : '#9B3A3A',
                        backgroundColor: branch.isActive ? '#1a2e22' : '#2e1a1a',
                      }}>
                        {branch.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEdit(branch)}
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
                        onClick={() => deleteBranch(branch.id)}
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
