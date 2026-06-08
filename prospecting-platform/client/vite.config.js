import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api to the Express server on :4100.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || 4100}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
