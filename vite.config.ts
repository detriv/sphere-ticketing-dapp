/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Allow access through public tunnels / non-localhost hosts (e.g. cloudflared
    // quick tunnel) so the Sphere wallet Connect popup can use an HTTPS origin.
    // For production builds this has no effect (static host).
    host: true,
    allowedHosts: true,
    // Proxy the shared metadata indexer so the dApp can call it same-origin
    // (avoids CORS / mixed-content when served through an HTTPS tunnel).
    // The indexer runs separately: `node indexer/server.mjs` (default :4178).
    proxy: {
      '/api': {
        target: 'http://localhost:4178',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
