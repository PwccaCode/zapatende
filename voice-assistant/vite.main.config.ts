import { defineConfig } from 'vite';
import path from 'path';

// Main process Vite config
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main/main.ts'),
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    outDir: '.vite/build',
    emptyOutDir: false,
    rollupOptions: {
      external: ['electron', 'electron-squirrel-startup'],
    },
    minify: false,
    sourcemap: true,
  },
});
