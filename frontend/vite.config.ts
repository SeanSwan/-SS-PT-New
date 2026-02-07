import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Ensure public folder files (including _redirects) are copied to dist
  publicDir: 'public',
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
        // Performance: Split vendor bundles for better caching
        manualChunks: {
          // React core - rarely changes, cache aggressively
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Styled components - separate chunk prevents duplication
          'styled-components': ['styled-components'],
          // Animation libraries - used across many components
          'animation-vendor': ['framer-motion'],
          // Data fetching - used everywhere
          'query-vendor': ['@tanstack/react-query'],
          // Redux state management
          'redux-vendor': ['react-redux', '@reduxjs/toolkit'],
          // Date utilities
          'date-vendor': ['date-fns'],
          // Icons - lazy load separately
          'icons-vendor': ['lucide-react'],
        }
      }
      // REMOVED incorrect 'external' configuration that was breaking V2 imports
      // V2 files ARE part of our bundle and should NOT be marked as external
      // Legacy/backup files are already excluded via tsconfig.json
    }
  }
});
