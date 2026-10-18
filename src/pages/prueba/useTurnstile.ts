import { useCallback, useEffect, useRef, useState } from 'react';

// Widget de Cloudflare Turnstile (modo explícito). La site key es pública; el secreto vive solo en el backend (TURNSTILE_SECRET).
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let cargando: Promise<void> | null = null;

function cargarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (cargando) return cargando;
  cargando = new Promise<void>((ok, fallo) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => ok();
    s.onerror = () => { cargando = null; fallo(new Error('No se pudo cargar la verificación.')); };
    document.head.appendChild(s);
  });
  return cargando;
}

export function useTurnstile(siteKey: string, habilitado: boolean) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!habilitado || !siteKey) return;
    let vivo = true;
    cargarScript()
      .then(() => {
        if (!vivo || !contenedor.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(contenedor.current, {
          sitekey: siteKey,
          theme: 'dark',
          size: 'flexible',
          callback: (t: string) => { setToken(t); setError(''); },
          'expired-callback': () => setToken(''),
          'error-callback': () => { setToken(''); setError('No pudimos verificar que eres una persona. Recarga la página.'); },
        });
      })
      .catch((e: Error) => vivo && setError(e.message));
    return () => {
      vivo = false;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, habilitado]);

  // El token de Turnstile es de un solo uso: tras cada intento (bueno o malo) hay que pedir otro.
  const reiniciar = useCallback(() => {
    setToken('');
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, []);

  return { contenedor, token, error, reiniciar };
}
