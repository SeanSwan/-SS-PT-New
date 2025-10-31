import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    // Ensure case-sensitive file resolution matches Linux/Render environment
    preserveSymlinks: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // Temporarily enable to debug React Error #306
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
