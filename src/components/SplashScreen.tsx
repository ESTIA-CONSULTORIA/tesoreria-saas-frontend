import { useEffect, useState, useRef } from 'react';

const ESTIA_LOGO = 'https://res.cloudinary.com/dv8wvstg2/image/upload/v1782467090/estia/brand/estia-logo-transparent.png';

interface Props {
  onDone: () => void;
}

export function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 800);
    const t2 = setTimeout(() => setPhase('out'), 3200);
    const t3 = setTimeout(() => onDone(), 3900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Canvas de partículas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; color: string }[] = [];
    const colors = ['#4a90c4', '#8fafd4', '#2d6a8e', '#c8dae8', '#6b9ab8'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  const opacity = phase === 'in' ? 0 : phase === 'out' ? 0 : 1;
  const logoScale = phase === 'in' ? 0.8 : phase === 'out' ? 1.08 : 1;
  const transition = 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.34,1.56,0.64,1)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#1a1f2e',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: phase === 'out' ? 0 : 1,
      transition: phase === 'out' ? 'opacity 0.7s ease' : 'none',
      overflow: 'hidden',
    }}>
      {/* Fondo con textura similar al logo */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 35%, #1e2d4a 0%, #0e1520 50%, #080c14 100%)',
      }} />

      {/* Canvas de partículas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Barrido de luz (lens flare) */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-20%', left: '-30%',
          width: '80px', height: '200%',
          background: 'linear-gradient(90deg, transparent, rgba(180,210,240,0.12), rgba(255,255,255,0.06), rgba(180,210,240,0.08), transparent)',
          transform: 'rotate(-20deg)',
          animation: 'lensflare 3.5s ease-in-out infinite',
        }} />
      </div>

      {/* Logo */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        opacity,
        transform: `scale(${logoScale})`,
        transition,
      }}>
        {/* Halo detrás del logo */}
        <div style={{
          position: 'absolute',
          width: 280, height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,106,142,0.18) 0%, transparent 70%)',
          animation: 'pulse-halo 2.5s ease-in-out infinite',
        }} />

        <img
          src={ESTIA_LOGO}
          alt="ESTIA Consultoría"
          style={{ width: 240, height: 240, objectFit: 'contain', position: 'relative', zIndex: 1 }}
        />

        {/* Tipografía destacada */}
        <div style={{
          marginTop: 8,
          fontSize: 11,
          letterSpacing: '0.5em',
          color: 'rgba(180,210,235,0.55)',
          textTransform: 'uppercase',
          fontWeight: 300,
          position: 'relative',
        }}>
          <span style={{
            background: 'linear-gradient(90deg, rgba(180,210,235,0.3), rgba(200,225,245,0.8), rgba(180,210,235,0.3))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 100%',
            animation: 'shimmer-text 3s ease-in-out infinite',
          }}>
            Sistema de gestión empresarial
          </span>
        </div>
      </div>

      {/* Barra de carga */}
      <div style={{
        position: 'relative', zIndex: 2,
        marginTop: 52,
        width: 200,
        height: 2,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 99,
        overflow: 'hidden',
        opacity,
        transition,
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #1a5276, #2d6a8e, #8fafd4, #c8dae8)',
          borderRadius: 99,
          animation: 'estia-load 3s cubic-bezier(0.4,0,0.2,1) forwards',
        }} />
        {/* Brillo sobre la barra */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          animation: 'bar-shine 3s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @keyframes estia-load {
          0%   { width: 0%; }
          20%  { width: 15%; }
          60%  { width: 70%; }
          85%  { width: 90%; }
          100% { width: 100%; }
        }
        @keyframes lensflare {
          0%   { left: -30%; opacity: 0; }
          10%  { opacity: 1; }
          40%  { left: 110%; opacity: 0.8; }
          41%  { opacity: 0; }
          100% { left: 110%; opacity: 0; }
        }
        @keyframes pulse-halo {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%       { transform: scale(1.15); opacity: 1; }
        }
        @keyframes shimmer-text {
          0%   { background-position: 100% 50%; }
          50%  { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes bar-shine {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(400%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
