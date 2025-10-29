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
      },
      // Exclude legacy/backup files from build
      external: (id) => {
        return (
          id.includes('.backup.') ||
          id.includes('-backup.') ||
          id.includes('-BACKUP.') ||
          id.includes('BACKUP') ||
          id.includes('.legacy.') ||
          id.includes('-legacy.') ||
          id.includes('-EMERGENCY.') ||
          id.includes('-ORIGINAL-') ||
          id.includes('-SIMPLIFIED-') ||
          id.includes('-fixed.') ||
          id.includes('.V2.')
        );
      }
    }
  }
});
