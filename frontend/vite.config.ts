import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react()
  ],
  optimizeDeps: {
    // Force Vite to pre-bundle and dedupe these packages
    include: ['styled-components', 'react', 'react-dom'],
    // Ensure single instance in both dev and production
    force: true
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    // Ensure case-sensitive file resolution matches Linux/Render environment
    preserveSymlinks: false,
    // Dedupe styled-components to prevent "we.div is not a function" error in production
    // This ensures only one instance of styled-components exists in the bundle
    dedupe: ['styled-components', 'react', 'react-dom'],
    alias: {
      // Force all imports to use the same styled-components instance
      'styled-components': 'styled-components'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // Enable sourcemaps to debug the styled-components issue
    minify: 'esbuild', // Re-enabled minification for production
    // Force new file paths to bypass Cloudflare CDN cache
    // Changed from /assets/ to /v3/ to force cache miss
    rollupOptions: {
      output: {
        entryFileNames: 'v3/[name].[hash].js',
        chunkFileNames: 'v3/[name].[hash].js',
        assetFileNames: 'v3/[name].[hash].[ext]',
        // Ensure styled-components is in its own chunk to prevent duplication
        manualChunks: {
          'styled-components': ['styled-components']
        }
      }
      // REMOVED incorrect 'external' configuration that was breaking V2 imports
      // V2 files ARE part of our bundle and should NOT be marked as external
      // Legacy/backup files are already excluded via tsconfig.json
    }
  }
});
