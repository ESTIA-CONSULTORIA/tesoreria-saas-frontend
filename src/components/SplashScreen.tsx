import { useEffect, useState } from 'react';

const ESTIA_LOGO = 'https://res.cloudinary.com/dv8wvstg2/image/upload/v1782465248/estia/brand/estia-logo.png';

interface Props {
  onDone: () => void;
}

export function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600);
    const t2 = setTimeout(() => setPhase('out'), 2400);
    const t3 = setTimeout(() => onDone(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const opacity = phase === 'in' ? 0 : phase === 'out' ? 0 : 1;
  const logoScale = phase === 'in' ? 0.85 : phase === 'out' ? 1.05 : 1;
  const transition = phase === 'in'
    ? 'opacity 0.6s ease, transform 0.6s ease'
    : phase === 'out'
    ? 'opacity 0.6s ease, transform 0.6s ease'
    : 'none';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#080c14',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: phase === 'out' ? 0 : 1,
      transition: phase === 'out' ? 'opacity 0.6s ease' : 'none',
    }}>
      {/* Fondo con patrón sutil */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle at 50% 40%, #0d1829 0%, #080c14 70%)',
        opacity: 0.8,
      }} />

      {/* Logo + nombre */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 0,
        opacity,
        transform: `scale(${logoScale})`,
        transition,
      }}>
        <img
          src={ESTIA_LOGO}
          alt="ESTIA Consultoría"
          style={{
            width: 220,
            height: 220,
            objectFit: 'contain',
          }}
        />

        <div style={{
          fontSize: 13,
          letterSpacing: '0.35em',
          color: 'rgba(180,200,220,0.45)',
          textTransform: 'uppercase',
          marginTop: 4,
          fontWeight: 400,
        }}>
          Sistema de gestión empresarial
        </div>
      </div>

      {/* Barra de carga */}
      <div style={{
        position: 'relative', zIndex: 1,
        marginTop: 48,
        width: 180,
        height: 2,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 99,
        overflow: 'hidden',
        opacity,
        transition,
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #2d6a8e, #8fafd4)',
          borderRadius: 99,
          animation: 'estia-load 2s cubic-bezier(0.4,0,0.2,1) forwards',
        }} />
      </div>

      <style>{`
        @keyframes estia-load {
          0%   { width: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          85%  { width: 92%; }
          100% { width: 100%; opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
