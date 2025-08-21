/**
 * Vite Configuration - BUILD OPTIMIZED
 * ====================================
 * Optimized for fast builds and production performance
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  // Build optimizations
  build: {
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@mui/icons-material', 'styled-components'],
          charts: ['framer-motion']
        }
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
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      'styled-components',
      'framer-motion'
    ]
  },
  
  // Environment variables
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString())
  }
});
