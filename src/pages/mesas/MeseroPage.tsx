import { useEffect, useState } from 'react';
import { liteClient } from './mesasApi';
import MesasScreen from './MesasScreen';
import { mensajeError } from './mesasLogic';

// Ruta /mesero: POS Lite. NIP de 4 dígitos (mismo mecanismo que /corte y /cocina: cookie httpOnly pos_access_token
// + x-session-scope: pos-lite). El tenant viene de ?tenant=<slug o id> y se recuerda en el dispositivo.
interface SesionLite { id: string; email: string; roleCode: string; tenantId: string; branchId: string | null }

const KEY_TENANT = 'mesero_tenant_id';
const KEY_SESION = 'mesero_session';

export default function MeseroPage() {
  const [tenantId, setTenantId] = useState<string>(() => {
    const qp = new URLSearchParams(window.location.search).get('tenant');
    const resuelto = qp || localStorage.getItem(KEY_TENANT) || '';
    if (resuelto) localStorage.setItem(KEY_TENANT, resuelto);
    return resuelto;
  });
  const [sesion, setSesion] = useState<SesionLite | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(KEY_SESION) || 'null'); } catch { return null; }
  });
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Un slug se resuelve a UUID (ruta pública, sin autenticar).
  useEffect(() => {
    if (!tenantId || /^[0-9a-f-]{36}$/.test(tenantId)) return;
    liteClient.get(`/tenants/resolve/${encodeURIComponent(tenantId)}`)
      .then((r) => { if (r.data?.id) { setTenantId(r.data.id); localStorage.setItem(KEY_TENANT, r.data.id); } })
      .catch(() => setError('No se reconoce el negocio de este enlace.'));
  }, [tenantId]);

  // La verdad de la sesión es la cookie httpOnly, no el indicio local.
  useEffect(() => {
    if (!sesion) return;
    liteClient.get('/pos/cashiers/me').catch(() => { sessionStorage.removeItem(KEY_SESION); setSesion(null); });
  }, [sesion]);

  const digitar = async (d: string) => {
    if (cargando) return;
    if (d === 'del') { setPin((p) => p.slice(0, -1)); return; }
    const nuevo = pin + d;
    setPin(nuevo);
    if (nuevo.length !== 4) return;
    setCargando(true);
    setError('');
    try {
      const r = await liteClient.post('/pos/cashiers/nip', { nip: nuevo, tenantId });
      const u = r.data?.user;
      const s: SesionLite = { id: u.id, email: u.email, roleCode: u.roleCode, tenantId: u.tenantId, branchId: u.branchId ?? null };
      sessionStorage.setItem(KEY_SESION, JSON.stringify(s));
      setSesion(s);
    } catch (e) {
      setError(mensajeError(e, 'NIP incorrecto'));
    } finally {
      setPin('');
      setCargando(false);
    }
  };

  const salir = async () => {
    await liteClient.post('/pos/cashiers/logout', {}).catch(() => undefined);
    sessionStorage.removeItem(KEY_SESION);
    setSesion(null);
  };

  if (sesion) {
    return (
      <MesasScreen client={liteClient} tenantId={sesion.tenantId} sucursalId={sesion.branchId} usuario={sesion.email} puedeConfigurar={false} onSalir={salir} />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-white">
      <h1 className="text-xl font-bold">Mesas · NIP</h1>
      {!tenantId && <p className="max-w-xs text-center text-sm text-amber-300">Abre esta pantalla desde el enlace de tu negocio (con ?tenant=…).</p>}
      <div className="flex gap-3" aria-label="NIP">
        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-4 w-4 rounded-full ${i < pin.length ? 'bg-blue-500' : 'bg-slate-700'}`} />)}
      </div>
      {error && <p role="alert" className="max-w-xs text-center text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) =>
          k === '' ? <span key="e" /> : (
            <button key={k} disabled={!tenantId || cargando} className="h-20 w-20 rounded-2xl bg-slate-800 text-2xl font-semibold active:bg-slate-700 disabled:opacity-40" onClick={() => digitar(k)}>
              {k === 'del' ? '⌫' : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
