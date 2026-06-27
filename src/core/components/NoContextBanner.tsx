import { useBrandingStore } from '../store/useBrandingStore';

const ESTIA_LOGO = 'https://res.cloudinary.com/dv8wvstg2/image/upload/v1782465248/estia/brand/estia-logo.png';

interface Props {
  message?: string;
}

export function NoContextBanner({ message }: Props) {
  const { logoUrl } = useBrandingStore();
  const logo = logoUrl || ESTIA_LOGO;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '65vh', gap: 20,
    }}>
      <img
        src={logo}
        alt="Logo"
        style={{
          width: 120, height: 120,
          objectFit: 'contain',
          opacity: 0.25,
          filter: 'grayscale(20%)',
          WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 55%, transparent 80%)',
          maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 55%, transparent 80%)',
        }}
      />
      <div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>
        {message || 'Selecciona una empresa y sucursal para continuar'}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', maxWidth: 320 }}>
        Usa el selector en la barra superior para elegir el contexto de trabajo
      </div>
    </div>
  );
}
