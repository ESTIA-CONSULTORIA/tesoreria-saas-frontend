import { useAuthStore } from '../store/useAuthStore'
import { useLocation } from 'react-router-dom'

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  // Get module name from pathname
  const getModuleName = () => {
    const path = location.pathname
    const navItems = [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Empresas', to: '/companies' },
      { label: 'Sucursales', to: '/branches' },
      { label: 'Bancos', to: '/banks' },
      { label: 'Movimientos', to: '/movements' },
      { label: 'Transferencias', to: '/transfers' },
      { label: 'Tesorería', to: '/treasury' },
      { label: 'Conciliación', to: '/reconciliation' },
      { label: 'Proveedores', to: '/suppliers' },
      { label: 'Compras', to: '/purchases' },
      { label: 'Costos', to: '/costs' },
      { label: 'Reportes', to: '/reports' },
      { label: 'POS', to: '/pos' },
      { label: 'Configuración', to: '/settings' },
      { label: 'Config. Login', to: '/settings/login-config' },
    ]
    const item = navItems.find(i => path.startsWith(i.to))
    return item?.label || 'Tesorería SaaS'
  }

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
          fontSize: '14px',
          color: '#F5F5F5',
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}>
          {getModuleName()}
        </span>
      </div>

      {/* Centro — espacio vacío */}
      <div />

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