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
  // Ola 1: dashboard, centro de soluciones y guía de la prueba (el login conserva su paleta propia por negocio: ver PLAN-SKINS §11)
  'pages/Dashboard/DashboardPage.tsx',
  'pages/Dashboard/DashboardLite.tsx',
  'pages/Dashboard/DashboardInfoModal.tsx',
  'pages/solutions/SolutionsCenter.tsx',
  'pages/prueba/PruebaWizard.tsx',
  'pages/prueba/prueba.css',
  'pages/prueba/ActivarPage.tsx',
  'pages/prueba/MarcoMonitor.tsx',
  'pages/prueba/PruebaLayout.tsx',
  'pages/prueba/SolicitudPage.tsx',
];
