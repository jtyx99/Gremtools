/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Address the site is served under. '/' for a root domain; GitHub Pages project
// sites live under '/<repository>/', which the deploy workflow passes in.
const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/')

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      
      manifest: {
        name: 'Gremtools',
        short_name: 'Gremtools',
        description: 'Private, in-browser tools for PDFs, images and colour. Files never leave your device.',
        theme_color: '#15171c',
        background_color: '#15171c',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache everything, including the MuPDF WASM (~10 MB), so every tool works offline.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,wasm,woff2}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        navigateFallback: 'index.html',
        globIgnores: ['404.html'],
      },
    }),
  ],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['mupdf'] },
  build: { target: 'es2022' },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
  },
})
