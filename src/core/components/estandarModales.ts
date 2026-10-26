// Contadores del estándar de ventanas (docs/PLAN-MODALES.md). Los usan los specs con línea base que solo baja y el script
// `npm run modales:baseline`. Puros: reciben el texto del archivo.

/** Archivos .ts/.tsx de la app, sin specs ni declaraciones. */
export function seCuentaModal(rel: string): boolean {
  if (!/\.(ts|tsx)$/.test(rel) || /\.d\.ts$/.test(rel)) return false;
  return !/\.spec\.tsx?$/.test(rel);
}

/** La única implementación que puede pintar su propio overlay a pantalla completa. */
export const EXENTOS_OVERLAY: readonly string[] = ['core/components/Modal.tsx'];

/** Quita comentarios (// y /* *​/) para no contar lo que solo se menciona. */
export function sinComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/** Overlays escritos a mano: `fixed inset-0` (Tailwind) o `position: 'fixed', inset: 0` (estilo en línea). */
export function contarOverlaysPropios(texto: string): number {
  const t = sinComentarios(texto);
  return (t.match(/fixed\s+inset-0/g) ?? []).length + (t.match(/position:\s*['"]fixed['"]\s*,\s*inset:\s*0\b/g) ?? []).length;
}

/** alert( y confirm( nativos (también window.alert / window.confirm). No cuenta `.confirm(` de otros objetos ni `confirmar(`. */
export function contarDialogosNativos(texto: string): number {
  const t = sinComentarios(texto);
  return (t.match(/(?<![\w$.])(?:window\.)?(?:alert|confirm)\(/g) ?? []).length;
}
