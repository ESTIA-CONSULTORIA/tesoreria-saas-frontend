import { useState, useEffect } from 'react';
import { api } from '../../core/api/api';
import MainLayout from '../../core/layout/MainLayout';

export default function DashboardLite() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/pos/shifts', { params: { limit: 7 } })
      .then(r => setShifts(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const shiftTotal = (s: any): number => {
    let total = Number(s.efectivoContado || 0);
    if (s.notas) {
      const tarjeta   = s.notas.match(/Tarjeta[:\s]+\$?([\d,]+\.?\d*)/i);
      const transf    = s.notas.match(/Transferencia[:\s]+\$?([\d,]+\.?\d*)/i);
      const plat      = s.notas.match(/Plataformas[:\s]+\$?([\d,]+\.?\d*)/i);
      const prom      = s.notas.match(/Promociones[:\s]+\$?([\d,]+\.?\d*)/i);
      const cortesia  = s.notas.match(/Cortesías[:\s]+\$?([\d,]+\.?\d*)/i);
      const descuento = s.notas.match(/Descuentos[:\s]+\$?([\d,]+\.?\d*)/i);
      const gasto     = s.notas.match(/Gastos[:\s]+\$?([\d,]+\.?\d*)/i);
      if (tarjeta)   total += parseFloat(tarjeta[1].replace(/,/g, ''));
      if (transf)    total += parseFloat(transf[1].replace(/,/g, ''));
      if (plat)      total += parseFloat(plat[1].replace(/,/g, ''));
      if (prom)      total += parseFloat(prom[1].replace(/,/g, ''));
      if (cortesia)  total -= parseFloat(cortesia[1].replace(/,/g, ''));
      if (descuento) total -= parseFloat(descuento[1].replace(/,/g, ''));
      if (gasto)     total -= parseFloat(gasto[1].replace(/,/g, ''));
    }
    return total;
  };

  const total = shifts.reduce((sum, s) => sum + shiftTotal(s), 0);

  return (
    <MainLayout>
      <div style={{ padding: '20px 0' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: '#c8cdd8', marginBottom: 4 }}>
          Resumen del negocio
        </h1>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
          Últimos 7 cortes registrados
        </div>

        <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>VENTA TOTAL (7 DÍAS)</div>
          <div style={{ fontSize: 32, fontWeight: 500, color: '#4ade80' }}>
            ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>Cargando...</div>
        ) : shifts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>Sin cortes registrados aún</div>
        ) : (
          <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#141820', overflow: 'hidden' }}>
            {shifts.map((s: any) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 13, color: '#c8cdd8' }}>{new Date(s.fecha).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#4ade80' }}>${shiftTotal(s).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
