/**
 * Vite Configuration - PRODUCTION OPTIMIZED
 * ========================================
 * Clean, minimal config for reliable Render.com builds
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  
  // Production backend URL
  const backendUrl = isProd 
    ? 'https://ss-pt-new.onrender.com' 
    : 'http://localhost:10000';
  
  console.log(`[Vite] Building for ${mode} mode with backend: ${backendUrl}`);
  
  return {
    plugins: [
      react({
        include: '**/*.{jsx,js,tsx,ts}',
      })
    ],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    
    build: {
      sourcemap: isProd ? false : true,
      outDir: 'dist',
      assetsDir: 'assets',
      target: 'es2015',
      minify: isProd ? 'esbuild' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['styled-components', 'framer-motion'],
            utils: ['axios', 'date-fns']
          }
        }
      }
    },
    
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: isProd,
        }
      },
    },
    
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(backendUrl),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(backendUrl),
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(backendUrl),
      'process.env.NODE_ENV': JSON.stringify(mode),
    }
  };
});
