import { useBrandingStore } from '../store/useBrandingStore';

const ESTIA_LOGO = 'https://res.cloudinary.com/dv8wvstg2/image/upload/v1782465248/estia/brand/estia-logo.png';

export function NoContextBanner() {
  const { logoUrl, splashBg } = useBrandingStore();
  const logo = logoUrl || ESTIA_LOGO;
  const bg = splashBg || '#0a0c12';
  const isImage = bg.startsWith('http') || bg.startsWith('data:');

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isImage ? `url(${bg}) center/cover no-repeat` : bg,
      zIndex: 0,
      pointerEvents: 'none',
    }}>
      <img
        src={logo}
        alt="Logo"
        style={{
          width: 220,
          height: 220,
          objectFit: 'contain',
          opacity: 0.5,
          mixBlendMode: 'luminosity',
        }}
      />
    </div>
  );
}
