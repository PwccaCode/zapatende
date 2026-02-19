import { defineConfig } from 'vite';
import path from 'path';

// Preload script Vite config
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/preload/preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    outDir: '.vite/build',
    emptyOutDir: false,
    rollupOptions: {
      external: ['electron'],
    },
    minify: false,
    sourcemap: true,
  },
});
