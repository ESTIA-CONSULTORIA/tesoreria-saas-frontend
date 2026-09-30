import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API = ((import.meta.env.VITE_API_URL as string) ||
  'https://api.estiaconsultoria.com') + '/api/v1';

// POS flexible, capacidad notas_cocina_barra. Pantalla touch tipo kiosko — cocina y barra
// son estaciones físicas distintas en la práctica: esta misma página se despliega dos veces
// (dos tablets/dos URLs), cada una con su propio ?estacion=COCINA o ?estacion=BARRA. Mismo
// mecanismo de sesión que CorteCajaLite.tsx (pos_access_token httpOnly + x-session-scope:
// pos-lite) — sin turno/corte de caja, esta pantalla solo necesita saber quién es el cajero
// (para el NIP) y su sucursal (User.branchId, mismo campo que ya usa CorteCajaLite.tsx).

type Estacion = 'COCINA' | 'BARRA';
type Screen = 'urlInvalida' | 'pin' | 'notas';

interface NotaCocina {
  id: string;
  saleId: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  estacion: Estacion;
  estado: 'PENDIENTE' | 'PREPARADO';
  createdAt: string;
}

const POLL_MS = 8000;

export default function NotasCocinaLite() {
  const [tenantId, setTenantId] = useState<string>(() => {
    const qp = new URLSearchParams(window.location.search).get('tenant');
    const resolved = qp || localStorage.getItem('cocina_tenant_id') || '';
    if (resolved) localStorage.setItem('cocina_tenant_id', resolved);
    return resolved;
  });

  const estacion = useState<Estacion | null>(() => {
    const qp = new URLSearchParams(window.location.search).get('estacion')?.toUpperCase();
    if (qp === 'COCINA' || qp === 'BARRA') {
      sessionStorage.setItem('cocina_estacion', qp);
      return qp as Estacion;
    }
    const stored = sessionStorage.getItem('cocina_estacion');
    return stored === 'COCINA' || stored === 'BARRA' ? (stored as Estacion) : null;
  })[0];

  useEffect(() => {
    const isUUID = /^[0-9a-f-]{36}$/.test(tenantId);
    if (!isUUID && tenantId) {
      axios.get(`${API}/tenants/resolve/${encodeURIComponent(tenantId)}`)
        .then(r => {
          if (r.data?.id) {
            setTenantId(r.data.id);
            localStorage.setItem('cocina_tenant_id', r.data.id);
          }
        }).catch(() => {});
    }
  }, []);

  const [session, setSession] = useState<{ cajero: string; sucursalId: string | null } | null>(() => {
    const s = sessionStorage.getItem('cocina_session');
    return s ? JSON.parse(s) : null;
  });
  const [screen, setScreen] = useState<Screen>(() => {
    if (!estacion) return 'urlInvalida';
    return sessionStorage.getItem('cocina_session') ? 'notas' : 'pin';
  });
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Verdad real de la sesión: la cookie httpOnly, no el indicio local — mismo criterio que
  // CorteCajaLite.tsx.
  useEffect(() => {
    if (!sessionStorage.getItem('cocina_session')) return;
    axios.get(`${API}/pos/cashiers/me`, { withCredentials: true, headers: { 'x-session-scope': 'pos-lite' } })
      .catch(() => {
        sessionStorage.removeItem('cocina_session');
        setSession(null);
        setScreen(estacion ? 'pin' : 'urlInvalida');
      });
  }, []);

  const POS_LITE_AUTH = { withCredentials: true as const, headers: { 'x-session-scope': 'pos-lite' } };

  const handlePin = async (digit: string) => {
    if (digit === 'del') { setPin(p => p.slice(0, -1)); return; }
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length !== 4) return;

    setLoading(true);
    setError('');
    try {
      const loginRes = await axios.post(`${API}/pos/cashiers/nip`, { nip: newPin, tenantId }, { withCredentials: true });
      const cajero = loginRes.data.user?.id;
      const sucursalId = loginRes.data.user?.branchId || null;
      const nueva = { cajero, sucursalId };
      setSession(nueva);
      sessionStorage.setItem('cocina_session', JSON.stringify(nueva));
      setScreen('notas');
    } catch {
      setError('NIP incorrecto');
      setPin('');
    }
    setLoading(false);
  };

  const handleBloquear = async () => {
    await axios.post(`${API}/pos/cashiers/logout`, {}, { withCredentials: true }).catch(() => {});
    sessionStorage.removeItem('cocina_session');
    setSession(null);
    setPin('');
    setError('');
    setScreen('pin');
  };

  const [notas, setNotas] = useState<NotaCocina[]>([]);
  const [marcando, setMarcando] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargarNotas = useCallback(async () => {
    if (!session?.sucursalId || !estacion) return;
    try {
      const res = await axios.get(`${API}/pos/notas-cocina`, {
        ...POS_LITE_AUTH,
        params: { sucursalId: session.sucursalId, estacion },
      });
      setNotas(Array.isArray(res.data) ? res.data : []);
    } catch { /* best-effort: la próxima vuelta de polling reintenta sola */ }
  }, [session?.sucursalId, estacion]);

  useEffect(() => {
    if (screen !== 'notas') return;
    cargarNotas();
    pollRef.current = setInterval(cargarNotas, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [screen, cargarNotas]);

  const marcarPreparado = async (id: string) => {
    setMarcando(prev => new Set(prev).add(id));
    try {
      await axios.put(`${API}/pos/notas-cocina/${id}/preparado`, {}, POS_LITE_AUTH);
      // Optimista: la quita de la lista de inmediato, sin esperar la próxima vuelta de
      // polling — el próximo GET la confirma (ya no viene, PENDIENTE es el único filtro).
      setNotas(prev => prev.filter(n => n.id !== id));
    } catch { /* si falla, sigue apareciendo pendiente en el próximo polling */ }
    setMarcando(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  // Agrupación visual por venta dentro de la estación — un ticket de cocina/barra por
  // orden, no una lista plana de ítems sueltos.
  const porVenta = notas.reduce<Record<string, NotaCocina[]>>((acc, n) => {
    (acc[n.saleId] ||= []).push(n);
    return acc;
  }, {});
  const ventasOrdenadas = Object.entries(porVenta).sort(
    (a, b) => new Date(a[1][0].createdAt).getTime() - new Date(b[1][0].createdAt).getTime(),
  );

  const imprimirComanda = (saleId: string, items: NotaCocina[]) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const hora = new Date(items[0].createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Courier New', monospace; font-size: 14px; padding: 16px; width: 280px; color: #111; }
      .center { text-align: center; }
      .bold { font-weight: 700; }
      .sep { border: none; border-top: 1px dashed #999; margin: 10px 0; }
      .item { padding: 6px 0; display: flex; justify-content: space-between; }
      .footer { font-size: 10px; color: #999; margin-top: 14px; text-align: center; }
    </style></head><body>
    <div class="center bold" style="font-size:16px;">${estacion}</div>
    <div class="center" style="font-size:11px; color:#666;">Venta ${saleId.slice(0, 8)} · ${hora}</div>
    <hr class="sep">
    ${items.map(i => `<div class="item"><span>${i.nombre}</span><span class="bold">x${i.cantidad}</span></div>`).join('')}
    <hr class="sep">
    <div class="footer">ESTIA ERP</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  if (screen === 'urlInvalida') return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 13, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', padding: 24 }}>
        URL incorrecta — falta ?estacion=COCINA o ?estacion=BARRA<br />Contacta a tu administrador
      </div>
    </div>
  );

  const PIN_KEYS = ['1','2','3','4','5','6','7','8','9','','0','del'];

  if (screen === 'pin') return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#ffffff', borderRadius: 20, padding: '32px 32px 40px', boxShadow: '0 4px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 9, letterSpacing: '0.35em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>ESTIA ERP · {estacion}</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#111827', marginBottom: 32 }}>Ingresa tu NIP</div>
        <div style={{ display: 'flex', gap: 20, marginBottom: 36, justifyContent: 'center' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: pin.length > i ? '#1d4ed8' : '#e2e8f0' }} />
          ))}
        </div>
        {error && <div style={{ color: '#dc2626', fontSize: 14, marginBottom: 16, textAlign: 'center', fontWeight: 500 }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {PIN_KEYS.map((k, i) => (
            <button key={i}
              onClick={() => k !== '' && !loading && handlePin(k)}
              style={{ padding: '22px 8px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#111827', fontSize: 28, cursor: 'pointer', opacity: k === '' ? 0 : 1, pointerEvents: k === '' ? 'none' : 'auto' }}>
              {k === 'del' ? '←' : k}
            </button>
          ))}
        </div>
        {loading && <div style={{ color: '#64748b', fontSize: 13, marginTop: 20, textAlign: 'center', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Verificando...</div>}
      </div>
    </div>
  );

  // screen === 'notas'
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#64748b', textTransform: 'uppercase' }}>ESTIA ERP</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ffffff' }}>{estacion}</div>
        </div>
        <button onClick={handleBloquear} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', fontSize: 11, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', letterSpacing: '0.08em' }}>
          BLOQUEAR
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {ventasOrdenadas.length === 0 ? (
          <div style={{ color: '#475569', fontSize: 16, textAlign: 'center', marginTop: 80, letterSpacing: '0.05em' }}>
            Sin pendientes en {estacion}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {ventasOrdenadas.map(([saleId, items]) => (
              <div key={saleId} style={{ background: '#1e293b', borderRadius: 16, padding: 18, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ color: '#94a3b8', fontSize: 12, letterSpacing: '0.05em' }}>
                    Venta {saleId.slice(0, 8)} · {new Date(items[0].createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button onClick={() => imprimirComanda(saleId, items)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#cbd5e1', fontSize: 11, padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}>
                    🖨 Imprimir
                  </button>
                </div>
                {items.map(n => (
                  <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <div style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 600 }}>{n.nombre}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>Cantidad: {n.cantidad}</div>
                    </div>
                    <button
                      disabled={marcando.has(n.id)}
                      onClick={() => marcarPreparado(n.id)}
                      style={{ padding: '16px 20px', borderRadius: 12, border: 'none', background: marcando.has(n.id) ? '#166534' : '#16a34a', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.03em', textTransform: 'uppercase' as const }}>
                      {marcando.has(n.id) ? '...' : '✓ Preparado'}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
