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
  const [totales, setTotales] = useState<Totales>({
    efectivo: 0, tarjeta: 0, transferencia: 0, cortesia: 0, descuento: 0,
  });
  const [activeField, setActiveField] = useState<keyof Totales | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedShift, setSavedShift] = useState<any>(null);

  useEffect(() => {
    if (!tenantId) return;
    axios.get(`${API}/companies/tenant/${tenantId}`)
      .then(r => setCompanies(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [tenantId]);

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
        const shiftRes = await axios.get(`${API}/shifts/open`, {
          headers: {
            Authorization: `Bearer ${res.data.access_token}`,
            'x-company-id': selectedCompany.id,
          },
        });
        if (shiftRes.data) {
          setShift(shiftRes.data);
          if (shiftRes.data.precorteDeclaracion) {
            const d = shiftRes.data.precorteDeclaracion;
            setTotales({
              efectivo: d.efectivo || 0,
              tarjeta: d.tarjeta || 0,
              transferencia: d.transferencia || 0,
              cortesia: d.cortesia || 0,
              descuento: d.descuento || 0,
            });
          }
        } else {
          const openRes = await axios.post(`${API}/shifts`, {
            cajero: res.data.user?.id,
            sucursalId: selectedCompany.branchId || selectedCompany.id,
            tenantId,
            fondoInicial: 0,
          }, { headers: { Authorization: `Bearer ${res.data.access_token}` } });
          setShift(openRes.data);
        }
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
    setTotales(t => ({ ...t, [activeField]: parseFloat(inputValue) || 0 }));
    setActiveField(null);
    setInputValue('');
  };

  const total = totales.efectivo + totales.tarjeta + totales.transferencia
    - totales.cortesia - totales.descuento;

  const guardarCorte = async () => {
    if (!shift || !token) return;
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/shifts/${shift.id}/precut`, {
        efectivoContado: totales.efectivo,
        declaracion: totales,
      }, { headers: { Authorization: `Bearer ${token}` } });
      const closeRes = await axios.put(`${API}/shifts/${shift.id}/close`, {
        efectivoContado: totales.efectivo,
        notas: `Corte manual: Tarjeta $${totales.tarjeta}, Transferencia $${totales.transferencia}, Cortesías $${totales.cortesia}, Descuentos $${totales.descuento}`,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSavedShift(closeRes.data);
      setScreen('confirmacion');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al guardar el corte');
    }
    setLoading(false);
  };

  const sendWhatsApp = () => {
    const fecha = new Date().toLocaleDateString('es-MX');
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const msg = encodeURIComponent(
      `📊 *CORTE DEL DÍA — ${selectedCompany?.tradeName || selectedCompany?.legalName}*\n` +
      `📅 ${fecha} · ${hora}\n\n` +
      `💵 Efectivo: $${totales.efectivo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `💳 Tarjeta: $${totales.tarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `📱 Transferencia: $${totales.transferencia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `🎁 Cortesías: -$${totales.cortesia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `🏷️ Descuentos: -$${totales.descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n\n` +
      `✅ *TOTAL: $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}*\n\n` +
      `_Enviado desde ESTIA ERP_`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const imprimir = () => {
    const fecha = new Date().toLocaleDateString('es-MX');
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body { font-family: monospace; font-size: 14px; padding: 20px; max-width: 300px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; padding: 2px 0; }
        .total { font-size: 16px; font-weight: bold; }
      </style></head><body>
      <div class="center bold">${selectedCompany?.tradeName || selectedCompany?.legalName || 'Empresa'}</div>
      <div class="center">CORTE DEL DÍA</div>
      <div class="center">${fecha} · ${hora}</div>
      <div class="line"></div>
      <div class="row"><span>💵 Efectivo</span><span>$${totales.efectivo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
      <div class="row"><span>💳 Tarjeta</span><span>$${totales.tarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
      <div class="row"><span>📱 Transferencia</span><span>$${totales.transferencia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
      <div class="row"><span>🎁 Cortesías</span><span>-$${totales.cortesia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
      <div class="row"><span>🏷️ Descuentos</span><span>-$${totales.descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
      <div class="line"></div>
      <div class="row total"><span>TOTAL</span><span>$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
      <div class="line"></div>
      <div class="center" style="font-size:11px; margin-top:8px;">ESTIA ERP · Sistema de gestión empresarial</div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  if (!tenantId) return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0c12', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
      URL incorrecta. Contacta a tu administrador.
    </div>
  );

  const isDesktop = window.innerWidth > 768;

  const s = {
    outer: {
      position: 'fixed' as const, inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#050709',
    },
    container: {
      width: '100%',
      maxWidth: 480,
      height: '100%',
      maxHeight: 900,
      background: '#0a0c12',
      display: 'flex', flexDirection: 'column' as const,
      overflow: 'hidden', boxSizing: 'border-box' as const,
      fontFamily: "'Inter', -apple-system, sans-serif",
      borderRadius: isDesktop ? 20 : 0,
      boxShadow: isDesktop ? '0 25px 60px rgba(0,0,0,0.5)' : 'none',
    },
    header: {
      padding: '16px 20px 12px',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      flexShrink: 0 as const,
    },
    logo: { fontSize: 12, fontWeight: 600, letterSpacing: '0.15em', color: 'rgba(143,175,212,0.6)' } as const,
    title: { fontSize: 18, fontWeight: 400, color: '#c8cdd8', marginTop: 4 } as const,
    content: { flex: 1, overflowY: 'auto' as const, overflowX: 'hidden' as const, padding: '16px 20px' },
    empBtn: {
      width: '100%', padding: '16px', borderRadius: 12, marginBottom: 10,
      border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
      color: '#c8cdd8', fontSize: 16, cursor: 'pointer', textAlign: 'left' as const,
      display: 'flex', alignItems: 'center', gap: 12,
    },
    numBtn: {
      padding: '16px 10px', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.04)',
      color: '#c8cdd8', fontSize: 22, fontWeight: 300, cursor: 'pointer', textAlign: 'center' as const,
    },
    fieldRow: {
      display: 'flex', alignItems: 'center', padding: '14px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
    },
    btnGreen: {
      width: '100%', padding: 16, borderRadius: 12, border: 'none',
      background: '#1a5c3a', color: '#4ade80', fontSize: 17, fontWeight: 500, cursor: 'pointer',
    } as const,
    btnWhatsApp: {
      width: '100%', padding: 15, borderRadius: 12, border: 'none',
      background: '#25D366', color: '#fff', fontSize: 16, fontWeight: 500, cursor: 'pointer',
    } as const,
    btnPrint: {
      width: '100%', padding: 14, borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
      color: 'rgba(255,255,255,0.5)', fontSize: 15, cursor: 'pointer',
    } as const,
  };

  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
  const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  const FIELDS: { key: keyof Totales; label: string; icon: string; resta?: boolean }[] = [
    { key: 'efectivo', label: 'Efectivo', icon: '💵' },
    { key: 'tarjeta', label: 'Tarjeta', icon: '💳' },
    { key: 'transferencia', label: 'Transferencia', icon: '📱' },
    { key: 'cortesia', label: 'Cortesías', icon: '🎁', resta: true },
    { key: 'descuento', label: 'Descuentos', icon: '🏷️', resta: true },
  ];

  // suppress unused warning — savedShift used for future extensibility
  void savedShift;

  return (
    <div style={s.outer}>
    <div style={s.container}>

      {/* ── EMPRESA ── */}
      {screen === 'empresa' && (
        <>
          <div style={s.header}>
            <div style={s.logo}>ESTIA ERP</div>
            <div style={s.title}>¿En cuál restaurante trabajas hoy?</div>
          </div>
          <div style={s.content}>
            {companies.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                Cargando empresas...
              </div>
            )}
            {companies.map((c: any) => (
              <button key={c.id} style={s.empBtn}
                onClick={() => { setSelectedCompany(c); setScreen('pin'); }}>
                <span style={{ fontSize: 24 }}>🍽️</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{c.tradeName || c.legalName}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Toca para seleccionar</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── PIN ── */}
      {screen === 'pin' && (
        <>
          <div style={s.header}>
            <div style={s.logo}>ESTIA ERP</div>
            <div style={s.title}>{selectedCompany?.tradeName || selectedCompany?.legalName}</div>
          </div>
          <div style={{ ...s.content, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Ingresa tu PIN de acceso</div>
            <div style={{ display: 'flex', gap: 14, marginBottom: 32 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.2)',
                  background: pin.length > i ? '#8fafd4' : 'transparent',
                }} />
              ))}
            </div>
            {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%', maxWidth: 280 }}>
              {PIN_KEYS.map((k, i) => (
                <button key={i} style={{ ...s.numBtn, opacity: k === '' ? 0 : 1 }}
                  onClick={() => k !== '' && handlePin(k)}>
                  {k === 'del' ? '⌫' : k}
                </button>
              ))}
            </div>
            {loading && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 16 }}>Validando...</div>}
            <button onClick={() => { setScreen('empresa'); setPin(''); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', fontSize: 12, cursor: 'pointer', marginTop: 24 }}>
              ← Cambiar restaurante
            </button>
          </div>
        </>
      )}

      {/* ── CORTE ── */}
      {screen === 'corte' && (
        <>
          <div style={s.header}>
            <div style={s.logo}>ESTIA ERP</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#c8cdd8', marginTop: 2 }}>
              {selectedCompany?.tradeName || selectedCompany?.legalName}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={s.content}>
            {FIELDS.map(f => (
              <div key={f.key} style={s.fieldRow}
                onClick={() => { setActiveField(f.key); setInputValue(totales[f.key].toString()); }}>
                <span style={{ fontSize: 22, width: 36, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ flex: 1, fontSize: 16, color: '#c8cdd8' }}>{f.label}</span>
                <span style={{
                  fontSize: 20, fontWeight: 500,
                  color: activeField === f.key ? '#8fafd4' : '#fff',
                  background: activeField === f.key ? 'rgba(123,156,204,0.1)' : 'rgba(255,255,255,0.05)',
                  padding: '6px 12px', borderRadius: 8, minWidth: 100, textAlign: 'right',
                }}>
                  {f.resta ? '-' : ''}${totales[f.key].toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4 }}>
              <span style={{ fontSize: 17, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>TOTAL DEL DÍA</span>
              <span style={{ fontSize: 26, fontWeight: 500, color: '#4ade80' }}>
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {activeField && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 24, fontWeight: 300, color: '#8fafd4', textAlign: 'right', marginBottom: 10, padding: '4px 8px' }}>
                  ${inputValue || '0'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {KEYS.map((k, i) => (
                    <button key={i} style={{ ...s.numBtn, fontSize: 18, padding: '12px 8px' }}
                      onClick={() => handleMonto(k)}>
                      {k === 'del' ? '⌫' : k}
                    </button>
                  ))}
                </div>
                <button onClick={confirmMonto}
                  style={{ width: '100%', marginTop: 8, padding: 12, borderRadius: 10, border: 'none', background: 'rgba(123,156,204,0.2)', color: '#8fafd4', fontSize: 15, cursor: 'pointer' }}>
                  ✓ Confirmar
                </button>
              </div>
            )}

            {error && <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{error}</div>}
            <button style={s.btnGreen} onClick={guardarCorte} disabled={loading}>
              {loading ? 'Guardando...' : '✓ GUARDAR CORTE'}
            </button>
          </div>
        </>
      )}

      {/* ── CONFIRMACIÓN ── */}
      {screen === 'confirmacion' && (
        <>
          <div style={s.header}>
            <div style={s.logo}>ESTIA ERP</div>
          </div>
          <div style={s.content}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: '#4ade80' }}>¡Corte guardado!</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', color: '#111', marginBottom: 16 }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #ccc', paddingBottom: 10, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedCompany?.tradeName || selectedCompany?.legalName}</div>
                <div style={{ fontSize: 11, color: '#666' }}>CORTE DEL DÍA · {new Date().toLocaleDateString('es-MX')}</div>
              </div>
              {FIELDS.map(f => (
                <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                  <span>{f.icon} {f.label}</span>
                  <span>{f.resta ? '-' : ''}${totales[f.key].toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, borderTop: '1px solid #ccc', marginTop: 8, paddingTop: 8 }}>
                <span>TOTAL</span>
                <span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#999', marginTop: 10, borderTop: '1px dashed #ccc', paddingTop: 8 }}>
                ESTIA ERP · Sistema de gestión empresarial
              </div>
            </div>

            <button style={s.btnWhatsApp} onClick={sendWhatsApp}>📲 Enviar por WhatsApp</button>
            <div style={{ height: 10 }} />
            <button style={s.btnPrint} onClick={imprimir}>🖨️ Imprimir ticket</button>
            <div style={{ height: 10 }} />
            <button onClick={() => {
              setScreen('empresa'); setPin(''); setSavedShift(null);
              setTotales({ efectivo: 0, tarjeta: 0, transferencia: 0, cortesia: 0, descuento: 0 });
            }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'center', padding: '12px 0' }}>
              ← Nuevo corte
            </button>
          </div>
        </>
      )}
    </div>
    </div>
  );
}
