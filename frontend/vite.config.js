import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '*.ngrok-free.dev',
      'exactable-discretional-zion.ngrok-free.dev',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
