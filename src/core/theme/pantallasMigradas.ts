// Pantallas y componentes ya migrados a los tokens de las skins (docs/PLAN-SKINS.md). CERO TOLERANCIA: `coloresFijos.spec.ts` falla si alguno
// vuelve a tener un color fijo (hex, rgb(), clase de paleta de Tailwind o color con nombre). Se agrega aquí cada archivo al cerrar su ola; no se quita ninguno.
// Rutas relativas a src/.
export const PANTALLAS_MIGRADAS: readonly string[] = [
  // Ola 0: cáscara compartida
  'App.tsx',
  'core/layout/Header.tsx',
  'core/layout/MainLayout.tsx',
  'core/layout/TopBar.tsx',
  'core/pwa/UpdatePrompt.tsx',
  'core/components/GlobalSearchModal.tsx',
  'core/components/ModalPOS.tsx',
  'core/components/NoContextBanner.tsx',
  'core/components/reglasModal.ts',
];
