import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development, Vite serves the app and forwards API calls to the gateway, so the
// browser only ever talks to one origin (no CORS), exactly like in production.
const gateway = process.env.GATEWAY_URL ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': gateway,
      '/docs': gateway,
    },
  },
});
