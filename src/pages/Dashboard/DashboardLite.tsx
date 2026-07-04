import { useState, useEffect } from 'react';
import { api } from '../../core/api/api';
import MainLayout from '../../core/layout/MainLayout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type Period = 'semana' | 'mes' | 'custom';

const CANALES = [
  { key: 'efectivo',      label: 'Efectivo',      color: '#4ade80' },
  { key: 'tarjeta',       label: 'Tarjeta',        color: '#8fafd4' },
  { key: 'transferencia', label: 'Transferencia',  color: '#a78bfa' },
  { key: 'plataformas',   label: 'Plataformas',    color: '#fbbf24' },
  { key: 'promociones',   label: 'Promociones',    color: '#f472b6' },
];

function parseNotas(notas: string | null) {
  if (!notas) return {};
  const fields: Record<string, number> = {};
  const patterns = [
    { key: 'tarjeta',       re: /Tarjeta[:\s]+\$?([\d,]+\.?\d*)/i },
    { key: 'transferencia', re: /Transferencia[:\s]+\$?([\d,]+\.?\d*)/i },
    { key: 'plataformas',   re: /Plataformas[:\s]+\$?([\d,]+\.?\d*)/i },
    { key: 'promociones',   re: /Promociones[:\s]+\$?([\d,]+\.?\d*)/i },
    { key: 'cortesia',      re: /Cortesías[:\s]+\$?([\d,]+\.?\d*)/i },
    { key: 'descuento',     re: /Descuentos[:\s]+\$?([\d,]+\.?\d*)/i },
    { key: 'gasto',         re: /Gastos[:\s]+\$?([\d,]+\.?\d*)/i },
  ];
  for (const { key, re } of patterns) {
    const m = notas.match(re);
    if (m) fields[key] = parseFloat(m[1].replace(/,/g, ''));
  }
  return fields;
}

function shiftTotal(s: any): number {
  let total = Number(s.efectivoContado || 0);
  const f = parseNotas(s.notas);
  total += (f.tarjeta || 0) + (f.transferencia || 0) + (f.plataformas || 0) + (f.promociones || 0);
  total -= (f.cortesia || 0) + (f.descuento || 0) + (f.gasto || 0);
  return total;
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2 });
}

export default function DashboardLite() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('semana');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedShift, setSelectedShift] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    api.get('/pos/shifts', { params: { limit: 100 } })
      .then(r => setShifts(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = shifts.filter(s => {
    const fecha = new Date(s.createdAt || s.fecha || 0);
    const now = new Date();
    if (period === 'semana') {
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return fecha >= from;
    }
    if (period === 'mes') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return fecha >= from;
    }
    if (period === 'custom' && customFrom && customTo) {
      return fecha >= new Date(customFrom) && fecha <= new Date(customTo + 'T23:59:59');
    }
    return true;
  });

  const totalVenta = filtered.reduce((sum, s) => sum + shiftTotal(s), 0);

  const byDay = filtered.reduce((acc: any, s) => {
    const fecha = new Date(s.createdAt || s.fecha || 0);
    const day = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    if (!acc[day]) acc[day] = { day, efectivo: 0, tarjeta: 0, transferencia: 0, plataformas: 0, promociones: 0 };
    const f = parseNotas(s.notas);
    acc[day].efectivo      += Number(s.efectivoContado || 0);
    acc[day].tarjeta       += f.tarjeta       || 0;
    acc[day].transferencia += f.transferencia || 0;
    acc[day].plataformas   += f.plataformas   || 0;
    acc[day].promociones   += f.promociones   || 0;
    return acc;
  }, {});
  const chartData = Object.values(byDay);

  const canalTotals = CANALES.map(c => {
    const total = filtered.reduce((sum, s) => {
      if (c.key === 'efectivo') return sum + Number(s.efectivoContado || 0);
      const f = parseNotas(s.notas);
      return sum + (f[c.key] || 0);
    }, 0);
    return { ...c, total, pct: totalVenta > 0 ? (total / totalVenta * 100).toFixed(1) : '0.0' };
  }).filter(c => c.total > 0);

  const shiftDetalle = selectedShift ? (() => {
    const f = parseNotas(selectedShift.notas);
    const total = shiftTotal(selectedShift);
    const canales = [
      { label: 'Efectivo',      valor: Number(selectedShift.efectivoContado || 0), resta: false },
      { label: 'Tarjeta',       valor: f.tarjeta       || 0, resta: false },
      { label: 'Transferencia', valor: f.transferencia || 0, resta: false },
      { label: 'Plataformas',   valor: f.plataformas   || 0, resta: false },
      { label: 'Promociones',   valor: f.promociones   || 0, resta: false },
      { label: 'Cortesías',     valor: f.cortesia      || 0, resta: true  },
      { label: 'Descuentos',    valor: f.descuento     || 0, resta: true  },
      { label: 'Gastos',        valor: f.gasto         || 0, resta: true  },
    ].filter(c => c.valor > 0);
    return { canales, total };
  })() : null;

  return (
    <MainLayout>
      <div style={{ padding: '20px 0', maxWidth: 1100 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 500, color: '#c8cdd8', marginBottom: 4 }}>Dashboard</h1>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Resumen de ventas por período</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {(['semana', 'mes'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '6px 16px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${period === p ? 'rgba(143,175,212,0.4)' : 'rgba(255,255,255,0.08)'}`,
                background: period === p ? 'rgba(143,175,212,0.1)' : 'transparent',
                color: period === p ? '#8fafd4' : 'rgba(255,255,255,0.35)',
                textTransform: 'capitalize',
              }}>{p}</button>
            ))}
            <button onClick={() => setPeriod('custom')} style={{
              padding: '6px 16px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${period === 'custom' ? 'rgba(143,175,212,0.4)' : 'rgba(255,255,255,0.08)'}`,
              background: period === 'custom' ? 'rgba(143,175,212,0.1)' : 'transparent',
              color: period === 'custom' ? '#8fafd4' : 'rgba(255,255,255,0.35)',
            }}>Rango</button>
            {period === 'custom' && (
              <>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#c8cdd8', fontSize: 12 }} />
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>al</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#c8cdd8', fontSize: 12 }} />
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: 40, textAlign: 'center' }}>Cargando...</div>
        ) : (
          <>
            {/* KPI + canales */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>
              <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', padding: '20px 24px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Venta total del período</div>
                <div style={{ fontSize: 36, fontWeight: 300, color: '#4ade80', letterSpacing: '-0.02em' }}>{fmt(totalVenta)}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
                  {filtered.length} corte{filtered.length !== 1 ? 's' : ''} registrado{filtered.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', padding: '20px 24px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Desglose por canal</div>
                {canalTotals.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Sin datos</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                    {canalTotals.map(c => (
                      <div key={c.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{c.label}</span>
                          <span style={{ fontSize: 12, color: c.color, fontWeight: 500 }}>{c.pct}%</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                          <div style={{ height: '100%', borderRadius: 99, background: c.color, width: `${c.pct}%`, transition: 'width 0.4s' }} />
                        </div>
                        <div style={{ fontSize: 12, color: '#c8cdd8', marginTop: 4 }}>{fmt(c.total)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Gráfica */}
            {chartData.length > 0 && (
              <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Comportamiento por canal</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                      formatter={(value: any, name: string) => [fmt(Number(value)), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
                    {CANALES.map(c => (
                      <Bar key={c.key} dataKey={c.key} name={c.label} fill={c.color} radius={[4, 4, 0, 0]} stackId="a" />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Lista de cortes + detalle */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedShift ? '1fr 1fr' : '1fr', gap: 16 }}>
              <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Cortes del período
                </div>
                {filtered.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Sin cortes registrados</div>
                ) : (
                  filtered.map(s => {
                    const fecha = new Date(s.createdAt || s.fecha || 0);
                    const total = shiftTotal(s);
                    const isSelected = selectedShift?.id === s.id;
                    return (
                      <div key={s.id} onClick={() => setSelectedShift(isSelected ? null : s)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 20px', cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          background: isSelected ? 'rgba(143,175,212,0.06)' : 'transparent',
                          borderLeft: `3px solid ${isSelected ? '#8fafd4' : 'transparent'}`,
                        }}>
                        <div>
                          <div style={{ fontSize: 13, color: '#c8cdd8' }}>
                            {fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                            {fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 400, color: total > 0 ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                          {fmt(total)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Detalle del corte seleccionado */}
              {selectedShift && shiftDetalle && (
                <div style={{ borderRadius: 12, border: '1px solid rgba(143,175,212,0.15)', background: '#141820', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Detalle del corte</div>
                    <button onClick={() => setSelectedShift(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    {shiftDetalle.canales.map(c => (
                      <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 14, color: c.resta ? 'rgba(252,165,165,0.6)' : 'rgba(255,255,255,0.5)' }}>{c.label}</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 15, fontWeight: 400, color: c.resta ? 'rgba(252,165,165,0.8)' : '#c8cdd8' }}>
                            {c.resta ? '-' : ''}{fmt(c.valor)}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                            {shiftDetalle.total > 0 ? (c.valor / shiftDetalle.total * 100).toFixed(1) : '0.0'}%
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', marginTop: 4 }}>
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
                      <span style={{ fontSize: 22, fontWeight: 300, color: '#4ade80' }}>{fmt(shiftDetalle.total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
