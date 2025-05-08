import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import svgr from 'vite-plugin-svgr';
import fs from 'fs';

// Mock API response handlers
const mockResponses = {
  '/api/auth/login': (req, res) => {
    // Parse request body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('Mock login attempt:', data.username || data.email);
        
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          token: 'mock-token-for-development-mode',
          user: {
            id: 'mock-user-id',
            username: data.username || 'mockuser',
            email: `${data.username || 'mock'}@example.com`,
            firstName: 'Mock',
            lastName: 'User',
            role: data.username?.includes('admin') ? 'admin' : 'client',
            profileImage: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }));
      } catch (err) {
        console.error('Error parsing login request:', err);
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid request format' }));
      }
    });
  },
  
  '/api/storefront': (req, res) => {
    console.log('Mock storefront request');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      items: [
        {
          id: '1',
          name: 'Personal Training Session',
          description: 'One-on-one training session with a certified trainer',
          price: 75.00,
          category: 'sessions',
          imageUrl: '/session-1.jpg',
          inStock: true
        },
        {
          id: '2',
          name: '5-Session Package',
          description: 'Bundle of 5 personal training sessions at a discount',
          price: 350.00,
          category: 'packages',
          imageUrl: '/package-5.jpg',
          inStock: true
        },
        {
          id: '3',
          name: '10-Session Package',
          description: 'Bundle of 10 personal training sessions at a bigger discount',
          price: 650.00,
          category: 'packages',
          imageUrl: '/package-10.jpg',
          inStock: true
        },
        {
          id: '4',
          name: 'Premium Protein Powder',
          description: 'High-quality protein supplement for muscle recovery',
          price: 45.99,
          category: 'supplements',
          imageUrl: '/protein.jpg',
          inStock: true
        },
        {
          id: '5',
          name: 'Training T-Shirt',
          description: 'Comfortable, moisture-wicking training shirt',
          price: 29.99,
          category: 'apparel',
          imageUrl: '/shirt.jpg',
          inStock: true
        }
      ]
    }));
  },
  
  '/api/session-packages': (req, res) => {
    console.log('Mock session packages request');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      packages: [
        {
          id: '1',
          name: 'Starter Package',
          description: '5 personal training sessions to get you started on your fitness journey',
          sessionCount: 5,
          price: 350.00,
          discountPercentage: 10,
          imageUrl: '/package-starter.jpg',
          benefits: ['Personalized fitness assessment', 'Goal setting consultation', 'Customized workout plan'],
          available: true
        },
        {
          id: '2',
          name: 'Transformation Package',
          description: '10 sessions designed to transform your fitness level and habits',
          sessionCount: 10,
          price: 650.00,
          discountPercentage: 15,
          imageUrl: '/package-transform.jpg',
          benefits: ['Body composition analysis', 'Nutrition guidance', 'Progress tracking', 'Form correction'],
          available: true
        },
        {
          id: '3',
          name: 'Elite Package',
          description: '20 sessions for those serious about reaching their peak fitness potential',
          sessionCount: 20,
          price: 1200.00,
          discountPercentage: 20,
          imageUrl: '/package-elite.jpg',
          benefits: ['Advanced training techniques', 'Recovery strategies', 'Performance nutrition', 'Unlimited messaging support'],
          available: true
        },
        {
          id: '4',
          name: 'Couples Package',
          description: '8 partner training sessions - work out together!',
          sessionCount: 8,
          price: 560.00,
          discountPercentage: 12,
          imageUrl: '/package-couples.jpg',
          benefits: ['Partner exercises', 'Shared fitness goals', 'Motivation boost', 'Fun competitive elements'],
          available: true
        }
      ]
    }));
  }
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  const isDevelopment = mode === 'development';
  const isDevMode = env.VITE_DEV_MODE === 'true';
  
  console.log(`Running in ${mode} mode, Dev Mode: ${isDevMode ? 'ENABLED' : 'DISABLED'}`);
  
  const serverConfig = isDevelopment
    ? {
        port: 5173,
        strictPort: false,
        open: true,
        proxy: {
          '/api': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            secure: false,
            ws: true,
            configure: (proxy, _options) => {
              proxy.on('error', (err, req, res) => {
                console.log('Proxy error:', err);
                
                // Get the path from URL
                const url = new URL(req.url, 'http://localhost');
                const path = url.pathname;
                
                // Check if we have a mock handler for this path
                if (mockResponses[path]) {
                  console.log(`Using mock handler for ${path}`);
                  mockResponses[path](req, res);
                } else if (path.startsWith('/api/')) {
                  // Generic mock response for API endpoints
                  console.log(`Using generic mock for ${path}`);
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    success: true,
                    message: `Mock response for ${path}`,
                    data: { mockData: true }
                  }));
                } else {
                  // Default error response
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Server error', mockMode: true }));
                }
              });
              
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                console.log('Sending Request:', req.method, req.url);
              });
              
              proxy.on('proxyRes', (proxyRes, req, _res) => {
                console.log('Received Response from backend:', proxyRes.statusCode, req.url);
              });
            },
          },
          '/health': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            secure: false,
            configure: (proxy, _options) => {
              proxy.on('error', (_err, _req, res) => {
                // Create a mock response when backend is down
                if (!res.headersSent) {
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    status: 'mock',
                    message: 'Development mode active - using mock data',
                    timestamp: new Date().toISOString(),
                    dbStatus: {
                      connected: true,
                      mock: true,
                      usingSQLiteFallback: false
                    }
                  }));
                }
              });
            }
          }
        }
      }
    : {};
  
  return {
    plugins: [
      react(),
      svgr()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: serverConfig,
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'styled-components', 'axios'],
    },
    define: {
      // Define environment variables accessible in frontend code
      __DEV_MODE__: isDevMode,
      __DEV__: isDevelopment,
    },
    // Cache settings to avoid build issues
    cacheDir: '.vite-cache',
    clearScreen: false,
  };
});
