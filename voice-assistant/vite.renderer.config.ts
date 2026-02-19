import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Renderer process Vite config (React app)
export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  publicDir: 'public',
  base: './',
  build: {
    outDir: '../../.vite/renderer/main_window',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
});
