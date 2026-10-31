import { useEffect, useState } from 'react';
import { esSkinId, SKIN_POR_DEFECTO, type SkinId } from './skins';

const leer = (): SkinId => {
  const v = typeof document === 'undefined' ? null : document.documentElement.getAttribute('data-skin');
  return esSkinId(v) ? v : SKIN_POR_DEFECTO;
};

/** La skin que está puesta ahora mismo en el documento (se actualiza sola si se cambia desde el selector de Tema). */
export function useSkinActiva(): SkinId {
  const [skin, setSkin] = useState<SkinId>(leer);
  useEffect(() => {
    const obs = new MutationObserver(() => setSkin(leer()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
    return () => obs.disconnect();
  }, []);
  return skin;
}
