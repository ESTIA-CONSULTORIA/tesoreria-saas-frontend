import { useAuthStore } from '../../core/store/useAuthStore';
import { erpClient } from './mesasApi';
import MesasScreen from './MesasScreen';

// Ruta /mesas: sesión ERP (ProtectedRoute en App.tsx). La sucursal es la de la sesión, o la activa si el usuario
// (ADMIN) no tiene una propia.
export default function MesasPage() {
  const user = useAuthStore((s) => s.user);
  const tenantId = useAuthStore((s) => s.tenantId) || user?.tenantId || localStorage.getItem('tenant_id') || '';
  const sucursalId = user?.branchId || localStorage.getItem('active_branch_id') || null;

  if (!user || !tenantId) return <div className="p-6 text-slate-300">Sin sesión.</div>;

  return (
    <MesasScreen
      client={erpClient}
      tenantId={tenantId}
      sucursalId={sucursalId}
      usuario={user.email}
      puedeConfigurar={user.roleCode === 'ADMIN' || user.roleCode === 'GERENTE'}
    />
  );
}
