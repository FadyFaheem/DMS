import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Hostnames allowed when running behind a Cloudflare Tunnel (Vite blocks unknown hosts).
const ALLOWED_HOSTS: string[] = ['dms-dev.faheemlabs.com', 'dms.faheemlabs.com'];

export default defineConfig({
  plugins: [react()],
  build: {
    // @react-three/uikit registers each component in R3F's global catalogue
    // keyed by its class name (build() uses Component.name). The default esbuild
    // minifier mangles class names, so distinct classes (e.g. Container vs Svg)
    // collide on one key and a container renders as an svg -> "the svg component
    // can not have any children" in production builds only. Terser with
    // keep_classnames/keep_fnames preserves the names and prevents the collision.
    minify: 'terser',
    terserOptions: { keep_classnames: true, keep_fnames: true },
  },
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
