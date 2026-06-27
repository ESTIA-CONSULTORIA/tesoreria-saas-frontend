import { useBrandingStore } from '../store/useBrandingStore';

const ESTIA_LOGO = 'https://res.cloudinary.com/dv8wvstg2/image/upload/v1782465248/estia/brand/estia-logo.png';

export function NoContextBanner() {
  const { logoUrl } = useBrandingStore();
  const logo = logoUrl || ESTIA_LOGO;

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <img
        src={logo}
        alt="Logo"
        style={{
          width: 200,
          height: 200,
          objectFit: 'contain',
          opacity: 0.5,
          WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 55%, transparent 80%)',
          maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 55%, transparent 80%)',
        }}
      />
    </div>
  );
}
