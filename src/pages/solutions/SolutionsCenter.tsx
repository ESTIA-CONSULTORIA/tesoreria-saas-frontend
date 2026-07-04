import { useState, useEffect } from 'react';
import { api } from '../../core/api/api';
import MainLayout from '../../core/layout/MainLayout';
import { useAuthStore } from '../../core/store/useAuthStore';

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Núcleo del sistema',
  finanzas: 'Finanzas',
  operaciones: 'Operaciones',
  pos: 'Punto de Venta',
  salud: 'Salud',
  rh: 'Recursos Humanos',
  analitica: 'Analítica',
  documentos: 'Documentos',
  tecnologia: 'Tecnología',
  admin: 'Administración',
  comercial: 'Comercial',
};

export default function SolutionsCenter() {
  const tenantId = useAuthStore(s => s.tenantId);
  const [allModules, setAllModules] = useState<any[]>([]);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/modules'),
      tenantId ? api.get(`/modules/tenant/${tenantId}`) : Promise.resolve({ data: [] }),
    ]).then(([all, active]) => {
      setAllModules(Array.isArray(all.data) ? all.data : []);
      setActiveModules(Array.isArray(active.data) ? active.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [tenantId]);

  const categories = ['all', ...Array.from(new Set(allModules.map(m => m.category)))];

  const filtered = selectedCategory === 'all'
    ? allModules
    : allModules.filter(m => m.category === selectedCategory);

  const requestModule = (moduleCode: string, moduleName: string) => {
    setRequesting(moduleCode);
    const msg = encodeURIComponent(
      `Hola ESTIA, me interesa activar el módulo *${moduleName}* en mi cuenta.\n\nPor favor contáctenme para más información.`
    );
    window.open(`https://wa.me/526862614129?text=${msg}`, '_blank');
    setTimeout(() => setRequesting(null), 2000);
  };

  return (
    <MainLayout>
      <div style={{ padding: '20px 0', maxWidth: 1100 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(143,175,212,0.6)', textTransform: 'uppercase', marginBottom: 8 }}>
            ESTIA ERP
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 200, color: '#e8ecf0', marginBottom: 8, letterSpacing: '-0.01em' }}>
            Centro de Soluciones
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontWeight: 300, maxWidth: 500, lineHeight: 1.7 }}>
            Expande las capacidades de tu sistema. Activa módulos adicionales según las necesidades de tu negocio.
          </p>
        </div>

        {/* Filtros por categoría */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
              padding: '6px 16px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${selectedCategory === cat ? 'rgba(143,175,212,0.4)' : 'rgba(255,255,255,0.08)'}`,
              background: selectedCategory === cat ? 'rgba(143,175,212,0.1)' : 'transparent',
              color: selectedCategory === cat ? '#8fafd4' : 'rgba(255,255,255,0.35)',
            }}>
              {cat === 'all' ? 'Todos' : CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', padding: 60 }}>Cargando...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(m => {
              const isActive = activeModules.includes(m.code);
              return (
                <div key={m.code} style={{
                  borderRadius: 14,
                  border: `1px solid ${isActive ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`,
                  background: isActive ? 'rgba(74,222,128,0.03)' : 'rgba(255,255,255,0.02)',
                  padding: '20px 22px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#c8cdd8', marginBottom: 4 }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {CATEGORY_LABELS[m.category] || m.category}
                      </div>
                    </div>
                    {isActive ? (
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: 'rgba(74,222,128,0.12)', color: '#4ade80', letterSpacing: '0.08em' }}>
                        ACTIVO
                      </span>
                    ) : m.isAddon ? (
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: 'rgba(143,175,212,0.08)', color: '#8fafd4', letterSpacing: '0.08em' }}>
                        ADD-ON
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>
                        INCLUIDO
                      </span>
                    )}
                  </div>

                  {m.description && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>{m.description}</div>
                  )}

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {m.isAddon && m.defaultPrice > 0 && !isActive && (
                      <div style={{ fontSize: 13, color: '#c8cdd8' }}>
                        <span style={{ fontSize: 18, fontWeight: 300 }}>${m.defaultPrice}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>/mes</span>
                      </div>
                    )}
                    {isActive ? (
                      <div style={{ fontSize: 12, color: 'rgba(74,222,128,0.6)' }}>✓ Módulo activo en tu cuenta</div>
                    ) : m.isAddon ? (
                      <button onClick={() => requestModule(m.code, m.name)}
                        disabled={requesting === m.code}
                        style={{
                          padding: '8px 16px', borderRadius: 8, border: 'none',
                          background: 'rgba(143,175,212,0.1)', color: '#8fafd4',
                          fontSize: 12, cursor: 'pointer', letterSpacing: '0.05em',
                          opacity: requesting === m.code ? 0.5 : 1,
                        }}>
                        {requesting === m.code ? 'Abriendo WhatsApp...' : 'Solicitar activación'}
                      </button>
                    ) : (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Incluido en tu plan</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
