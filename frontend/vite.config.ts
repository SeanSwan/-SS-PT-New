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
      }),
      svgr(), // Handle SVG imports
      // Enhanced development debugging plugin
      {
        name: 'log-server-requests',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Log API requests to help with debugging
            if (req.url?.startsWith('/api')) {
              console.log(`[Vite Proxy] ${req.method} ${req.url}`);
            }
            next();
          });
        }
      }
    ],
    server: {
      port: 5173,
      hmr: {
        overlay: true,
      },
      // Enhanced proxy configuration with detailed logging
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: isProd,
          ws: true,
          xfwd: true,
          proxyTimeout: 30000,
          configure: (proxy, options) => {
            // Log all proxy events for debugging
            proxy.on('error', (err, req, res) => {
              console.error(`[Proxy Error] ${req.method} ${req.url}:`, err.message);
            });
            
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`[Proxy Request] ${req.method} ${req.url} → ${backendUrl}${req.url}`);
            });
            
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log(`[Proxy Response] ${proxyRes.statusCode} for ${req.method} ${req.url}`);
            });
          }
        }
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      sourcemap: true,
      outDir: 'dist',
      // Ensure the router works correctly with Render
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
          }
        }
      }
    },
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api'),
    }
  };
});