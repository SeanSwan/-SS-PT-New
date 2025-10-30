import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react()
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    // Vite's [hash] automatically provides content-based cache-busting
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
      // REMOVED incorrect 'external' configuration that was breaking V2 imports
      // V2 files ARE part of our bundle and should NOT be marked as external
      // Legacy/backup files are already excluded via tsconfig.json
    }
  }
});
