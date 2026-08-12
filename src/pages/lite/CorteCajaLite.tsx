import { useState, useEffect } from 'react';
import axios from 'axios';

const API = ((import.meta.env.VITE_API_URL as string) ||
  'https://api.estiaconsultoria.com') + '/api/v1';

interface Totales {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  plataformas: number;
  promociones: number;
  cortesia: number;
  descuento: number;
  gasto: number;
}

type Screen = 'empresa' | 'pin' | 'corte' | 'confirmacion';

const FIELD_ORDER: (keyof Totales)[] = ['efectivo', 'tarjeta', 'transferencia', 'plataformas', 'promociones', 'cortesia', 'descuento', 'gasto'];

const FIELDS: { key: keyof Totales; label: string; resta?: boolean }[] = [
  { key: 'efectivo',      label: 'Efectivo' },
  { key: 'tarjeta',       label: 'Tarjeta' },
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'plataformas',   label: 'Plataformas' },
  { key: 'promociones',   label: 'Promociones' },
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
  const [totales, setTotales] = useState<Totales>({ efectivo: 0, tarjeta: 0, transferencia: 0, plataformas: 0, promociones: 0, cortesia: 0, descuento: 0, gasto: 0 });
  const [activeField, setActiveField] = useState<keyof Totales | null>(null);
  const [dynamicFields, setDynamicFields] = useState<{ key: keyof Totales; label: string; resta?: boolean }[]>(FIELDS);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInsumos, setShowInsumos] = useState(false);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [newInsumo, setNewInsumo] = useState({ nombre: '', tipo: 'insumo', estado: 'proximo', notas: '' });
  const [savingInsumo, setSavingInsumo] = useState(false);
  const [showFondoModal, setShowFondoModal] = useState(false);
  const [pendingNipData, setPendingNipData] = useState<{ cajero: string; accessToken: string; branchId: string | null } | null>(null);
  const [fondoInicialInput, setFondoInicialInput] = useState('');

  const activeFieldOrder = dynamicFields.map(f => f.key);
  const total = dynamicFields.reduce((sum, f) => {
    const v = totales[f.key] ?? 0;
    return f.resta ? sum - v : sum + v;
  }, 0);

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
        if (!activeField) setActiveField(activeFieldOrder[0]);
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

  const finishLogin = async (currentShift: any, accessToken: string) => {
    // Cargar campos configurables del corte
    try {
      const fieldsRes = await axios.get(`${API}/pos/corte-fields`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const active = (fieldsRes.data as any[])
        .filter(f => f.isActive)
        .sort((a, b) => a.order - b.order)
        .map(f => ({ key: f.key as keyof Totales, label: f.label, resta: f.resta }));
      if (active.length > 0) setDynamicFields(active);
    } catch { /* usa FIELDS por defecto */ }

    setShift(currentShift);
    setToken(accessToken);
    sessionStorage.setItem('lite_token', accessToken);
    sessionStorage.setItem('lite_shift', JSON.stringify(currentShift));
    sessionStorage.setItem('lite_company', JSON.stringify(selectedCompany));
    setScreen('corte');
    setLoading(false);
  };

  const handlePin = async (digit: string) => {
    if (digit === 'del') { setPin(p => p.slice(0, -1)); return; }
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length !== 4) return;

    setLoading(true);
    setError('');

    let loginRes;
    try {
      loginRes = await axios.post(`${API}/pos/cashiers/nip`, {
        nip: newPin,
        companyId: selectedCompany.id,
        tenantId,
      });
    } catch {
      setError('PIN incorrecto');
      setPin('');
      setLoading(false);
      return;
    }

    const accessToken = loginRes.data.access_token;
    const cajeroId = loginRes.data.user?.id;
    // sucursal real del cajero (User.branchId), no la empresa — Company no tiene branchId,
    // usar selectedCompany.id como sucursal guardaba turnos con el id de la empresa.
    const cajeroBranchId = loginRes.data.user?.branchId || null;

    try {
      const shiftRes = await axios.get(`${API}/pos/shifts/open`, {
        params: { cajero: cajeroId, sucursalId: cajeroBranchId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const shiftData = shiftRes.data;
      if (shiftData && typeof shiftData === 'object' && shiftData.id && shiftData.cajero === cajeroId) {
        if (shiftData.precorteDeclaracion) {
          const d = shiftData.precorteDeclaracion;
          setTotales({ efectivo: d.efectivo || 0, tarjeta: d.tarjeta || 0, transferencia: d.transferencia || 0, plataformas: d.plataformas || 0, promociones: d.promociones || 0, cortesia: d.cortesia || 0, descuento: d.descuento || 0, gasto: d.gasto || 0 });
        }
        await finishLogin(shiftData, accessToken);
        return;
      }
    } catch {
      // No hay turno abierto: seguimos abajo a pedir el fondo inicial
    }

    // No hay turno abierto: pedir fondo inicial de caja antes de abrirlo
    setPendingNipData({ cajero: cajeroId, accessToken, branchId: cajeroBranchId });
    setFondoInicialInput('');
    setShowFondoModal(true);
    setLoading(false);
  };

  const confirmFondoInicial = async () => {
    if (!pendingNipData) return;
    const fondoInicial = parseFloat(fondoInicialInput) || 0;
    setLoading(true);
    setError('');
    try {
      const openRes = await axios.post(`${API}/pos/shifts`, {
        cajero: pendingNipData.cajero,
        sucursalId: pendingNipData.branchId,
        tenantId,
        fondoInicial,
      }, { headers: { Authorization: `Bearer ${pendingNipData.accessToken}` } });
      setShowFondoModal(false);
      await finishLogin(openRes.data, pendingNipData.accessToken);
      setPendingNipData(null);
    } catch (e2: any) {
      const msg = e2?.response?.data?.message || e2?.message || 'Error desconocido';
      setError(`Error al abrir turno: ${msg}`);
      setShowFondoModal(false);
      setPendingNipData(null);
      setPin('');
      setLoading(false);
    }
  };

  const cancelFondoInicial = () => {
    setShowFondoModal(false);
    setPendingNipData(null);
    setFondoInicialInput('');
    setPin('');
    setLoading(false);
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
    const idx = activeFieldOrder.indexOf(activeField);
    if (idx < activeFieldOrder.length - 1) {
      setActiveField(activeFieldOrder[idx + 1]);
      setInputValue('');
    } else {
      setActiveField(null);
      setInputValue('');
    }
  };

  const handleBloquear = () => {
    sessionStorage.removeItem('lite_token');
    sessionStorage.removeItem('lite_shift');
    sessionStorage.removeItem('lite_company');
    setToken('');
    setShift(null);
    setPin('');
    setError('');
    setScreen('pin');
  };

  const loadInsumos = async () => {
    try {
      const res = await axios.get(`${API}/pos/insumo-alerts/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all = Array.isArray(res.data) ? res.data : [];
      setInsumos(all.filter((i: any) => i.estado !== 'disponible'));
    } catch {}
  };

  const saveInsumo = async () => {
    if (!newInsumo.nombre.trim()) return;
    setSavingInsumo(true);
    try {
      await axios.post(`${API}/pos/insumo-alerts`, {
        ...newInsumo,
        companyId: selectedCompany?.id,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNewInsumo({ nombre: '', tipo: 'insumo', estado: 'proximo', notas: '' });
      await loadInsumos();
    } catch {}
    setSavingInsumo(false);
  };

  const updateInsumoEstado = async (id: string, estado: string) => {
    try {
      await axios.put(`${API}/pos/insumo-alerts/${id}`, { estado }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadInsumos();
    } catch {}
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
        notas: `Tarjeta: $${totales.tarjeta} / Transferencia: $${totales.transferencia} / Plataformas: $${totales.plataformas} / Promociones: $${totales.promociones} / Cortesías: $${totales.cortesia} / Descuentos: $${totales.descuento} / Gastos: $${totales.gasto}`,
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
      `Plataformas     $${totales.plataformas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `Promociones     $${totales.promociones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
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
    <div class="row"><span>Plataformas</span><span>$${totales.plataformas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
    <div class="row"><span>Promociones</span><span>$${totales.promociones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
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
    <div style={{ position: 'fixed', inset: 0, background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 13, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>URL incorrecta · Contacta a tu administrador</div>
    </div>
  );

  const PIN_KEYS = ['1','2','3','4','5','6','7','8','9','','0','del'];

  const shared = {
    outer: { position: 'fixed' as const, inset: 0, background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    wrap: { width: '100%', maxWidth: 420, height: '100%', maxHeight: 860, background: '#ffffff', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', borderRadius: window.innerWidth > 500 ? 20 : 0, boxShadow: '0 4px 40px rgba(0,0,0,0.08)' },
    header: { padding: '32px 32px 24px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 },
    logo: { fontSize: 9, letterSpacing: '0.35em', color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 8 },
    title: { fontSize: 22, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' },
    content: { flex: 1, overflowY: 'auto' as const, overflowX: 'hidden' as const, padding: '32px' },
    btnWhatsApp: { width: '100%', padding: 18, borderRadius: 14, border: 'none', background: '#128C7E', color: '#fff', fontSize: 16, fontWeight: 500, cursor: 'pointer', letterSpacing: '0.01em' },
    btnSecondary: { width: '100%', padding: 17, borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 15, cursor: 'pointer', fontWeight: 400 },
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
                <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 60, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cargando...</div>
              ) : companies.map((c: any) => (
                <button key={c.id}
                  onClick={() => { setSelectedCompany(c); setPin(''); setError(''); setScreen('pin'); }}
                  style={{ width: '100%', padding: '22px 24px', marginBottom: 10, border: '1px solid #e2e8f0', borderLeft: '3px solid #3b82f6', background: '#f8fafc', borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#111827', letterSpacing: '0em' }}>
                    {c.tradeName || c.legalName}
                  </div>
                  <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 6, letterSpacing: '0.05em', fontWeight: 500 }}>
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
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 36, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ingresa tu NIP</div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 48 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: pin.length > i ? '#1d4ed8' : '#e2e8f0', transition: 'all 0.2s', boxShadow: pin.length > i ? '0 0 12px rgba(29,78,216,0.3)' : 'none' }} />
                ))}
              </div>
              {error && <div style={{ color: '#dc2626', fontSize: 14, marginBottom: 20, letterSpacing: '0.02em', fontWeight: 500 }}>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%', maxWidth: 300 }}>
                {PIN_KEYS.map((k, i) => (
                  <button key={i}
                    style={{ padding: '22px 8px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#111827', fontSize: 28, fontWeight: 400, cursor: 'pointer', letterSpacing: '-0.02em', opacity: k === '' ? 0 : 1, pointerEvents: k === '' ? 'none' : 'auto' }}
                    onClick={() => k !== '' && !loading && handlePin(k)}>
                    {k === 'del' ? '←' : k}
                  </button>
                ))}
              </div>
              {loading && <div style={{ color: '#64748b', fontSize: 13, marginTop: 24, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Verificando...</div>}
              <button onClick={() => { setScreen('empresa'); setPin(''); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', marginTop: 40, letterSpacing: '0.05em' }}>
                Cambiar sucursal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Fondo inicial de caja (turno nuevo) */}
      {showFondoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: 360, background: '#ffffff', borderRadius: 20, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Nuevo turno</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#111827', marginBottom: 20 }}>Fondo inicial de caja</div>
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              placeholder="0.00"
              value={fondoInicialInput}
              onChange={e => setFondoInicialInput(e.target.value)}
              style={{ width: '100%', padding: '16px 14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#111827', fontSize: 22, fontWeight: 600, marginBottom: 16, boxSizing: 'border-box' }}
            />
            {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12, fontWeight: 500 }}>{error}</div>}
            <button onClick={confirmFondoInicial} disabled={loading} style={{
              width: '100%', padding: 16, borderRadius: 12, border: 'none',
              background: '#1d4ed8', color: '#ffffff', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
            }}>
              {loading ? 'Abriendo turno...' : 'Confirmar y abrir turno'}
            </button>
            <button onClick={cancelFondoInicial} disabled={loading} style={{
              width: '100%', padding: 14, borderRadius: 12, border: 'none',
              background: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* PANTALLA: Corte */}
      {screen === 'corte' && (
        <div style={{ position: 'fixed', inset: 0, background: '#ffffff', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>ESTIA ERP</div>
                <div style={{ fontSize: 19, fontWeight: 700, color: '#111827' }}>
                  {selectedCompany?.tradeName || selectedCompany?.legalName}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
                  {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleBloquear} style={{
                  background: 'none', border: '1px solid rgba(0,0,0,0.15)',
                  color: 'rgba(0,0,0,0.35)', fontSize: 10, padding: '4px 10px',
                  borderRadius: 8, cursor: 'pointer', letterSpacing: '0.08em',
                  fontFamily: 'inherit',
                }}>
                  BLOQUEAR
                </button>
                <button onClick={() => { setShowInsumos(true); loadInsumos(); }} style={{
                  background: '#f1f5f9', border: '1px solid #e2e8f0',
                  color: '#475569', fontSize: 12, padding: '6px 14px',
                  borderRadius: 8, cursor: 'pointer', letterSpacing: '0.05em',
                  fontFamily: 'inherit', fontWeight: 500,
                }}>
                  INSUMOS
                </button>
              </div>
            </div>
          </div>

          {/* Campos + teclado inline */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 24px 0' }}>
            {dynamicFields.map((f) => (
              <div key={f.key}>
                {/* Fila del campo */}
                <div onClick={() => { setActiveField(f.key); setInputValue(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 0', borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                  }}>
                  <span style={{ fontSize: 17, fontWeight: activeField === f.key ? 600 : 400, color: activeField === f.key ? '#1d4ed8' : '#374151' }}>
                    {f.label}
                  </span>
                  <span style={{
                    fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em',
                    color: activeField === f.key ? '#1d4ed8'
                      : f.resta && totales[f.key] > 0 ? '#dc2626'
                      : totales[f.key] > 0 ? '#111827' : '#cbd5e1',
                  }}>
                    {activeField === f.key
                      ? (inputValue ? `$${inputValue}` : '$')
                      : `${f.resta && totales[f.key] > 0 ? '-' : ''}$${totales[f.key].toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                  </span>
                </div>

                {/* Teclado inline */}
                {activeField === f.key && (
                  <div style={{ padding: '12px 0 8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                      {['1','2','3','4','5','6','7','8','9','.','0','←'].map((k, i) => (
                        <button key={i}
                          onClick={e => { e.stopPropagation(); k === '←' ? handleMonto('del') : handleMonto(k); }}
                          style={{
                            padding: '16px 8px', borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            color: k === '←' ? '#94a3b8' : '#111827',
                            fontSize: k === '←' ? 17 : 24, fontWeight: 400, cursor: 'pointer',
                          }}>
                          {k}
                        </button>
                      ))}
                    </div>
                    <button onClick={confirmMonto} style={{
                      width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                      background: '#1d4ed8', color: '#ffffff',
                      fontSize: 14, cursor: 'pointer', letterSpacing: '0.04em', fontWeight: 600,
                    }}>
                      {activeFieldOrder.indexOf(f.key) < activeFieldOrder.length - 1 ? 'Siguiente →' : '✓ Listo'}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 16px' }}>
              <span style={{ fontSize: 13, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500 }}>Total del día</span>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#16a34a', letterSpacing: '-0.03em' }}>
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Error */}
            {error && <div style={{ color: '#dc2626', fontSize: 14, textAlign: 'center', marginBottom: 12, fontWeight: 500 }}>{error}</div>}
          </div>

          {/* Botón guardar — fijo abajo, siempre visible */}
          <button onClick={guardarCorte} disabled={loading} style={{
            width: '100%', padding: '20px', borderRadius: 0,
            border: 'none', borderTop: '2px solid #16a34a',
            background: '#16a34a', color: '#ffffff',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            flexShrink: 0,
          }}>
            {loading ? 'Guardando...' : 'Guardar corte'}
          </button>

          {/* Modal de insumos */}
          {showInsumos && (
            <div style={{
              position: 'fixed', inset: 0, background: '#ffffff',
              display: 'flex', flexDirection: 'column', zIndex: 50,
            }}>
              <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Avisos de Insumos</div>
                <button onClick={() => setShowInsumos(false)} style={{ background: '#f1f5f9', border: 'none', color: '#475569', fontSize: 16, cursor: 'pointer', borderRadius: 8, width: 36, height: 36, fontWeight: 600 }}>✕</button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                {/* Formulario nuevo aviso */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#64748b', letterSpacing: '0.08em', marginBottom: 12, fontWeight: 600 }}>NUEVO AVISO</div>
                  <input
                    placeholder="Nombre del insumo o producto"
                    value={newInsumo.nombre}
                    onChange={e => setNewInsumo(p => ({ ...p, nombre: e.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff', color: '#111827', fontSize: 15, marginBottom: 10, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    {['insumo', 'producto'].map(tp => (
                      <button key={tp} onClick={() => setNewInsumo(p => ({ ...p, tipo: tp }))} style={{
                        padding: '8px 16px', borderRadius: 8, border: `2px solid ${newInsumo.tipo === tp ? '#1d4ed8' : '#e2e8f0'}`,
                        background: newInsumo.tipo === tp ? '#eff6ff' : '#ffffff',
                        color: newInsumo.tipo === tp ? '#1d4ed8' : '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: newInsumo.tipo === tp ? 600 : 400,
                      }}>{tp === 'insumo' ? 'Insumo' : 'Producto'}</button>
                    ))}
                    {['proximo', 'agotado'].map(est => (
                      <button key={est} onClick={() => setNewInsumo(p => ({ ...p, estado: est }))} style={{
                        padding: '8px 16px', borderRadius: 8,
                        border: `2px solid ${newInsumo.estado === est ? (est === 'agotado' ? '#dc2626' : '#d97706') : '#e2e8f0'}`,
                        background: newInsumo.estado === est ? (est === 'agotado' ? '#fef2f2' : '#fffbeb') : '#ffffff',
                        color: newInsumo.estado === est ? (est === 'agotado' ? '#dc2626' : '#d97706') : '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: newInsumo.estado === est ? 600 : 400,
                      }}>{est === 'proximo' ? 'Próximo a agotarse' : 'Agotado'}</button>
                    ))}
                  </div>
                  <input
                    placeholder="Notas (cantidad aproximada, etc.)"
                    value={newInsumo.notas}
                    onChange={e => setNewInsumo(p => ({ ...p, notas: e.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff', color: '#111827', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
                  />
                  <button onClick={saveInsumo} disabled={savingInsumo || !newInsumo.nombre.trim()} style={{
                    width: '100%', padding: 14, borderRadius: 10, border: 'none',
                    background: '#1d4ed8', color: '#ffffff', fontSize: 15, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
                  }}>
                    {savingInsumo ? 'Guardando...' : 'Guardar aviso'}
                  </button>
                </div>

                {/* Lista de insumos */}
                {insumos.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 24 }}>Sin avisos registrados</div>
                ) : insumos.map(ins => (
                  <div key={ins.id} style={{
                    padding: '14px 16px', marginBottom: 10, borderRadius: 12,
                    border: `1px solid ${ins.estado === 'agotado' ? '#fecaca' : ins.estado === 'proximo' ? '#fde68a' : '#e2e8f0'}`,
                    background: ins.estado === 'agotado' ? '#fef2f2' : ins.estado === 'proximo' ? '#fffbeb' : '#f8fafc',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 15, color: '#111827', fontWeight: 600 }}>{ins.nombre}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{ins.tipo} · {new Date(ins.updatedAt).toLocaleDateString('es-MX')}</div>
                        {ins.notas && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{ins.notas}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                        <span style={{
                          fontSize: 11, padding: '4px 10px', borderRadius: 99, letterSpacing: '0.06em', fontWeight: 700,
                          background: ins.estado === 'agotado' ? '#dc2626' : ins.estado === 'proximo' ? '#d97706' : '#16a34a',
                          color: '#ffffff',
                        }}>
                          {ins.estado === 'agotado' ? 'AGOTADO' : ins.estado === 'proximo' ? 'PRÓXIMO' : 'DISPONIBLE'}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {ins.estado !== 'proximo' && (
                            <button onClick={() => updateInsumoEstado(ins.id, 'proximo')} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #d97706', background: '#fffbeb', color: '#d97706', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Próximo</button>
                          )}
                          {ins.estado !== 'agotado' && (
                            <button onClick={() => updateInsumoEstado(ins.id, 'agotado')} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #dc2626', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Agotado</button>
                          )}
                          {ins.estado !== 'disponible' && (
                            <button onClick={() => updateInsumoEstado(ins.id, 'disponible')} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #16a34a', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Disponible</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PANTALLA: Confirmación */}
      {screen === 'confirmacion' && (
        <div style={shared.outer}>
          <div style={shared.wrap}>
            <div style={shared.header}>
              <div style={shared.logo}>ESTIA ERP</div>
              <div style={shared.title}>Corte registrado ✓</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
            <div style={shared.content}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20, fontWeight: 600 }}>
                  {selectedCompany?.tradeName || selectedCompany?.legalName}
                </div>
                {dynamicFields.map(f => (
                  <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 15, fontWeight: 400, color: '#475569' }}>{f.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: f.resta ? '#dc2626' : '#111827' }}>
                      {f.resta && totales[f.key] > 0 ? '-' : ''}${totales[f.key].toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18, marginTop: 4 }}>
                  <span style={{ fontSize: 13, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500 }}>Total</span>
                  <span style={{ fontSize: 32, fontWeight: 700, color: '#16a34a', letterSpacing: '-0.03em' }}>
                    ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button style={shared.btnWhatsApp} onClick={sendWhatsApp}>Enviar por WhatsApp</button>
              <div style={{ height: 12 }} />
              <button style={shared.btnSecondary} onClick={imprimir}>Imprimir ticket</button>
              <div style={{ height: 12 }} />
              <button onClick={() => { setScreen('empresa'); setPin(''); setTotales({ efectivo: 0, tarjeta: 0, transferencia: 0, plataformas: 0, promociones: 0, cortesia: 0, descuento: 0, gasto: 0 }); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'center', padding: '16px 0', letterSpacing: '0.05em' }}>
                Nuevo corte
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
