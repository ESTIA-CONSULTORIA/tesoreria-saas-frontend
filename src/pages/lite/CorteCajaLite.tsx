import { useState, useEffect } from 'react';
import axios from 'axios';

const API = (import.meta.env.VITE_API_URL as string) ||
  'https://tesoreria-saas-backend-production.up.railway.app';

interface Totales {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  cortesia: number;
  descuento: number;
}

type Screen = 'empresa' | 'pin' | 'corte' | 'confirmacion';

const FIELD_ORDER: (keyof Totales)[] = ['efectivo', 'tarjeta', 'transferencia', 'cortesia', 'descuento'];

const FIELDS: { key: keyof Totales; label: string; resta?: boolean }[] = [
  { key: 'efectivo',      label: 'Efectivo' },
  { key: 'tarjeta',       label: 'Tarjeta' },
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'cortesia',      label: 'Cortesías',  resta: true },
  { key: 'descuento',     label: 'Descuentos', resta: true },
];

export default function CorteCajaLite() {
  const [tenantId] = useState<string>(() => {
    const qp = new URLSearchParams(window.location.search).get('tenant');
    const resolved = qp ||
      (import.meta.env.VITE_EXECUTIVE_TENANT_ID as string) ||
      localStorage.getItem('exec_tenant_id') ||
      localStorage.getItem('tenant_id') || '';
    if (resolved) localStorage.setItem('exec_tenant_id', resolved);
    return resolved;
  });

  const [screen, setScreen] = useState<Screen>('empresa');
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [token, setToken] = useState('');
  const [shift, setShift] = useState<any>(null);
  const [totales, setTotales] = useState<Totales>({ efectivo: 0, tarjeta: 0, transferencia: 0, cortesia: 0, descuento: 0 });
  const [activeField, setActiveField] = useState<keyof Totales | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = totales.efectivo + totales.tarjeta + totales.transferencia - totales.cortesia - totales.descuento;

  useEffect(() => {
    if (!tenantId) return;
    axios.get(`${API}/companies/tenant/${tenantId}`)
      .then(r => setCompanies(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [tenantId]);

  useEffect(() => {
    if (screen !== 'corte') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (!activeField) setActiveField(FIELD_ORDER[0]);
        handleMonto(e.key);
      } else if (e.key === '.') {
        handleMonto('.');
      } else if (e.key === 'Backspace') {
        handleMonto('del');
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (activeField) confirmMonto();
      } else if (e.key === 'Escape') {
        setActiveField(null);
        setInputValue('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, activeField, inputValue]);

  const handlePin = async (digit: string) => {
    if (digit === 'del') { setPin(p => p.slice(0, -1)); return; }
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      setLoading(true);
      setError('');
      try {
        const res = await axios.post(`${API}/pos/cashiers/nip`, {
          nip: newPin,
          companyId: selectedCompany.id,
          tenantId,
        });
        setToken(res.data.access_token);
        let currentShift = null;
        try {
          const shiftRes = await axios.get(`${API}/pos/shifts/open`, {
            params: { cajero: res.data.user?.id, sucursalId: selectedCompany.branchId || selectedCompany.id },
            headers: { Authorization: `Bearer ${res.data.access_token}` },
          });
          if (shiftRes.data) {
            currentShift = shiftRes.data;
            if (shiftRes.data.precorteDeclaracion) {
              const d = shiftRes.data.precorteDeclaracion;
              setTotales({ efectivo: d.efectivo || 0, tarjeta: d.tarjeta || 0, transferencia: d.transferencia || 0, cortesia: d.cortesia || 0, descuento: d.descuento || 0 });
            }
          }
        } catch (e: any) {
          if (!e?.response?.status || e.response.status === 404 || e.response.status === 400) {
            const openRes = await axios.post(`${API}/pos/shifts`, {
              cajero: res.data.user?.id,
              sucursalId: selectedCompany.branchId || selectedCompany.id,
              tenantId,
              fondoInicial: 0,
            }, { headers: { Authorization: `Bearer ${res.data.access_token}` } });
            currentShift = openRes.data;
          } else throw e;
        }
        setShift(currentShift);
        setScreen('corte');
      } catch {
        setError('PIN incorrecto');
        setPin('');
      }
      setLoading(false);
    }
  };

  const handleMonto = (digit: string) => {
    if (!activeField) return;
    if (digit === 'del') { setInputValue(v => v.slice(0, -1)); return; }
    if (digit === '.' && inputValue.includes('.')) return;
    setInputValue(v => v + digit);
  };

  const confirmMonto = () => {
    if (!activeField) return;
    const val = parseFloat(inputValue) || 0;
    setTotales(t => ({ ...t, [activeField]: val }));
    const idx = FIELD_ORDER.indexOf(activeField);
    if (idx < FIELD_ORDER.length - 1) {
      setActiveField(FIELD_ORDER[idx + 1]);
      setInputValue('');
    } else {
      setActiveField(null);
      setInputValue('');
    }
  };

  const guardarCorte = async () => {
    console.log('[guardar] shift:', shift, 'token:', !!token);
    if (!shift || !token) {
      console.log('[guardar] bloqueado — shift o token vacío');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/pos/shifts/${shift.id}/precut`, {
        efectivoContado: totales.efectivo,
        declaracion: totales,
      }, { headers: { Authorization: `Bearer ${token}` } });
      await axios.put(`${API}/pos/shifts/${shift.id}/close`, {
        efectivoContado: totales.efectivo,
        notas: `Tarjeta: $${totales.tarjeta} / Transferencia: $${totales.transferencia} / Cortesías: $${totales.cortesia} / Descuentos: $${totales.descuento}`,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setScreen('confirmacion');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al guardar');
    }
    setLoading(false);
  };

  const sendWhatsApp = () => {
    const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const msg = encodeURIComponent(
      `CORTE DEL DÍA — ${selectedCompany?.tradeName || selectedCompany?.legalName}\n` +
      `${fecha} · ${hora}\n\n` +
      `Efectivo        $${totales.efectivo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `Tarjeta         $${totales.tarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `Transferencia   $${totales.transferencia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `Cortesías      -$${totales.cortesia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `Descuentos     -$${totales.descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n\n` +
      `TOTAL           $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n\n` +
      `ESTIA ERP`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const imprimir = () => {
    const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Courier New', monospace; font-size: 13px; padding: 24px; max-width: 320px; color: #111; }
      .center { text-align: center; }
      .bold { font-weight: 700; }
      .sep { border: none; border-top: 1px dashed #999; margin: 12px 0; }
      .row { display: flex; justify-content: space-between; padding: 4px 0; }
      .total { font-size: 16px; font-weight: 700; }
      .footer { font-size: 10px; color: #999; margin-top: 16px; text-align: center; letter-spacing: 0.1em; }
    </style></head><body>
    <div class="center bold" style="font-size:15px; letter-spacing:0.05em;">${selectedCompany?.tradeName || selectedCompany?.legalName}</div>
    <div class="center" style="font-size:11px; margin-top:4px; color:#666;">CORTE DEL DÍA</div>
    <div class="center" style="font-size:11px; color:#666;">${fecha} · ${hora}</div>
    <hr class="sep">
    <div class="row"><span>Efectivo</span><span>$${totales.efectivo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
    <div class="row"><span>Tarjeta</span><span>$${totales.tarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
    <div class="row"><span>Transferencia</span><span>$${totales.transferencia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
    <div class="row"><span>Cortesías</span><span>-$${totales.cortesia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
    <div class="row"><span>Descuentos</span><span>-$${totales.descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
    <hr class="sep">
    <div class="row total"><span>TOTAL</span><span>$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
    <div class="footer">ESTIA ERP · Sistema de gestión empresarial</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  if (!tenantId) return (
    <div style={{ position: 'fixed', inset: 0, background: '#080a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>URL incorrecta · Contacta a tu administrador</div>
    </div>
  );

  const PIN_KEYS = ['1','2','3','4','5','6','7','8','9','','0','del'];

  const shared = {
    outer: { position: 'fixed' as const, inset: 0, background: '#050709', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    wrap: { width: '100%', maxWidth: 420, height: '100%', maxHeight: 860, background: '#080a0f', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', borderRadius: window.innerWidth > 500 ? 20 : 0 },
    header: { padding: '28px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 },
    logo: { fontSize: 9, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' as const, marginBottom: 6 },
    title: { fontSize: 20, fontWeight: 300, color: '#e8ecf0', letterSpacing: '-0.02em' },
    content: { flex: 1, overflowY: 'auto' as const, overflowX: 'hidden' as const, padding: '24px 28px' },
    numBtn: { padding: '16px 8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', color: '#c8d0d8', fontSize: 20, fontWeight: 300, cursor: 'pointer', textAlign: 'center' as const },
    btnWhatsApp: { width: '100%', padding: 16, borderRadius: 12, border: 'none', background: '#128C7E', color: '#fff', fontSize: 15, fontWeight: 400, cursor: 'pointer', letterSpacing: '0.02em' },
    btnSecondary: { width: '100%', padding: 15, borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer' },
  };

  return (
    <>
      {/* PANTALLA: Empresa */}
      {screen === 'empresa' && (
        <div style={shared.outer}>
          <div style={shared.wrap}>
            <div style={shared.header}>
              <div style={shared.logo}>ESTIA ERP</div>
              <div style={shared.title}>¿Cuál es tu sucursal?</div>
            </div>
            <div style={shared.content}>
              {companies.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', marginTop: 60, letterSpacing: '0.05em' }}>Cargando...</div>
              ) : companies.map((c: any) => (
                <button key={c.id}
                  onClick={() => { setSelectedCompany(c); setPin(''); setError(''); setScreen('pin'); }}
                  style={{ width: '100%', padding: '22px 28px', marginBottom: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)', borderRadius: 14, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: 17, fontWeight: 300, color: '#e8ecf0', marginBottom: 4, letterSpacing: '-0.01em' }}>
                    {c.tradeName || c.legalName}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Seleccionar
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PANTALLA: PIN */}
      {screen === 'pin' && (
        <div style={shared.outer}>
          <div style={shared.wrap}>
            <div style={shared.header}>
              <div style={shared.logo}>ESTIA ERP</div>
              <div style={shared.title}>{selectedCompany?.tradeName || selectedCompany?.legalName}</div>
            </div>
            <div style={{ ...shared.content, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 36 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginBottom: 32, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Ingresa tu acceso</div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 44 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: pin.length > i ? '#e8ecf0' : 'rgba(255,255,255,0.08)', transition: 'all 0.2s', boxShadow: pin.length > i ? '0 0 10px rgba(232,236,240,0.3)' : 'none' }} />
                ))}
              </div>
              {error && <div style={{ color: 'rgba(252,165,165,0.8)', fontSize: 13, marginBottom: 20, letterSpacing: '0.02em' }}>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%', maxWidth: 280 }}>
                {PIN_KEYS.map((k, i) => (
                  <button key={i} style={{ ...shared.numBtn, opacity: k === '' ? 0 : 1, pointerEvents: k === '' ? 'none' : 'auto' }}
                    onClick={() => k !== '' && !loading && handlePin(k)}>
                    {k === 'del' ? '←' : k}
                  </button>
                ))}
              </div>
              {loading && <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, marginTop: 24, letterSpacing: '0.06em' }}>Verificando...</div>}
              <button onClick={() => { setScreen('empresa'); setPin(''); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.15)', fontSize: 12, cursor: 'pointer', marginTop: 36, letterSpacing: '0.05em' }}>
                Cambiar sucursal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANTALLA: Corte — teclado inline bajo campo activo */}
      {screen === 'corte' && (
        <div style={{ position: 'fixed', inset: 0, background: '#080a0f', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', marginBottom: 4 }}>ESTIA ERP</div>
            <div style={{ fontSize: 17, fontWeight: 300, color: '#e8ecf0' }}>
              {selectedCompany?.tradeName || selectedCompany?.legalName}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 2 }}>
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>

          {/* Campos + teclado inline — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 20px 24px' }}>
            {FIELDS.map(f => (
              <div key={f.key}>
                {/* Fila del campo */}
                <div onClick={() => { setActiveField(f.key); setInputValue(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '13px 14px',
                    marginBottom: activeField === f.key ? 0 : 6,
                    borderRadius: activeField === f.key ? '10px 10px 0 0' : 10,
                    cursor: 'pointer',
                    background: activeField === f.key ? 'rgba(143,175,212,0.06)' : 'rgba(255,255,255,0.015)',
                    border: `1px solid ${activeField === f.key ? 'rgba(143,175,212,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    borderBottom: activeField === f.key ? 'none' : undefined,
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 14, fontWeight: 300, color: activeField === f.key ? '#c8d8e8' : 'rgba(255,255,255,0.35)', letterSpacing: '0.02em' }}>
                    {f.label}
                  </span>
                  <span style={{
                    fontSize: 18, fontWeight: 400, letterSpacing: '-0.02em',
                    color: activeField === f.key
                      ? '#8fafd4'
                      : f.resta && totales[f.key] > 0
                      ? 'rgba(252,165,165,0.6)'
                      : totales[f.key] > 0 ? '#e8ecf0' : 'rgba(255,255,255,0.15)',
                  }}>
                    {activeField === f.key
                      ? (inputValue ? `$${inputValue}` : '$·')
                      : `${f.resta && totales[f.key] > 0 ? '-' : ''}$${totales[f.key].toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                    }
                  </span>
                </div>

                {/* Teclado inline — aparece justo debajo del campo activo */}
                {activeField === f.key && (
                  <div style={{
                    background: 'rgba(143,175,212,0.03)',
                    border: '1px solid rgba(143,175,212,0.2)',
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    padding: '10px 10px 12px',
                    marginBottom: 6,
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
                      {['1','2','3','4','5','6','7','8','9','.','0','←'].map((k, i) => (
                        <button key={i}
                          onClick={() => k === '←' ? handleMonto('del') : handleMonto(k)}
                          style={{
                            padding: '13px 6px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.06)',
                            background: k === '←' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
                            color: k === '←' ? 'rgba(255,255,255,0.3)' : '#c8d0d8',
                            fontSize: k === '←' ? 15 : 18, fontWeight: 300, cursor: 'pointer',
                          }}>
                          {k}
                        </button>
                      ))}
                    </div>
                    <button onClick={confirmMonto} style={{
                      width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                      background: 'rgba(143,175,212,0.08)', color: '#8fafd4',
                      fontSize: 13, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                    }}>
                      {FIELD_ORDER.indexOf(f.key) < FIELD_ORDER.length - 1 ? 'Siguiente' : 'Listo'}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 14px 0', marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Total del día</span>
              <span style={{ fontSize: 24, fontWeight: 300, color: '#4ade80', letterSpacing: '-0.03em' }}>
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Guardar corte — aparece al terminar todos los campos */}
            {!activeField && (
              <div style={{ paddingTop: 16 }}>
                {error && <div style={{ color: 'rgba(252,165,165,0.6)', fontSize: 12, textAlign: 'center', marginBottom: 10, letterSpacing: '0.02em' }}>{error}</div>}
                <button onClick={guardarCorte} disabled={loading} style={{
                  width: '100%', padding: '17px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #1a3a2a, #1e4530)',
                  color: '#4ade80', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                  boxShadow: '0 4px 20px rgba(74,222,128,0.08)',
                }}>
                  {loading ? 'Guardando...' : 'Guardar corte'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANTALLA: Confirmación */}
      {screen === 'confirmacion' && (
        <div style={shared.outer}>
          <div style={shared.wrap}>
            <div style={shared.header}>
              <div style={shared.logo}>ESTIA ERP</div>
              <div style={shared.title}>Corte registrado</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 2, letterSpacing: '0.03em' }}>
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
            <div style={shared.content}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>
                  {selectedCompany?.tradeName || selectedCompany?.legalName}
                </div>
                {FIELDS.map(f => (
                  <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: '-0.01em' }}>{f.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 400, color: f.resta ? 'rgba(252,165,165,0.7)' : '#c8d0d8' }}>
                      {f.resta && totales[f.key] > 0 ? '-' : ''}${totales[f.key].toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Total</span>
                  <span style={{ fontSize: 24, fontWeight: 300, color: '#4ade80', letterSpacing: '-0.03em' }}>
                    ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button style={shared.btnWhatsApp} onClick={sendWhatsApp}>Enviar por WhatsApp</button>
              <div style={{ height: 10 }} />
              <button style={shared.btnSecondary} onClick={imprimir}>Imprimir ticket</button>
              <div style={{ height: 10 }} />
              <button onClick={() => { setScreen('empresa'); setPin(''); setTotales({ efectivo: 0, tarjeta: 0, transferencia: 0, cortesia: 0, descuento: 0 }); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.15)', fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'center', padding: '16px 0', letterSpacing: '0.05em' }}>
                Nuevo corte
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
