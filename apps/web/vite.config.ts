import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  define: {
    // Force demo mode for GitHub Pages builds
    ...(process.env.VITE_DEMO_MODE === 'true' || process.env.VITE_BASE === '/Orbito/'
      ? { 'import.meta.env.VITE_DEMO_MODE': JSON.stringify('true') }
      : {}),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
      '@orbito/shared': path.resolve(rootDir, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    include: ['zod'],
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
