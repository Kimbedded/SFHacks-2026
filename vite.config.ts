import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin, loadEnv } from 'vite';
import express from 'express';
import { apiRouter } from './server/apiRouter';

function expressApiPlugin(): Plugin {
  return {
    name: 'express-api-plugin',
    configureServer(server) {
      const app = express();
      app.use(express.json({ limit: '25mb' }));
      app.use(express.urlencoded({ extended: true, limit: '25mb' }));
      app.use('/api', apiRouter);
      server.middlewares.use(app);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const googleMapsKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    env.VITE_GOOGLE_MAPS_API_KEY ||
    '';

  return {
    plugins: [react(), tailwindcss(), expressApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    envPrefix: ['VITE_', 'GOOGLE_MAPS_'],
    define: {
      'import.meta.env.GOOGLE_MAPS_API_KEY': JSON.stringify(googleMapsKey),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(googleMapsKey),
    },
    server: {
      headers: {
        'Permissions-Policy': 'microphone=*, camera=*, geolocation=*',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
