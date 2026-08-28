import { useRegisterSW } from 'virtual:pwa-register/react';

// Fase B (PWA instalable): registerType: 'prompt' en vite.config.ts, por sí solo, no
// muestra nada — solo expone el estado a través de este hook. Sin consumirlo, una
// actualización quedaría esperando en silencio hasta que el usuario cierre y reabra
// todas las pestañas, sin ningún aviso. Este componente cierra ese hueco: aviso mínimo,
// el cajero decide cuándo aplicar la actualización (nunca se aplica sola a mitad de turno).

// Auditoría de service worker (GoodsHabits): sin esto, needRefresh solo pasaba a true si
// el navegador decidía por su cuenta re-chequear sw.js — y eso típicamente ocurre en una
// navegación de página completa, no en el ruteo interno de una SPA. Una pestaña dejada
// abierta durante toda una sesión (confirmado con evidencia real: un smoke test de
// Compras quedó corriendo un build viejo en silencio, sin ningún error, hasta un hard
// reload manual) podía no disparar ese chequeo nunca. 30 min es un default razonable para
// una sesión de POS/ERP que puede durar un turno completo — ajustable, es un solo const.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Guard contra doble registro del intervalo — en dev, React StrictMode puede invocar
// efectos/callbacks de montaje dos veces; sin esto, dos intervalos corriendo en paralelo
// no rompen nada funcionalmente (ambos llaman al mismo registration.update() idempotente),
// pero duplican tráfico de red sin necesidad.
let pollingStarted = false;

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration || pollingStarted) return;
      pollingStarted = true;
      setInterval(() => registration.update(), CHECK_INTERVAL_MS);
    },
  });

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
      {/* Antes: "Hay una versión nueva disponible." — genérico y, peor, implicaba que el
          riesgo era NO actualizar. Es al revés: mientras no se haga clic, la pestaña sigue
          en la versión vieja funcionando normal, sin perder nada — el riesgo real está en
          el clic mismo, que recarga la página de inmediato (updateServiceWorker(true)) y
          puede tirar un formulario abierto o una venta a medio capturar. */}
      <span>Hay una versión nueva disponible. Guarda tu trabajo antes de actualizar — la página se recargará.</span>
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
