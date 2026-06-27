import { useNavigate } from "react-router-dom";
import { useState } from "react";
import TopBar from "./TopBar";
import { useBrandingStore } from "../store/useBrandingStore";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import GlobalSearchModal from "../components/GlobalSearchModal";

interface Props {
  children: React.ReactNode;
}

export default function MainLayout({ children }: Props) {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const { backgroundImage } = useBrandingStore();

  useKeyboardShortcuts([
    { key: "k", ctrl: true, action: () => setSearchOpen(true) },
    { key: "Escape", action: () => { if (searchOpen) setSearchOpen(false); } },
    { key: "1", alt: true, action: () => navigate("/dashboard") },
    { key: "2", alt: true, action: () => navigate("/movements") },
    { key: "3", alt: true, action: () => navigate("/transfers") },
    { key: "4", alt: true, action: () => navigate("/reports") },
  ]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      color: '#c8cdd8',
      ...(backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      } : { backgroundColor: '#0f1117' }),
    }}>
      {backgroundImage && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          zIndex: 0, pointerEvents: 'none',
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <TopBar />
        <main style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
          backgroundColor: backgroundImage ? 'transparent' : '#0f1117',
        }}>
          {children}
        </main>
      </div>

      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
