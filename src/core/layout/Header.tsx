import { useAuthStore } from '../store/useAuthStore'
import { useCompanyStore } from '../store/useCompanyStore'
import CompanySelector from '../components/CompanySelector'

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuthStore()
  const { activeCompany, activeBranch } = useCompanyStore()

  return (
    <header style={{
      height: '48px',
      background: '#101010',
      borderBottom: '1px solid #2D2D2D',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
    }}>
      {/* Izquierda — módulo actual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{
          fontSize: '13px',
          color: activeCompany ? '#9A9A9A' : '#8A6A3A',
          fontWeight: 400,
          letterSpacing: '0.02em',
        }}>
          {activeCompany 
            ? `${activeCompany.name}${activeBranch ? ` · ${activeBranch.name}` : ' · Todas las sucursales'}` 
            : 'Selecciona una empresa'
          }
        </span>
      </div>

      {/* Centro — selector */}
      <CompanySelector />

      {/* Derecha — usuario */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: '13px', 
            color: '#F5F5F5',
            fontWeight: 500,
          }}>
            {user?.name || user?.email}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#9A9A9A',
          }}>
            {user?.roleCode}
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            color: '#9A9A9A',
            background: 'transparent',
            border: '1px solid #2D2D2D',
            borderRadius: '6px',
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#9B3A3A'
            e.currentTarget.style.borderColor = '#9B3A3A'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#9A9A9A'
            e.currentTarget.style.borderColor = '#2D2D2D'
          }}
        >
          Salir
        </button>
      </div>
    </header>
  )
}