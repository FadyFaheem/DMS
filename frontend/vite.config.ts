import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Hostnames allowed when running behind a Cloudflare Tunnel (Vite blocks unknown hosts).
const ALLOWED_HOSTS: string[] = ['dms-dev.faheemlabs.com'];

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ALLOWED_HOSTS,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
    // Polling is required when source is bind-mounted from the host into a
    // container (Podman/WSL2/Docker). Disable if running natively for perf.
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
});
