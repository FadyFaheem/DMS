import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Add tunnel hostnames here when running behind a Cloudflare Tunnel,
// e.g. ['dev-project.example.com', 'project.example.com']
const ALLOWED_HOSTS: string[] = []

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
})
