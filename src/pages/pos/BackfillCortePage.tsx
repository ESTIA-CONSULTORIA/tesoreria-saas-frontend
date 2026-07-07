import { useState, useEffect } from 'react';
import { api } from '../../core/api/api';
import MainLayout from '../../core/layout/MainLayout';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useCompanyStore } from '../../core/store/useCompanyStore';

interface CorteField {
  key: string;
  label: string;
  resta?: boolean;
}

const DEFAULT_FIELDS: CorteField[] = [
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'tarjeta', label: 'Tarjeta' },
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'plataformas', label: 'Plataformas' },
  { key: 'promociones', label: 'Promociones' },
  { key: 'cortesia', label: 'Cortesías', resta: true },
  { key: 'descuento', label: 'Descuentos', resta: true },
  { key: 'gasto', label: 'Gastos', resta: true },
];

// Campos que sí tienen columna propia en Shift; el resto se anota en `notas`
const KNOWN_KEYS = ['efectivo', 'tarjeta', 'transferencia', 'cortesia'];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function BackfillCortePage() {
  const { user } = useAuthStore();
  const { activeCompany, activeBranch } = useCompanyStore();
  const isAuthorized = user?.roleCode === 'ADMIN' || user?.roleCode === 'SOPORTE';

  const [fields, setFields] = useState<CorteField[]>(DEFAULT_FIELDS);
  const [fecha, setFecha] = useState(todayStr());
  const [values, setValues] = useState<Record<string, string>>({});
  const [fondoInicial, setFondoInicial] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthorized) return;
    api.get('/pos/corte-fields')
      .then(r => {
        const active = (r.data as any[])
          .filter(f => f.isActive)
          .sort((a, b) => a.order - b.order)
          .map(f => ({ key: f.key, label: f.label, resta: f.resta }));
        if (active.length > 0) setFields(active);
      })
      .catch(() => { /* usa DEFAULT_FIELDS */ });
  }, [isAuthorized]);

  const num = (key: string) => parseFloat(values[key] || '') || 0;

  const total = fields.reduce((sum, f) => {
    const v = num(f.key);
    return f.resta ? sum - v : sum + v;
  }, 0);

  const resetValues = () => {
    setValues({});
    setFondoInicial('');
    setNotas('');
    setError('');
  };

  const guardar = async () => {
    if (!activeCompany || !activeBranch) {
      setError('Selecciona empresa y sucursal en la barra superior antes de continuar.');
      return;
    }
    if (!fecha) {
      setError('Selecciona la fecha del corte a capturar.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const extraFields = fields.filter(f => !KNOWN_KEYS.includes(f.key));
      const extraNotas = extraFields
        .map(f => `${f.label}: $${num(f.key).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`)
        .join(' / ');
      const notasFinal = [extraNotas, notas.trim()].filter(Boolean).join(' — ');

      await api.post('/pos/shifts/backfill', {
        sucursalId: activeBranch.id,
        fecha,
        fondoInicial: parseFloat(fondoInicial || '') || 0,
        totalVentas: total,
        totalEfectivo: num('efectivo'),
        totalTarjeta: num('tarjeta'),
        totalTransferencia: num('transferencia'),
        totalCortesia: num('cortesia'),
        efectivoContado: num('efectivo'),
        notas: notasFinal,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al guardar el corte retroactivo');
    }
    setLoading(false);
  };

  const capturarOtroDia = () => {
    resetValues();
    setSuccess(false);
  };

  if (!isAuthorized) {
    return (
      <MainLayout>
        <div style={{ padding: 40, color: '#c8cdd8', fontSize: 14 }}>
          No tienes permisos para acceder a esta sección.
        </div>
      </MainLayout>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)', background: '#0f1117',
    color: '#c8cdd8', fontSize: 14, boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block',
  };

  return (
    <MainLayout>
      <div style={{ maxWidth: 560, padding: '24px 24px 60px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: '#c8cdd8', marginBottom: 6 }}>
          Captura Retroactiva de Corte
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
          Registra el corte de un día pasado que no quedó capturado en el sistema. Solo disponible para ADMIN/SOPORTE.
        </p>

        {!activeCompany || !activeBranch ? (
          <div style={{ padding: 16, borderRadius: 10, border: '1px solid rgba(252,165,165,0.3)', background: 'rgba(252,165,165,0.08)', color: '#fca5a5', fontSize: 13, marginBottom: 20 }}>
            Selecciona una empresa y sucursal en la barra superior para continuar.
          </div>
        ) : (
          <div style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 20 }}>
            {activeCompany.name} — {activeBranch.name}
          </div>
        )}

        {success ? (
          <div style={{ borderRadius: 10, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)', padding: 24 }}>
            <div style={{ fontSize: 15, color: '#4ade80', fontWeight: 600, marginBottom: 8 }}>
              Corte retroactivo guardado ✓
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
              Fecha capturada: {fecha}
            </div>
            <button
              onClick={capturarOtroDia}
              style={{ padding: '12px 20px', borderRadius: 8, border: 'none', background: '#1d4ed8', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Capturar otro día
            </button>
          </div>
        ) : (
          <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Fecha del corte</label>
              <input
                type="date"
                value={fecha}
                max={todayStr()}
                onChange={e => setFecha(e.target.value)}
                style={inputStyle}
              />
            </div>

            {fields.map(f => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{f.label}{f.resta ? ' (resta del total)' : ''}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={values[f.key] || ''}
                  onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#4ade80' }}>
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Fondo inicial de caja</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={fondoInicial}
                onChange={e => setFondoInicial(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Notas</label>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {error && (
              <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}

            <button
              onClick={guardar}
              disabled={loading}
              style={{
                width: '100%', padding: 14, borderRadius: 10, border: 'none',
                background: '#1d4ed8', color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Guardando...' : 'Guardar corte retroactivo'}
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
