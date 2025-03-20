import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import fs from 'fs';

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
    svgr(), // Handle SVG imports
    // Custom plugin to fix prop-types import issues
    {
      name: 'fix-prop-types-imports',
      transform(code, id) {
        // Fix the specific import in responsivePropType.js
        if (id.includes('responsivePropType.js') || id.includes('@mui') && code.includes('import PropTypes from')) {
          return code.replace(
            /import PropTypes from ["']prop-types["'];?/g,
            `import * as PropTypesModule from "prop-types"; const PropTypes = PropTypesModule;`
          );
        }
        return null;
      }
    },
    // Add development debugging plugin
    {
      name: 'log-server-requests',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Log API requests to help with debugging
          if (req.url.startsWith('/api')) {
            console.log(`[Vite Proxy] ${req.method} ${req.url}`);
          }
          next();
        });
      }
    }
  ],
  optimizeDeps: {
    exclude: [
      // Exclude MUI icons that are causing issues
      '@mui/icons-material',
      '@mui/material/CssBaseline'
    ],
    include: [
      // Include these specific dependencies to ensure proper bundling
      'react',
      'react-dom',
      'prop-types',
      '@emotion/react',
      '@emotion/styled'
    ],
    esbuildOptions: {
      // Allow JSX in .js files
      jsx: 'automatic',
    }
  },
  resolve: {
    alias: {
      // Explicit aliases for problematic packages
      'prop-types': path.resolve(__dirname, 'node_modules/prop-types'),
      'react-is': path.resolve(__dirname, 'node_modules/react-is'),
      
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
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'], // File extensions to try in order
    dedupe: ['react', 'react-dom', 'prop-types', 'react-is'], // Prevent duplicate packages
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
        rewrite: (path) => path,
        configure: (proxy, options) => {
          // Additional proxy configuration for debugging
          proxy.on('error', (err, req, res) => {
            console.error(`Proxy error: ${err.message}`);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
              });
              res.end(JSON.stringify({ 
                message: 'Proxy error, please ensure the backend server is running at http://localhost:5000',
                error: err.message
              }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Proxy] Request: ${req.method} ${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[Proxy] Response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
          });
        }
      },
    },
  },
  build: {
    sourcemap: true,
    commonjsOptions: {
      // Transform commonjs modules properly
      transformMixedEsModules: true,
      // Additional settings for prop-types
      include: [/prop-types/, /node_modules/],
    }
  }
});