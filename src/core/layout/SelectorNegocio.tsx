import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuthStore } from '../store/useAuthStore';
import { useCompanyStore } from '../store/useCompanyStore';
import { guardarNegocioActivo, leerNegocioActivo } from '../api/negocioActivo';

interface Negocio {
  id: string;
  tradeName?: string;
  legalName?: string;
}

const etiqueta = (n: Negocio) => n.tradeName || n.legalName || n.id;

// Selector global de negocio para SOPORTE (barra superior). SOPORTE no pertenece a ningún negocio: el servidor le exige uno
// explícito (?tenantId=) en listados y altas, y el interceptor de api.ts lo agrega a cada petición a partir de esta elección.
// Para los demás roles no se muestra nada.
export default function SelectorNegocio() {
  const esSoporte = useAuthStore((s) => s.user?.roleCode) === 'SOPORTE';
  const { setActiveCompany, setActiveBranch } = useCompanyStore();
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [error, setError] = useState(false);
  const [actual, setActual] = useState<string>(() => leerNegocioActivo(localStorage)?.id ?? '');

  useEffect(() => {
    if (!esSoporte) return;
    api.get('/tenants')
      .then((r) => { setNegocios(Array.isArray(r.data) ? r.data : []); setError(false); })
      .catch(() => { setNegocios([]); setError(true); });
  }, [esSoporte]);

  if (!esSoporte) return null;

  function elegir(id: string) {
    const elegido = negocios.find((n) => n.id === id);
    guardarNegocioActivo(localStorage, elegido ? { id: elegido.id, nombre: etiqueta(elegido) } : null);
    setActual(id);
    // La empresa y la sucursal activas eran del negocio anterior: se limpian, y se recarga para que cada pantalla vuelva a pedir sus datos
    setActiveCompany(null);
    setActiveBranch(null);
    window.location.reload();
  }

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgb(var(--text-soft))' }}>
      <span style={{ whiteSpace: 'nowrap' }}>Negocio</span>
      <select
        aria-label="Negocio activo (SOPORTE)"
        title={error ? 'No se pudo cargar la lista de negocios' : 'Negocio sobre el que trabajas'}
        value={actual}
        onChange={(e) => elegir(e.target.value)}
        style={{
          maxWidth: 190, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit',
          color: 'rgb(var(--text-soft))', background: 'rgb(var(--panel))',
          border: `1px solid ${actual ? 'rgb(var(--accent-alt) / 0.6)' : 'rgb(var(--veil) / 0.18)'}`,
          borderRadius: 6, cursor: 'pointer',
        }}
      >
        <option value="">Sin negocio</option>
        {/* Si el negocio guardado ya no está en la lista (o aún no cargó) se conserva visible */}
        {actual && !negocios.some((n) => n.id === actual) && <option value={actual}>{leerNegocioActivo(localStorage)?.nombre || actual}</option>}
        {negocios.map((n) => (
          <option key={n.id} value={n.id}>{etiqueta(n)}</option>
        ))}
      </select>
    </label>
  );
}
