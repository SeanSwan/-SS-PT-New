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
    ? 'https://ss-pt-new.onrender.com' 
    : 'http://localhost:10000';
  
  // Ensure environment variables are properly set for production
  const envVars = {
    NODE_ENV: mode,
    VITE_API_BASE_URL: backendUrl,
    VITE_BACKEND_URL: backendUrl,
    VITE_MCP_SERVER_URL: backendUrl,
    VITE_DEV_MODE: isProd ? 'false' : 'true',
    VITE_MOCK_AUTH: 'false',
    VITE_FORCE_MOCK_MODE: 'false',
  };
  
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
      open: false,  // Don't auto-open browser
      hmr: {
        overlay: true,
      },
      // Enhanced proxy configuration with detailed logging and error handling
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: isProd,
          ws: true,
          xfwd: true,
          proxyTimeout: 60000, // Extended timeout
          configure: (proxy, options) => {
            // Log all proxy events for debugging
            proxy.on('error', (err, req, res) => {
              console.error(`[Proxy Error] ${req.method} ${req.url}:`, err.message);
              
              // For API errors, return a JSON response
              if (req.url.startsWith('/api') && res.writeHead && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: false,
                  message: 'Backend server connection failed',
                  error: 'ERR_CONNECTION_REFUSED',
                  details: 'The backend server is currently unavailable. Please check if the backend is running on port 10000.'
                }));
              }
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
      // Ensure the router works correctly with hosting platforms
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
          }
        }
      },
      // Enable SPA fallback for development preview
      assetsDir: 'assets',
      // Ensure all assets are properly handled
      copyPublicDir: true
    },
    define: {
      // Properly define environment variables for both dev and production
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(envVars.VITE_API_BASE_URL),
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(envVars.VITE_BACKEND_URL),
      'import.meta.env.VITE_MCP_SERVER_URL': JSON.stringify(envVars.VITE_MCP_SERVER_URL),
      'import.meta.env.MODE': JSON.stringify(mode),
      'process.env': JSON.stringify({
        NODE_ENV: mode,
        VITE_API_BASE_URL: envVars.VITE_API_BASE_URL,
        VITE_BACKEND_URL: envVars.VITE_BACKEND_URL,
        VITE_MCP_SERVER_URL: envVars.VITE_MCP_SERVER_URL,
        VITE_DEV_MODE: envVars.VITE_DEV_MODE,
        REACT_APP_API_URL: isProd ? backendUrl + '/api' : '/api',
        REACT_APP_ENABLE_GAMIFICATION: 'true',
        REACT_APP_ENABLE_FOOD_TRACKER: 'true',
        REACT_APP_ENABLE_SOCIAL_FEATURES: 'false',
        REACT_APP_ENABLE_DANCE_WORKOUTS: 'false',
        REACT_APP_ENABLE_CORPORATE_WELLNESS: 'false'
      })
    }
  };
});