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
//
// Aspecto: el CSS global (index.css) ya pinta todo <select> con los tokens de la skin (--field, --border-field, --text-1) con
// !important, así que aquí solo se resuelve la forma: appearance none + flecha propia (el control nativo ignoraba el fondo de la
// skin), y la clase selector-negocio (index.css) que le da un anillo de foco visible. Que haya un negocio elegido se muestra con un
// punto de color (no depende solo del color del borde).
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
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgb(var(--text-1))' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
        <span
          aria-hidden="true"
          style={{ width: 7, height: 7, borderRadius: '50%', background: actual ? 'rgb(var(--accent-alt))' : 'transparent', border: '1px solid rgb(var(--accent-alt))', flexShrink: 0 }}
        />
        Negocio
      </span>
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <select
          className="selector-negocio"
          aria-label="Negocio activo (SOPORTE)"
          title={error ? 'No se pudo cargar la lista de negocios' : 'Negocio sobre el que trabajas'}
          value={actual}
          onChange={(e) => elegir(e.target.value)}
          style={{
            width: 190, padding: '4px 24px 4px 8px', fontSize: 12, fontFamily: 'inherit', lineHeight: 1.4,
            borderWidth: 1, borderStyle: 'solid', borderRadius: 6, cursor: 'pointer',
            appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', textOverflow: 'ellipsis',
          }}
        >
          <option value="">Sin negocio</option>
          {/* Si el negocio guardado ya no está en la lista (o aún no cargó) se conserva visible */}
          {actual && !negocios.some((n) => n.id === actual) && <option value={actual}>{leerNegocioActivo(localStorage)?.nombre || actual}</option>}
          {negocios.map((n) => (
            <option key={n.id} value={n.id}>{etiqueta(n)}</option>
          ))}
        </select>
        <svg
          aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </label>
  );
}
