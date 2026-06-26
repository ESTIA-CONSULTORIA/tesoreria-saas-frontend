import { useEffect, useState } from 'react';
import { useBrandingStore } from '../core/store/useBrandingStore';

interface Props {
  onDone: () => void;
}

export function SplashScreen({ onDone }: Props) {
  const { logoUrl, splashBg, accentColor, companyDisplayName, fontFamily } = useBrandingStore();
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setOpacity(1), 50);
    const t2 = setTimeout(() => setOpacity(0), 2200);
    const t3 = setTimeout(() => onDone(), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isImage = splashBg.startsWith('http') || splashBg.startsWith('data:');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: isImage ? `url(${splashBg}) center/cover` : splashBg,
      opacity, transition: 'opacity 0.5s ease',
      fontFamily: fontFamily || 'Inter',
    }}>
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" style={{ width: 100, height: 100, objectFit: 'contain', marginBottom: 20, borderRadius: 16 }} />
      ) : (
        <div style={{
          width: 100, height: 100, borderRadius: 16, marginBottom: 20,
          background: 'rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 32, color: accentColor || '#8fafd4' }}>✦</span>
        </div>
      )}

      {companyDisplayName && (
        <div style={{ fontSize: 28, fontWeight: 500, color: '#fff', marginBottom: 8, letterSpacing: '0.02em' }}>
          {companyDisplayName}
        </div>
      )}

      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 40 }}>
        Sistema de gestión empresarial
      </div>

      <div style={{ width: 200, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: accentColor || '#8fafd4',
          borderRadius: 99,
          animation: 'splash_loadbar 2s ease forwards',
        }} />
      </div>

      <div style={{
        position: 'absolute', bottom: 20, right: 24,
        display: 'flex', alignItems: 'center', gap: 5,
        opacity: 0.25,
      }}>
        <div style={{ width: 14, height: 14, background: 'rgba(255,255,255,0.5)', borderRadius: 3 }} />
        <span style={{ fontSize: 10, color: '#fff', letterSpacing: '0.05em' }}>ESTIA ERP</span>
      </div>

      <style>{`
        @keyframes splash_loadbar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
