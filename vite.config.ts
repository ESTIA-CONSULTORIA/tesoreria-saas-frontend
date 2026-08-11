import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt': el usuario ve un aviso cuando hay versión nueva y decide cuándo
      // actualizar (no se actualiza solo, no interrumpe un turno a medias). Requiere
      // consumir el hook virtual:pwa-register/react en la app — ver src/App.tsx.
      registerType: 'prompt',
      // Fase B: solo "instalable" (manifest + precache del shell: HTML/CSS/JS/íconos).
      // Sin runtimeCaching de llamadas API ni cola offline — eso es Fase C/D, aparte.
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'ESTIA ERP',
        short_name: 'ESTIA',
        lang: 'es',
        theme_color: '#050B1A',
        background_color: '#050B1A',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  }
})
