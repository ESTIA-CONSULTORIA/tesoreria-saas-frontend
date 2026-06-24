import { useState } from 'react';

interface Concept {
  name: string;
  customName?: string;
  type: 'P' | 'D';
  amount: number;
  saved?: boolean;
}

interface Props {
  entry: any;
  catalog: any[];
  onSave: (concepts: Concept[]) => Promise<void>;
  onClose: () => void;
}

export function ConceptsEditor({ entry, catalog, onSave, onClose }: Props) {
  const [concepts, setConcepts] = useState<Concept[]>(entry.concepts || []);
  const [saving, setSaving] = useState(false);

  const addConcept = (type: 'P' | 'D') => {
    setConcepts(prev => [...prev, { name: '', type, amount: 0, saved: false }]);
  };

  const updateConcept = (i: number, field: keyof Concept, value: any) => {
    setConcepts(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const removeConcept = (i: number) => {
    setConcepts(prev => prev.filter((_, idx) => idx !== i));
  };

  const totalP = concepts.filter(c => c.type === 'P').reduce((s, c) => s + Number(c.amount), 0);
  const totalD = concepts.filter(c => c.type === 'D').reduce((s, c) => s + Number(c.amount), 0);
  const net = totalP - totalD;

  const handleSave = async () => {
    setSaving(true);
    const finalConcepts = concepts.map(c => ({
      ...c,
      name: c.name === '__otro__' ? (c.customName || '') : c.name,
    }));
    await onSave(finalConcepts);
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
    background: '#0f1117', color: '#c8cdd8', fontSize: 12, width: '100%',
  };

  const perceptions = concepts.filter(c => c.type === 'P');
  const deductions = concepts.filter(c => c.type === 'D');

  const renderRow = (c: Concept, realIdx: number) => (
    <div key={realIdx} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <select
          value={c.name}
          onChange={e => {
            const selected = catalog.find(cat => cat.name === e.target.value);
            updateConcept(realIdx, 'name', e.target.value);
            if (selected?.defaultAmount > 0) updateConcept(realIdx, 'amount', Number(selected.defaultAmount));
          }}
          style={{ ...inputStyle }}
        >
          <option value="">— Seleccionar —</option>
          {catalog.filter(cat => cat.type === c.type).map((cat: any) => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
          <option value="__otro__">Otro (escribir)</option>
        </select>
        {c.name === '__otro__' && (
          <input
            value={c.customName || ''}
            onChange={e => updateConcept(realIdx, 'customName', e.target.value)}
            placeholder="Nombre del concepto"
            style={{ ...inputStyle }}
          />
        )}
      </div>
      <input type="number" value={c.amount} onChange={e => updateConcept(realIdx, 'amount', parseFloat(e.target.value) || 0)}
        style={{ ...inputStyle, flex: 1 }} />
      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', paddingTop: 6 }}>
        <input type="checkbox" checked={!!c.saved} onChange={e => updateConcept(realIdx, 'saved', e.target.checked)} />
        guardar
      </label>
      <button onClick={() => removeConcept(realIdx)}
        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(252,165,165,0.8)', cursor: 'pointer', fontSize: 12, marginTop: 2 }}>✕</button>
    </div>
  );

  return (
    <div>
      {/* Percepciones */}
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Percepciones</div>
      {perceptions.map(c => renderRow(c, concepts.indexOf(c)))}
      <button onClick={() => addConcept('P')}
        style={{ fontSize: 12, color: '#8fafd4', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 12 }}>
        + Agregar percepción
      </button>

      {/* Deducciones */}
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6, marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deducciones</div>
      {deductions.map(c => renderRow(c, concepts.indexOf(c)))}
      <button onClick={() => addConcept('D')}
        style={{ fontSize: 12, color: 'rgba(252,165,165,0.8)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 16 }}>
        + Agregar deducción
      </button>

      {/* Totales */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Total percepciones</span>
          <span style={{ color: '#4ade80' }}>${totalP.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Total deducciones</span>
          <span style={{ color: 'rgba(252,165,165,0.8)' }}>-${totalD.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 500 }}>
          <span style={{ color: '#c8cdd8' }}>Neto a pagar</span>
          <span style={{ color: '#4ade80' }}>${net.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose}
          style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#c8cdd8', fontSize: 13, cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid rgba(123,156,204,0.3)', background: 'rgba(123,156,204,0.1)', color: '#8fafd4', fontSize: 13, cursor: 'pointer' }}>
          {saving ? 'Guardando...' : 'Guardar conceptos'}
        </button>
      </div>
    </div>
  );
}
