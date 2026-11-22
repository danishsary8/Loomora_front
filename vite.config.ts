/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Loomora',
        short_name: 'Loomora',
        description: 'Plan your day, focus on it, and see how it really went.',
        start_url: '/today',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#F5EDE6',
        background_color: '#F5EDE6',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Claim the initial uncontrolled tab so first-visit offline mode works before a reload,
        // while keeping skipWaiting prompt-controlled so updates never silently reload active work.
        clientsClaim: true,
        // The whole app shell (JS, CSS, fonts, icons) is cached so it opens offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api(?:\/|\?|$)/,
          /^\/assets(?:\/|\?|$)/,
          /^\/(?:sw\.js|manifest\.webmanifest|workbox-[^/]+\.js)(?:\?|$)/,
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
