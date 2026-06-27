import { useEffect, useState } from 'react';
import { useBrandingStore } from '../core/store/useBrandingStore';

const ESTIA_LOGO = 'https://res.cloudinary.com/dv8wvstg2/image/upload/v1782465248/estia/brand/estia-logo.png';

interface Props {
  onDone: () => void;
}

export function OutroSplash({ onDone }: Props) {
  const { logoUrl } = useBrandingStore();
  const logo = logoUrl || ESTIA_LOGO;
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    setTimeout(() => setOpacity(1), 50);
    setTimeout(() => setOpacity(0), 2000);
    setTimeout(() => onDone(), 2600);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0a0c12',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20,
      opacity,
      transition: 'opacity 0.6s ease',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 45%, #0d1829 0%, #0a0c12 70%)',
      }} />
      <img
        src={logo}
        alt="Logo"
        style={{
          width: 140, height: 140,
          objectFit: 'contain',
          position: 'relative', zIndex: 1,
          opacity: 0.8,
          WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 55%, transparent 80%)',
          maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 55%, transparent 80%)',
          filter: 'drop-shadow(0 0 20px rgba(60,120,200,0.3))',
        }}
      />
      <div style={{
        position: 'relative', zIndex: 1,
        fontSize: 14,
        letterSpacing: '0.2em',
        color: 'rgba(140,175,210,0.5)',
        fontWeight: 300,
      }}>
        Hasta pronto
      </div>
      <div style={{
        position: 'absolute', bottom: 20, right: 24,
        fontSize: 10, color: 'rgba(255,255,255,0.15)',
        letterSpacing: '0.1em',
      }}>
        ESTIA ERP
      </div>
    </div>
  );
}
