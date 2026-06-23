import { useState, useRef, useEffect } from 'react';

const INCIDENCE_KEYS = [
  { key: 'A',   label: 'Asistencia' },
  { key: 'F',   label: 'Falta' },
  { key: 'PG',  label: 'Permiso con goce' },
  { key: 'PS',  label: 'Permiso sin goce' },
  { key: 'VG',  label: 'Vacaciones' },
  { key: 'IC',  label: 'Incapacidad c/riesgo' },
  { key: 'IS',  label: 'Incapacidad s/riesgo' },
  { key: 'SU',  label: 'Suspensión' },
  { key: 'DF',  label: 'Día festivo' },
  { key: 'DFT', label: 'Día festivo trabajado' },
  { key: 'TE',  label: 'Tiempo extra' },
  { key: '7',   label: 'Séptimo día' },
];

const KEY_COLORS: Record<string, string> = {
  A: '#4ade80', F: 'rgba(252,165,165,0.9)', PG: '#60a5fa', PS: '#f59e0b',
  VG: '#a78bfa', IC: '#f97316', IS: '#fb923c', SU: 'rgba(252,165,165,0.6)',
  DF: '#94a3b8', DFT: '#4ade80', TE: '#34d399', '7': '#c084fc',
};

interface Props {
  value: string;
  locked?: boolean;
  isWeekend?: boolean;
  onChange: (key: string) => void;
}

export function IncidenceInput({ value, locked, isWeekend, onChange }: Props) {
  const [inputVal, setInputVal] = useState(value);
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState(INCIDENCE_KEYS);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputVal(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (val: string) => {
    setInputVal(val);
    setOpen(true);
    const q = val.toLowerCase();
    setFiltered(
      q === ''
        ? INCIDENCE_KEYS
        : INCIDENCE_KEYS.filter(k =>
            k.key.toLowerCase().startsWith(q) ||
            k.label.toLowerCase().includes(q)
          )
    );
  };

  const select = (k: { key: string; label: string }) => {
    setInputVal(k.key);
    setOpen(false);
    onChange(k.key);
  };

  const color = KEY_COLORS[value] || 'rgba(255,255,255,0.2)';

  if (locked) {
    return (
      <div style={{
        width: 44, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600, color: value ? color : 'rgba(255,255,255,0.1)',
        background: value ? `${color}22` : 'transparent',
        borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)',
      }}>
        {value || '—'}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: 44 }}>
      <input
        value={inputVal}
        onFocus={() => { setOpen(true); handleInput(inputVal); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={e => handleInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter' && filtered.length === 1) select(filtered[0]);
        }}
        maxLength={3}
        placeholder="—"
        style={{
          width: '100%', padding: '3px 4px', borderRadius: 6, fontSize: 11,
          textAlign: 'center', fontWeight: 600, textTransform: 'uppercase',
          border: `1px solid ${value ? `${color}44` : 'rgba(255,255,255,0.08)'}`,
          background: value ? `${color}18` : (isWeekend ? 'rgba(255,255,255,0.02)' : '#141820'),
          color: value ? color : 'rgba(255,255,255,0.25)',
          outline: 'none', cursor: locked ? 'default' : 'text',
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)',
          background: '#1a2035', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, zIndex: 100, minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}>
          {filtered.map(k => (
            <div
              key={k.key}
              onMouseDown={() => select(k)}
              style={{
                padding: '7px 12px', cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                color: '#c8cdd8',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontWeight: 700, color: KEY_COLORS[k.key], minWidth: 28 }}>{k.key}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{k.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
