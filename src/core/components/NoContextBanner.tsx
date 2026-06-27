import { useBrandingStore } from '../store/useBrandingStore';

const ESTIA_LOGO = 'https://res.cloudinary.com/dv8wvstg2/image/upload/v1782465248/estia/brand/estia-logo.png';

export function NoContextBanner() {
  const { logoUrl } = useBrandingStore();
  const logo = logoUrl || ESTIA_LOGO;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '65vh',
    }}>
      <img
        src={logo}
        alt="Logo"
        style={{
          width: 140, height: 140,
          objectFit: 'contain',
          opacity: 0.12,
          WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 55%, transparent 80%)',
          maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 55%, transparent 80%)',
        }}
      />
    </div>
  );
}
