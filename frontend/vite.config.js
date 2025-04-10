import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Determine if we're in production mode
  const isProd = mode === 'production';
  
  // Set the appropriate backend URL based on environment
  const backendUrl = isProd 
    ? 'https://swanstudios.onrender.com' 
    : 'http://localhost:5000';
  
  console.log(`[Vite Config] Using backend URL: ${backendUrl} (${mode} mode)`);
  
  return {
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
      // Enhanced development debugging plugin
      {
        name: 'log-server-requests',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Log API requests to help with debugging
            if (req.url.startsWith('/api')) {
              console.log(`[Vite Proxy] ${req.method} ${req.url}`);
              
              // Add CORS headers manually for development environment
              if (!isProd) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
                res.setHeader('Access-Control-Allow-Credentials', 'true');
                
                // Handle OPTIONS requests directly
                if (req.method === 'OPTIONS') {
                  res.statusCode = 204;
                  res.end();
                  return;
                }
              }
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
      // Enhanced proxy configuration
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: isProd, // Set to true in production
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
                  message: `Proxy error, please ensure the backend server is running at ${backendUrl}`,
                  error: err.message
                }));
              }
            });
            
            // Enhanced request logging
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`[Proxy] Request: ${req.method} ${req.url} → ${backendUrl}${req.url}`);
              
              // Add custom headers to proxied requests if needed
              if (isProd) {
                proxyReq.setHeader('X-Forwarded-Host', 'sswanstudios.com');
                proxyReq.setHeader('X-Forwarded-Proto', 'https');
              }
            });
            
            // Enhanced response logging
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log(`[Proxy] Response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
              
              // Check if any CORS headers are missing and log them
              if (isProd) {
                const hasCorsOrigin = proxyRes.headers['access-control-allow-origin'];
                const hasCorsHeaders = proxyRes.headers['access-control-allow-headers'];
                const hasCorsCredentials = proxyRes.headers['access-control-allow-credentials'];
                
                if (!hasCorsOrigin || !hasCorsHeaders || !hasCorsCredentials) {
                  console.warn('[Proxy] Missing CORS headers in response:', {
                    origin: hasCorsOrigin || 'MISSING',
                    headers: hasCorsHeaders || 'MISSING',
                    credentials: hasCorsCredentials || 'MISSING'
                  });
                }
              }
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
      },
      // Output configuration - put built files in a directory structure that works with Render
      outDir: 'dist',
      assetsDir: 'assets',
      // Generate the correct base path for production
      base: isProd ? '/' : '/',
      // Add a cache-busting hash to file names in production
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@mui/material', '@emotion/react', '@emotion/styled'],
          },
          // Add content hash to ensure cache refreshing
          entryFileNames: isProd ? 'assets/[name].[hash].js' : 'assets/[name].js',
          chunkFileNames: isProd ? 'assets/[name].[hash].js' : 'assets/[name].js',
          assetFileNames: isProd ? 'assets/[name].[hash].[ext]' : 'assets/[name].[ext]',
        }
      }
    },
    // Environment variables available to client code
    define: {
      // Stringify values so they work properly in client code
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(isProd ? '/api' : '/api'),
      'import.meta.env.VITE_APP_ENV': JSON.stringify(mode),
      // You can add additional environment variables here
    }
  };
});