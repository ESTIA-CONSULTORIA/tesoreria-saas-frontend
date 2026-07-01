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
  gasto: number;
}

type Screen = 'empresa' | 'pin' | 'corte' | 'confirmacion';

const FIELD_ORDER: (keyof Totales)[] = ['efectivo', 'tarjeta', 'transferencia', 'cortesia', 'descuento', 'gasto'];

const FIELDS: { key: keyof Totales; label: string; resta?: boolean }[] = [
  { key: 'efectivo',      label: 'Efectivo' },
  { key: 'tarjeta',       label: 'Tarjeta' },
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'cortesia',      label: 'Cortesías',  resta: true },
  { key: 'descuento',     label: 'Descuentos', resta: true },
  { key: 'gasto',         label: 'Gastos',     resta: true },
];

export default function CorteCajaLite() {
  const [tenantId, setTenantId] = useState<string>(() => {
    const qp = new URLSearchParams(window.location.search).get('tenant');
    const resolved = qp ||
      (import.meta.env.VITE_EXECUTIVE_TENANT_ID as string) ||
      localStorage.getItem('exec_tenant_id') || '';
    if (resolved) localStorage.setItem('exec_tenant_id', resolved);
    return resolved;
  });

  useEffect(() => {
    const isUUID = /^[0-9a-f-]{36}$/.test(tenantId);
    if (!isUUID && tenantId) {
      axios.get(`${API}/tenants/resolve/${encodeURIComponent(tenantId)}`)
        .then(r => {
          if (r.data?.id) {
            setTenantId(r.data.id);
            localStorage.setItem('exec_tenant_id', r.data.id);
          }
        }).catch(() => {});
    }
  }, []);

  const [token, setToken] = useState<string>(() => sessionStorage.getItem('lite_token') || '');
  const [shift, setShift] = useState<any>(() => {
    const s = sessionStorage.getItem('lite_shift');
    return s ? JSON.parse(s) : null;
  });
  const [screen, setScreen] = useState<Screen>(() => {
    const hasSession = sessionStorage.getItem('lite_token') && sessionStorage.getItem('lite_shift');
    return hasSession ? 'corte' : 'empresa';
  });
  const [selectedCompany, setSelectedCompany] = useState<any>(() => {
    const s = sessionStorage.getItem('lite_company');
    return s ? JSON.parse(s) : null;
  });

  const [companies, setCompanies] = useState<any[]>([]);
  const [pin, setPin] = useState('');
  const [totales, setTotales] = useState<Totales>({ efectivo: 0, tarjeta: 0, transferencia: 0, cortesia: 0, descuento: 0, gasto: 0 });
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
        let currentShift = null;
        try {
          const shiftRes = await axios.get(`${API}/pos/shifts/open`, {
            params: { cajero: res.data.user?.id, sucursalId: selectedCompany.branchId || selectedCompany.id },
            headers: { Authorization: `Bearer ${res.data.access_token}` },
          });
          const shiftData = shiftRes.data;
          if (shiftData && typeof shiftData === 'object' && shiftData.id) {
            currentShift = shiftData;
            sessionStorage.setItem('lite_shift', JSON.stringify(shiftData));
            sessionStorage.setItem('lite_token', res.data.access_token);
            if (shiftData.precorteDeclaracion) {
              const d = shiftData.precorteDeclaracion;
              setTotales({ efectivo: d.efectivo || 0, tarjeta: d.tarjeta || 0, transferencia: d.transferencia || 0, cortesia: d.cortesia || 0, descuento: d.descuento || 0, gasto: d.gasto || 0 });
            }
          } else {
            throw new Error('no_shift');
          }
        } catch {
          try {
            const openRes = await axios.post(`${API}/pos/shifts`, {
              cajero: res.data.user?.id,
              sucursalId: selectedCompany.branchId || selectedCompany.id,
              tenantId,
              fondoInicial: 0,
            }, { headers: { Authorization: `Bearer ${res.data.access_token}` } });
            currentShift = openRes.data;
            sessionStorage.setItem('lite_shift', JSON.stringify(openRes.data));
            sessionStorage.setItem('lite_token', res.data.access_token);
          } catch (e2: any) {
            const msg = e2?.response?.data?.message || e2?.message || 'Error desconocido';
            setError(`Error al abrir turno: ${msg}`);
            setPin('');
            setLoading(false);
            return;
          }
        }
        setShift(currentShift);
        setToken(res.data.access_token);
        sessionStorage.setItem('lite_token', res.data.access_token);
        sessionStorage.setItem('lite_shift', JSON.stringify(currentShift));
        sessionStorage.setItem('lite_company', JSON.stringify(selectedCompany));
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
    if (!shift || !token) {
      setError('Error: sesión inválida. Vuelve a ingresar tu PIN.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/pos/shifts/${shift.id}/precut`, {
        efectivoContado: totales.efectivo,
        debitoDeclarado: totales.tarjeta,
        transferenciaDeclarada: totales.transferencia,
        valesDeclarados: totales.cortesia,
      }, { headers: { Authorization: `Bearer ${token}` } });
      await axios.put(`${API}/pos/shifts/${shift.id}/close`, {
        efectivoContado: totales.efectivo,
        notas: `Tarjeta: $${totales.tarjeta} / Transferencia: $${totales.transferencia} / Cortesías: $${totales.cortesia} / Descuentos: $${totales.descuento} / Gastos: $${totales.gasto}`,
      }, { headers: { Authorization: `Bearer ${token}` } });
      sessionStorage.removeItem('lite_token');
      sessionStorage.removeItem('lite_shift');
      sessionStorage.removeItem('lite_company');
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
      `Descuentos     -$${totales.descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `Gastos         -$${totales.gasto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n\n` +
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
    outer: { position: 'fixed' as const, inset: 0, background: 'radial-gradient(ellipse at 30% 20%, #0d1520 0%, #050709 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    wrap: { width: '100%', maxWidth: 420, height: '100%', maxHeight: 860, background: '#080a0f', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', borderRadius: window.innerWidth > 500 ? 20 : 0 },
    header: { padding: '32px 32px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 },
    logo: { fontSize: 9, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' as const, marginBottom: 8 },
    title: { fontSize: 20, fontWeight: 200, color: '#e8ecf0', letterSpacing: '0.02em' },
    content: { flex: 1, overflowY: 'auto' as const, overflowX: 'hidden' as const, padding: '32px' },
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
                <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12, textAlign: 'center', marginTop: 60, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cargando...</div>
              ) : companies.map((c: any) => (
                <button key={c.id}
                  onClick={() => { setSelectedCompany(c); setPin(''); setError(''); setScreen('pin'); }}
                  style={{ width: '100%', padding: '24px 28px', marginBottom: 10, border: 'none', borderLeft: '2px solid rgba(143,175,212,0.4)', background: 'rgba(143,175,212,0.04)', borderRadius: '0 12px 12px 0', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 20, fontWeight: 200, color: '#e8ecf0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {c.tradeName || c.legalName}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(143,175,212,0.4)', marginTop: 6, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                    Acceder →
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
            <div style={{ ...shared.content, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', marginBottom: 36, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Ingresa tu acceso</div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 48 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: pin.length > i ? '#e8ecf0' : 'rgba(255,255,255,0.08)', transition: 'all 0.2s', boxShadow: pin.length > i ? '0 0 10px rgba(232,236,240,0.3)' : 'none' }} />
                ))}
              </div>
              {error && <div style={{ color: 'rgba(252,165,165,0.7)', fontSize: 12, marginBottom: 20, letterSpacing: '0.04em' }}>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, width: '100%', maxWidth: 300 }}>
                {PIN_KEYS.map((k, i) => (
                  <button key={i}
                    style={{ padding: '20px 8px', borderRadius: 12, border: 'none', background: 'transparent', color: '#c8d0d8', fontSize: 26, fontWeight: 200, cursor: 'pointer', letterSpacing: '-0.02em', opacity: k === '' ? 0 : 1, pointerEvents: k === '' ? 'none' : 'auto' }}
                    onClick={() => k !== '' && !loading && handlePin(k)}>
                    {k === 'del' ? '←' : k}
                  </button>
                ))}
              </div>
              {loading && <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, marginTop: 24, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Verificando...</div>}
              <button onClick={() => { setScreen('empresa'); setPin(''); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.12)', fontSize: 11, cursor: 'pointer', marginTop: 40, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Cambiar sucursal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANTALLA: Corte */}
      {screen === 'corte' && (
        <div style={{ position: 'fixed', inset: 0, background: '#080a0f', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', marginBottom: 4 }}>ESTIA ERP</div>
            <div style={{ fontSize: 17, fontWeight: 200, color: '#e8ecf0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {selectedCompany?.tradeName || selectedCompany?.legalName}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 3 }}>
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>

          {/* Campos + teclado inline */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 28px 0' }}>
            {FIELDS.map((f) => (
              <div key={f.key}>
                {/* Fila del campo */}
                <div onClick={() => { setActiveField(f.key); setInputValue(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                  }}>
                  <span style={{ fontSize: 15, fontWeight: 200, color: activeField === f.key ? '#c8d8e8' : 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>
                    {f.label}
                  </span>
                  <span style={{
                    fontSize: 20, fontWeight: 300, letterSpacing: '-0.02em',
                    color: activeField === f.key ? '#8fafd4'
                      : f.resta && totales[f.key] > 0 ? 'rgba(252,165,165,0.7)'
                      : totales[f.key] > 0 ? '#e8ecf0' : 'rgba(255,255,255,0.15)',
                  }}>
                    {activeField === f.key
                      ? (inputValue ? `$${inputValue}` : '$')
                      : `${f.resta && totales[f.key] > 0 ? '-' : ''}$${totales[f.key].toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                  </span>
                </div>

                {/* Teclado inline */}
                {activeField === f.key && (
                  <div style={{ padding: '12px 0 8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
                      {['1','2','3','4','5','6','7','8','9','.','0','←'].map((k, i) => (
                        <button key={i}
                          onClick={e => { e.stopPropagation(); k === '←' ? handleMonto('del') : handleMonto(k); }}
                          style={{
                            padding: '14px 8px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.05)',
                            background: 'rgba(255,255,255,0.02)',
                            color: k === '←' ? 'rgba(255,255,255,0.25)' : '#c8d0d8',
                            fontSize: k === '←' ? 15 : 20, fontWeight: 200, cursor: 'pointer',
                          }}>
                          {k}
                        </button>
                      ))}
                    </div>
                    <button onClick={confirmMonto} style={{
                      width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                      background: 'rgba(143,175,212,0.07)', color: '#8fafd4',
                      fontSize: 11, cursor: 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                    }}>
                      {FIELD_ORDER.indexOf(f.key) < FIELD_ORDER.length - 1 ? 'Siguiente →' : '✓ Listo'}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 16px' }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Total del día</span>
              <span style={{ fontSize: 32, fontWeight: 200, color: '#4ade80', letterSpacing: '-0.04em' }}>
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Error */}
            {error && <div style={{ color: 'rgba(252,165,165,0.6)', fontSize: 12, textAlign: 'center', marginBottom: 12, letterSpacing: '0.02em' }}>{error}</div>}
          </div>

          {/* Botón guardar — fijo abajo, siempre visible */}
          <button onClick={guardarCorte} disabled={loading} style={{
            width: '100%', padding: '18px', borderRadius: 0,
            border: 'none', borderTop: '1px solid rgba(74,222,128,0.2)',
            background: 'transparent', color: '#4ade80',
            fontSize: 11, fontWeight: 400, cursor: 'pointer',
            letterSpacing: '0.25em', textTransform: 'uppercase' as const,
            flexShrink: 0,
          }}>
            {loading ? 'Guardando...' : 'Guardar corte'}
          </button>
        </div>
      )}

      {/* PANTALLA: Confirmación */}
      {screen === 'confirmacion' && (
        <div style={shared.outer}>
          <div style={shared.wrap}>
            <div style={shared.header}>
              <div style={shared.logo}>ESTIA ERP</div>
              <div style={shared.title}>Corte registrado</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 4, letterSpacing: '0.04em' }}>
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
            <div style={shared.content}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>
                  {selectedCompany?.tradeName || selectedCompany?.legalName}
                </div>
                {FIELDS.map(f => (
                  <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 14, fontWeight: 200, color: 'rgba(255,255,255,0.4)' }}>{f.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 300, color: f.resta ? 'rgba(252,165,165,0.7)' : '#c8d0d8' }}>
                      {f.resta && totales[f.key] > 0 ? '-' : ''}${totales[f.key].toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Total</span>
                  <span style={{ fontSize: 28, fontWeight: 200, color: '#4ade80', letterSpacing: '-0.04em' }}>
                    ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button style={shared.btnWhatsApp} onClick={sendWhatsApp}>Enviar por WhatsApp</button>
              <div style={{ height: 10 }} />
              <button style={shared.btnSecondary} onClick={imprimir}>Imprimir ticket</button>
              <div style={{ height: 10 }} />
              <button onClick={() => { setScreen('empresa'); setPin(''); setTotales({ efectivo: 0, tarjeta: 0, transferencia: 0, cortesia: 0, descuento: 0, gasto: 0 }); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.12)', fontSize: 11, cursor: 'pointer', width: '100%', textAlign: 'center', padding: '16px 0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Nuevo corte
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
