import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'GatorAccess - SFSU Campus Accessibility Navigator',
          short_name: 'GatorAccess',
          description:
            'Accessible SFSU campus navigation, real-time elevator & ramp status, and offline caching for poor reception areas.',
          theme_color: '#4c1d95',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            // 1. Google Maps Tiles, Vectors & Static Map Assets (Offline map navigation)
            {
              urlPattern: /^https:\/\/.*\.googleapis\.com\/(maps|maps-api-v3|vt|khms).*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-maps-tiles-cache',
                expiration: {
                  maxEntries: 1200,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 2. Google Maps Static assets and gstatic resources
            {
              urlPattern: /^https:\/\/maps\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-maps-static-cache',
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 3. Core Campus Building Data API (Buildings, entrances, elevators, ramps)
            {
              urlPattern: /\/api\/buildings/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'campus-building-data-cache',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 4. Accessibility Barrier Reports API
            {
              urlPattern: /\/api\/reports/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'campus-barrier-reports-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 3 * 24 * 60 * 60, // 3 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 5. Transit & Alert Feeds
            {
              urlPattern: /\/api\/transit-alerts/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'campus-transit-alerts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 24 * 60 * 60, // 1 day
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 6. Web fonts
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
