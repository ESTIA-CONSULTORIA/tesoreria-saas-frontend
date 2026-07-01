import { useEffect, useState } from 'react';
import { api } from '../../core/api/api';
import MainLayout from '../../core/layout/MainLayout';

export default function CorteFieldsConfig() {
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.get('/pos/corte-fields')
      .then(r => setFields(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (field: any) => {
    if (field.isRequired) return;
    setSaving(field.key);
    try {
      const res = await api.put(`/pos/corte-fields/${field.key}`, { isActive: !field.isActive });
      setFields(prev => prev.map(f => f.key === field.key ? res.data : f));
    } catch {}
    setSaving(null);
  };

  return (
    <MainLayout>
      <div style={{ maxWidth: 600, padding: '24px 0' }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: '#c8cdd8', marginBottom: 6 }}>
          Campos del Corte de Caja
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
          Activa o desactiva los campos que aparecen en el corte diario. Efectivo siempre es obligatorio.
        </p>

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Cargando...</div>
        ) : (
          <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', overflow: 'hidden' }}>
            {fields.map((f, i) => (
              <div key={f.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: i < fields.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 14, color: '#c8cdd8' }}>{f.label}</div>
                  {f.isRequired && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>Obligatorio</div>
                  )}
                  {f.resta && (
                    <div style={{ fontSize: 11, color: 'rgba(252,165,165,0.5)', marginTop: 2 }}>Resta del total</div>
                  )}
                </div>
                <button
                  onClick={() => toggle(f)}
                  disabled={f.isRequired || saving === f.key}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none',
                    cursor: f.isRequired ? 'not-allowed' : 'pointer',
                    background: f.isActive ? '#1a5c3a' : 'rgba(255,255,255,0.08)',
                    position: 'relative', transition: 'all 0.2s',
                    opacity: saving === f.key ? 0.5 : 1,
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: f.isActive ? '#4ade80' : 'rgba(255,255,255,0.3)',
                    position: 'absolute', top: 3,
                    left: f.isActive ? 23 : 3,
                    transition: 'all 0.2s',
                  }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
