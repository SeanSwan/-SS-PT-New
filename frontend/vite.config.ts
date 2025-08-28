/**
 * Vite Configuration - MINIMAL BUILD
 * ====================================
 * Ultra-minimal config to eliminate Y.create error
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  // Minimal build configuration
  build: {
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
    // REMOVED MANUAL CHUNKS - This was forcing styled-components to be bundled
    rollupOptions: {
      output: {
        // Let Vite decide chunking automatically
      }
    },
    chunkSizeWarningLimit: 1000
  },
  
  // Development optimizations
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils')
    }
  },
  
  // MINIMAL dependency optimization - only include what's actually imported
  optimizeDeps: {
    include: [
      'react',
      'react-dom'
    ]
    // REMOVED all the UI libraries that were being pre-bundled
  },
  
  // Environment variables
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString())
  }
});
