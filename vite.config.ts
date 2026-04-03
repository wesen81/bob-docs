import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Use absolute paths so assets load correctly on page refresh with client-side routing
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure consistent asset naming
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    proxy: {
      '/api': 'http://localhost:3000',
      '/docs': 'http://localhost:3000',
      '/manifest.json': 'http://localhost:3000',
    },
  },
})
