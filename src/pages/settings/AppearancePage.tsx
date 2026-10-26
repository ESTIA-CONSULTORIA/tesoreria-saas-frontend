import { useState, useEffect, useRef } from 'react';
import MainLayout from '../../core/layout/MainLayout';
import { api } from '../../core/api/api';
import { useBrandingStore } from '../../core/store/useBrandingStore';
import { SplashScreen } from '../../components/SplashScreen';
import { SKINS, skinsParaRol, resolverSkin, type SkinId } from '../../core/theme/skins';
import { fijarSkinDispositivo, fijarSkinNegocio, fijarSkinUsuario, rolActual, skinDispositivo, skinUsuario } from '../../core/theme/aplicarSkin';
import { useAuthStore } from '../../core/store/useAuthStore';

const COLOR_PALETTE = [
  // Azules y grises
  '#8fafd4','#6b8cae','#4a7a9b','#2d6a8e','#1a5276',
  '#5d7b8a','#4a6274','#364d5f','#2c3e50','#1a252f',
  // Verdes apagados
  '#7daa8a','#5d9070','#3d7a5a','#2d6645','#1e5233',
  '#8aaa7d','#6a8a5d','#506e45','#3d5c34','#2a4023',
  // Terracota y tierra
  '#c4956a','#b07d52','#9a6840','#7d5130','#5d3a20',
  '#a0856d','#8a6e58','#745844','#5c4433','#3d2b1f',
  // Púrpuras y vinos
  '#9b8ab4','#7d6a9a','#5f4d7e','#483764','#30224a',
  '#a07080','#8a5a6e','#70465a','#5a3048','#3a1e30',
  // Neutros premium
  '#8a8a8a','#6e7280','#5a5e6e','#464a5a','#303444',
];

const GOOGLE_FONTS = [
  'Inter','Roboto','Poppins','Montserrat','Lato',
  'Open Sans','Nunito','Raleway','Source Sans Pro','Merriweather',
  'Playfair Display','DM Sans','Outfit','Sora','Plus Jakarta Sans',
  'Figtree','Manrope','Work Sans','IBM Plex Sans','Karla',
];

interface Form {
  logoUrl: string;
  accentColor: string;
  fontFamily: string;
  theme: string; // skin del negocio: 'estia' | 'oscuro'
}

export default function AppearancePage() {
  const store = useBrandingStore();
  const tenantId = localStorage.getItem('tenant_id') || '';
  const headers = { 'x-tenant-id': tenantId };

  const [form, setForm] = useState<Form>({
    logoUrl: store.logoUrl || '',
    accentColor: store.accentColor || '#8fafd4',
    fontFamily: store.fontFamily || 'Inter',
    theme: resolverSkin(null, store.theme, { rol: rolActual() }),
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [previewSplash, setPreviewSplash] = useState(false);
  const [esteEquipo, setEsteEquipo] = useState<string>(() => skinDispositivo() ?? '');
  const rol = useAuthStore((st) => st.user?.roleCode);
  const skinsOfrecidas = skinsParaRol(rol); // Claro y Alto contraste: solo ADMIN y SOPORTE hasta terminar las olas 2 a 4
  const [miTema, setMiTema] = useState<string>(() => skinUsuario() ?? '');
  const [errorTema, setErrorTema] = useState('');

  async function elegirMiTema(valor: string) {
    const previo = miTema;
    setMiTema(valor); setErrorTema('');
    fijarSkinUsuario(valor || null); // se ve al instante
    try {
      await api.put('/auth/me/ui-prefs', { skin: valor || null });
    } catch (e: unknown) {
      setMiTema(previo); fijarSkinUsuario(previo || null);
      setErrorTema((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'No se pudo guardar tu tema');
    }
  }
  const logoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await api.get(`/tenant-settings/${tenantId}`, { headers });
      if (res.data) {
        setForm({
          logoUrl: res.data.logoUrl || '',
          accentColor: res.data.accentColor || '#8fafd4',
          fontFamily: res.data.fontFamily || 'Inter',
          theme: resolverSkin(null, res.data.theme, { rol: rolActual() }),
        });
      }
    } catch { /* ignore */ }
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setForm(f => ({ ...f, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put(`/tenant-settings/${tenantId}`, {
        logoUrl: form.logoUrl,
        accentColor: form.accentColor,
        fontFamily: form.fontFamily,
        theme: form.theme,
      }, { headers });
      store.setBranding({
        logoUrl: form.logoUrl,
        accentColor: form.accentColor,
        fontFamily: form.fontFamily,
        theme: form.theme,
      });
      setSuccess('Apariencia guardada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const s = {
    section: { marginBottom: 32 } as React.CSSProperties,
    label: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginBottom: 8, display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#c8cdd8', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 } as React.CSSProperties,
    swatch: (color: string, selected: boolean): React.CSSProperties => ({
      width: 28, height: 28, borderRadius: 6, background: color, cursor: 'pointer',
      border: selected ? `2px solid #fff` : '2px solid transparent',
      boxShadow: selected ? `0 0 0 2px ${color}` : 'none',
      transition: 'all 0.15s',
      flexShrink: 0,
    }),
  };

  return (
    <MainLayout>
      {previewSplash && (
        <SplashScreen onDone={() => setPreviewSplash(false)} />
      )}

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#c8cdd8', margin: 0 }}>Apariencia</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Personaliza la identidad visual de tu plataforma</p>
        </div>

        {/* Logo */}
        <div style={s.section}>
          <div style={s.card}>
            <label style={s.label}>Logo de la empresa</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.15)' }}>✦</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input ref={logoFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoFile} />
                <button onClick={() => logoFileRef.current?.click()}
                  style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                  Subir archivo
                </button>
                {form.logoUrl && (
                  <button onClick={() => setForm(f => ({ ...f, logoUrl: '' }))}
                    style={{ marginLeft: 8, fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(252,165,165,0.2)', background: 'transparent', color: 'rgba(252,165,165,0.6)', cursor: 'pointer' }}>
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Color de acento */}
        <div style={s.section}>
          <div style={s.card}>
            <label style={s.label}>Color de acento</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {COLOR_PALETTE.map(c => (
                <div key={c} style={s.swatch(c, form.accentColor === c)}
                  onClick={() => setForm(f => ({ ...f, accentColor: c }))} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={form.accentColor}
                onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                style={{ width: 40, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} />
              <input type="text" value={form.accentColor}
                onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                placeholder="#8fafd4" style={{ ...s.input, flex: 1 }} />
            </div>
          </div>
        </div>

        {/* Tipografía */}
        <div style={s.section}>
          <div style={s.card}>
            <label style={s.label}>Tipografía</label>
            <select value={form.fontFamily}
              onChange={e => setForm(f => ({ ...f, fontFamily: e.target.value }))}
              style={{ ...s.input, fontFamily: form.fontFamily }}>
              {GOOGLE_FONTS.map(f => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontFamily: form.fontFamily, color: '#c8cdd8', fontSize: 14 }}>
              Vista previa: El sistema de gestión empresarial
            </div>
          </div>
        </div>

        {/* Tema */}
        <div style={s.section}>
          <div style={s.card}>
            <label style={s.label} htmlFor="tema-negocio">Tema del negocio</label>
            <div id="tema-negocio" role="radiogroup" aria-label="Tema del negocio" style={{ display: 'flex', gap: 10 }}>
              {skinsOfrecidas.map(t => (
                <button key={t} type="button" role="radio" aria-checked={form.theme === t} onClick={() => setForm(f => ({ ...f, theme: t }))}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    border: form.theme === t ? "2px solid rgb(var(--focus))" : "1px solid rgb(var(--border-field))",
                    background: form.theme === t ? "rgb(var(--surface-2))" : "transparent",
                    color: form.theme === t ? "rgb(var(--text-1))" : "rgb(var(--text-2))",
                    fontSize: 13, cursor: 'pointer', fontWeight: form.theme === t ? 500 : 400,
                  }}>
                  {SKINS[t].nombre} <span style={{ color: 'rgb(var(--text-3))', fontWeight: 400 }}>· {SKINS[t].descripcion}</span>
                </button>
              ))}
            </div>
            <label style={{ ...s.label, marginTop: 16 }} htmlFor="tema-usuario">Mi tema (en todos mis equipos)</label>
            <select id="tema-usuario" value={miTema} onChange={(e) => { void elegirMiTema(e.target.value); }} style={s.input}>
              <option value="">Igual que el negocio</option>
              {skinsOfrecidas.map(t => <option key={t} value={t}>{SKINS[t].nombre}</option>)}
            </select>
            {errorTema && <div role="alert" style={{ marginTop: 6, fontSize: 12, color: 'rgb(var(--danger))' }}>{errorTema}</div>}
            <label style={{ ...s.label, marginTop: 16 }} htmlFor="tema-equipo">Solo en este equipo</label>
            <select id="tema-equipo" value={esteEquipo}
              onChange={(e) => { const v = e.target.value; setEsteEquipo(v); fijarSkinDispositivo(v ? (v as SkinId) : null); }}
              style={s.input}>
              <option value="">Igual que el negocio</option>
              {skinsOfrecidas.map(t => <option key={t} value={t}>{SKINS[t].nombre}</option>)}
            </select>
            <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              El tema del negocio se guarda con «Guardar» y es el que ven todos por defecto. «Mi tema» es tu preferencia y se guarda al elegirla. La elección de este equipo se aplica al instante y solo vale aquí (útil en una caja que debe verse siempre igual); gana a las otras dos.
            </div>
          </div>
        </div>

        {/* Acciones */}
        {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</div>}
        {success && <div style={{ padding: '10px 14px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, color: '#4ade80', fontSize: 13, marginBottom: 16 }}>{success}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setPreviewSplash(true)}
            style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>
            Vista previa del splash
          </button>
          <button onClick={save} disabled={saving}
            style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: form.accentColor, color: '#fff', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar apariencia'}
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
