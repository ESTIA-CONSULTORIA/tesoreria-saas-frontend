import { useRegisterSW } from 'virtual:pwa-register/react';

// Fase B (PWA instalable): registerType: 'prompt' en vite.config.ts, por sí solo, no
// muestra nada — solo expone el estado a través de este hook. Sin consumirlo, una
// actualización quedaría esperando en silencio hasta que el usuario cierre y reabra
// todas las pestañas, sin ningún aviso. Este componente cierra ese hueco: aviso mínimo,
// el cajero decide cuándo aplicar la actualización (nunca se aplica sola a mitad de turno).
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        background: '#050B1A',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 14,
      }}
    >
      <span>Hay una versión nueva disponible.</span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          background: '#fff',
          color: '#050B1A',
          border: 'none',
          borderRadius: 6,
          padding: '6px 12px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Actualizar
      </button>
    </div>
  );
}
