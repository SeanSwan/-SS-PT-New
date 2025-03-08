import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable JSX in .js files
      include: '**/*.{jsx,js,tsx,ts}',
      babel: {
        plugins: [
          // Any babel plugins you need
        ]
      }
    }),
    svgr() // Handle SVG imports
  ],
  resolve: {
    alias: {
      // Berry Admin path aliases
      'ui-component': path.resolve(__dirname, './src/BerryAdmin/ui-component'),
      'store': path.resolve(__dirname, './src/BerryAdmin/store'),
      'menu-items': path.resolve(__dirname, './src/BerryAdmin/menu-items'),
      'layout': path.resolve(__dirname, './src/BerryAdmin/layout'),
      'views': path.resolve(__dirname, './src/BerryAdmin/views'),
      'contexts': path.resolve(__dirname, './src/BerryAdmin/contexts'),
      'hooks': path.resolve(__dirname, './src/BerryAdmin/hooks'),
      'api': path.resolve(__dirname, './src/BerryAdmin/api'),
      'config': path.resolve(__dirname, './src/BerryAdmin/config.js'),
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'] // File extensions to try in order
  },
  server: {
    port: 5173,
    hmr: {
      overlay: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: true
  }
});