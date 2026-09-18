import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'ArchiveTuna',
          short_name: 'ArchiveTuna',
          description: 'Stream live concerts, 78rpm gems and netlabel releases from Archive.org',
          theme_color: '#1A1A1A',
          background_color: '#1A1A1A',
          display: 'standalone',
          start_url: './',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/archive\.org\/services\/img\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'archive-covers', expiration: { maxEntries: 200, maxAgeSeconds: 2592000 } },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // jsmediatags ships a broken `browser` entry (dist/jsmediatags.js is
        // missing from the npm tarball) — point at the shipped UMD bundle.
        'jsmediatags': path.resolve(__dirname, 'node_modules/jsmediatags/dist/jsmediatags.min.js'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      chunkSizeWarningLimit: 300,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('scheduler')) return 'vendor';
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
