import { useEffect, useState } from 'react';
import MainLayout from '../../core/layout/MainLayout';
import { api } from '../../core/api/api';
import { usePuede } from '../../core/hooks/usePuede';
import { useAuthStore } from '../../core/store/useAuthStore';
import { leerNegocioActivo } from '../../core/api/negocioActivo';

// Configuración → Ticket. El mensaje que se imprime al pie del ticket del POS: uno por empresa y, opcional, uno por sucursal (gana el de la
// sucursal). Solo lo editan ADMIN, GERENTE y SOPORTE, y solo si la matriz de permisos de «Configuración» se lo permite; el servidor valida
// igual. El encabezado (nombre, dirección, RFC, teléfono) NO se escribe aquí: sale de los datos reales de la empresa y la sucursal, y lo
// que falte simplemente no se imprime.
const MAX = 200;

interface Sucursal { branchId: string; nombre: string; direccion: string | null; mensaje: string }
interface Empresa { companyId: string; nombre: string; mensaje: string; encabezado: { nombreComercial: string | null; rfc: string | null; telefono: string | null }; sucursales: Sucursal[] }

export default function TicketConfigPage() {
  const puedeEditar = usePuede('configuracion', 'editar');
  // Solo SOPORTE indica el negocio (el de la barra superior); los demás roles usan el suyo, que el servidor toma de la sesión.
  const esSoporte = useAuthStore((st) => st.user?.roleCode) === 'SOPORTE';
  const params = esSoporte ? { tenantId: leerNegocioActivo(localStorage)?.id } : undefined;
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ clave: string; ok: boolean; texto: string } | null>(null);

  const cargar = () => api.get('/ticket-config', { params })
    .then((r) => {
      const lista: Empresa[] = Array.isArray(r.data?.empresas) ? r.data.empresas : [];
      setEmpresas(lista);
      const b: Record<string, string> = {};
      for (const e of lista) { b[`c:${e.companyId}`] = e.mensaje; for (const s of e.sucursales) b[`b:${s.branchId}`] = s.mensaje; }
      setBorrador(b);
    })
    .catch((e) => setError(e?.response?.data?.message || 'No se pudo cargar la configuración del ticket.'))
    .finally(() => setCargando(false));

  useEffect(() => { void cargar(); }, []);

  async function guardar(clave: string, cuerpo: { companyId?: string; branchId?: string }) {
    setGuardando(clave);
    setAviso(null);
    try {
      await api.put('/ticket-config', { ...cuerpo, mensaje: borrador[clave] ?? '' }, { params });
      setAviso({ clave, ok: true, texto: 'Guardado.' });
      await cargar();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setAviso({ clave, ok: false, texto: (Array.isArray(msg) ? msg.join('. ') : msg) || 'No se pudo guardar el mensaje.' });
    } finally {
      setGuardando(null);
    }
  }

  const campo = (clave: string, etiqueta: string, ayuda: string, cuerpo: { companyId?: string; branchId?: string }) => (
    <div className="mb-3">
      <label htmlFor={`tk-${clave}`} className="mb-1 block text-xs text-content-3">{etiqueta}</label>
      <div className="flex items-start gap-2">
        <textarea
          id={`tk-${clave}`}
          value={borrador[clave] ?? ''}
          onChange={(e) => setBorrador({ ...borrador, [clave]: e.target.value })}
          maxLength={MAX}
          rows={2}
          disabled={!puedeEditar}
          placeholder={ayuda}
          className="flex-1 rounded-md border border-line bg-surface-2 px-2 py-1.5 text-sm text-content-1 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => guardar(clave, cuerpo)}
          disabled={!puedeEditar || guardando === clave}
          className="rounded-md border border-line bg-surface-2 px-3 py-1.5 text-xs text-content-1 hover:bg-surface-3 disabled:opacity-60"
        >
          {guardando === clave ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      <div className="mt-1 flex h-4 justify-between text-xs">
        <span className={aviso?.clave === clave ? (aviso.ok ? 'text-ok' : 'text-danger') : 'text-content-3'} role={aviso?.clave === clave && !aviso.ok ? 'alert' : undefined}>
          {aviso?.clave === clave ? aviso.texto : ''}
        </span>
        <span className="text-content-3">{(borrador[clave] ?? '').length}/{MAX}</span>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div style={{ padding: '0 24px 12px', maxWidth: 900 }}>
        <div style={{ marginBottom: 10 }}>
          <h2 className="text-content-1" style={{ fontSize: 16, fontWeight: 600, marginBottom: 0 }}>Ticket</h2>
          <p className="text-content-2" style={{ fontSize: 12 }}>
            El mensaje al pie del ticket del punto de venta. Solo lo cambian administradores, gerentes y soporte; el POS lo imprime tal cual, sin poder editarlo.
          </p>
        </div>
        {!puedeEditar && !cargando && (
          <div role="status" className="mb-3 rounded-lg border border-line bg-surface-1 px-3 py-2 text-xs text-content-2">
            Tu rol puede ver el mensaje pero no cambiarlo. Pide a un administrador que te lo active en Configuración → Permisos.
          </div>
        )}
        {error && <div role="alert" className="mb-3 rounded-lg border border-danger px-3 py-2 text-xs text-danger">{error}</div>}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 190px)' }}>
          {cargando ? <p className="text-xs text-content-2">Cargando…</p> : empresas.map((e) => (
            <section key={e.companyId} className="mb-4 rounded-xl border border-line bg-surface-1 p-4" aria-label={`Ticket de ${e.nombre}`}>
              <h3 className="mb-1 text-sm font-semibold text-content-1">{e.nombre}</h3>
              <p className="mb-3 text-xs text-content-3">
                Encabezado del ticket (de los datos de la empresa y la sucursal):{' '}
                {[e.encabezado.nombreComercial, e.encabezado.rfc ? `RFC ${e.encabezado.rfc}` : null, e.encabezado.telefono ? `Tel. ${e.encabezado.telefono}` : null].filter(Boolean).join(' · ') || 'sin datos'}.
                Lo que falte no se imprime.
              </p>
              {campo(`c:${e.companyId}`, 'Mensaje de la empresa', '¡Gracias por su compra!', { companyId: e.companyId })}
              {e.sucursales.length > 0 && (
                <div className="mt-2 border-t border-line pt-3">
                  <h4 className="mb-2 text-xs font-medium uppercase text-content-3">Por sucursal (opcional)</h4>
                  {e.sucursales.map((s) => (
                    <div key={s.branchId}>
                      {campo(`b:${s.branchId}`, `${s.nombre}${s.direccion ? ` · ${s.direccion}` : ''}`, 'Vacío = usa el mensaje de la empresa', { branchId: s.branchId })}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
          {!cargando && empresas.length === 0 && !error && <p className="text-xs text-content-2">Aún no hay empresas.</p>}
        </div>
      </div>
    </MainLayout>
  );
}
