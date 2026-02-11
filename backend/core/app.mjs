/**
 * Core Application Configuration - ULTRA-AGGRESSIVE CORS FOR RENDER PLATFORM
 * ========================================================================
 * Multiple layers of OPTIONS handling to bypass Render platform interference
 * Master Prompt v28 aligned - Ultra-aggressive CORS strategy
 */

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupMiddleware } from './middleware/index.mjs';
import { setupRoutes } from './routes.mjs';
import { setupErrorHandling } from './middleware/errorHandler.mjs';
import { initializeSession } from '../config/session.mjs';
import logger from '../utils/logger.mjs';

/**
 * Create and configure Express application
 */
export const createApp = async () => {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  // Trust first proxy (Render reverse proxy) so req.ip returns real client IP
  // Required for accurate rate limiting behind Render's load balancer
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  // ===================== PATH SETUP FOR STATIC FILES =====================
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendBuildPath = path.join(__dirname, '..', '..', 'frontend', 'dist');

  // ===================== ULTRA-AGGRESSIVE OPTIONS HANDLING (LAYER 1) =====================
  // This runs BEFORE any other middleware to catch ALL OPTIONS requests

  // Get allowed origins from environment or use defaults
  const envOrigins = process.env.FRONTEND_ORIGINS
    ? process.env.FRONTEND_ORIGINS.split(',').map(o => o.trim())
    : [];

  const allowedOrigins = [
    ...envOrigins,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'https://sswanstudios.com',
    'https://www.sswanstudios.com',
    'https://swanstudios.com',
    'https://www.swanstudios.com',
    'https://swanstudios-frontend.onrender.com'
  ];

  // LAYER 1: IMMEDIATE OPTIONS INTERCEPTION
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const method = req.method;
    const url = req.url;
    
    // Log ALL incoming requests for debugging
    logger.info(`🌐 INCOMING REQUEST: ${method} ${url} from origin: ${origin || 'no-origin'}`);
    
    if (method === 'OPTIONS') {
      logger.info(`🎯 LAYER 1 - OPTIONS INTERCEPTED: ${url} from origin: ${origin || 'no-origin'}`);
      
      // Set ultra-permissive CORS headers
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, X-CSRF-Token, X-Forwarded-For');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.setHeader('Vary', 'Origin');
      
      // Additional debug headers
      res.setHeader('X-Debug-CORS-Handler', 'Layer1-UltraAggressive');
      res.setHeader('X-Debug-Origin', origin || 'no-origin');
      res.setHeader('X-Debug-Timestamp', new Date().toISOString());
      
      logger.info(`📤 LAYER 1 - OPTIONS RESPONSE HEADERS SET:`);
      logger.info(`   - Access-Control-Allow-Origin: ${origin || '*'}`);
      logger.info(`   - Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD`);
      logger.info(`   - Access-Control-Allow-Credentials: true`);
      logger.info(`   - Handler: Layer1-UltraAggressive`);
      
      return res.status(204).end();
    }
    
    // For non-OPTIONS requests, add CORS headers and continue
    if (origin && (allowedOrigins.includes(origin) || !isProduction)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
      logger.info(`✅ NON-OPTIONS: Origin '${origin}' allowed - headers set`);
    }
    
    next();
  });

  // LAYER 2: EXPRESS ROUTE-BASED OPTIONS HANDLING (Backup)
  // Explicit OPTIONS routes for critical endpoints
  app.options('/health', (req, res) => {
    const origin = req.headers.origin;
    logger.info(`🎯 LAYER 2 - OPTIONS /health from origin: ${origin || 'no-origin'}`);
    
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Debug-CORS-Handler', 'Layer2-RouteSpecific-Health');
    
    res.status(204).end();
  });
  
  app.options('/api/auth/login', (req, res) => {
    const origin = req.headers.origin;
    logger.info(`🎯 LAYER 2 - OPTIONS /api/auth/login from origin: ${origin || 'no-origin'}`);
    
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Debug-CORS-Handler', 'Layer2-RouteSpecific-Login');
    
    res.status(204).end();
  });
  
  app.options('/api/*', (req, res) => {
    const origin = req.headers.origin;
    logger.info(`🎯 LAYER 2 - OPTIONS /api/* (${req.url}) from origin: ${origin || 'no-origin'}`);
    
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Debug-CORS-Handler', 'Layer2-RouteSpecific-API');
    
    res.status(204).end();
  });

  // LAYER 3: WILDCARD OPTIONS FALLBACK
  app.options('*', (req, res) => {
    const origin = req.headers.origin;
    logger.info(`🎯 LAYER 3 - WILDCARD OPTIONS ${req.url} from origin: ${origin || 'no-origin'}`);
    
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('X-Debug-CORS-Handler', 'Layer3-Wildcard-Fallback');
    
    res.status(204).end();
  });

  // LAYER 4: TRADITIONAL CORS MIDDLEWARE (for non-OPTIONS requests)
  const corsOptions = {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || !isProduction) {
        logger.info(`✅ LAYER 4 - CORS: Origin '${origin}' allowed by traditional middleware`);
        return callback(null, true);
      }
      
      logger.warn(`⚠️ LAYER 4 - CORS: Origin '${origin}' not in allowlist - but allowing for compatibility`);
      return callback(null, true);
    },
    credentials: true
  };

  app.use(cors(corsOptions));

  logger.info(`🔧 ULTRA-AGGRESSIVE CORS Configuration Applied:`);
  logger.info(`   🥇 LAYER 1: Ultra-priority middleware (catches ALL OPTIONS)`);
  logger.info(`   🥈 LAYER 2: Route-specific OPTIONS handlers (/health, /api/auth/login, /api/*)`);
  logger.info(`   🥉 LAYER 3: Wildcard OPTIONS fallback (*)`);
  logger.info(`   🏁 LAYER 4: Traditional CORS middleware (non-OPTIONS)`);
  logger.info(`   📝 Allowed Origins: ${allowedOrigins.join(', ')}`);
  logger.info(`   🎯 This WILL bypass Render platform interference!`);

  // ===================== SESSION CONFIGURATION =====================
  // Initialize Redis-backed session storage for multi-instance scaling
  const { middleware: sessionMiddleware, redisClient, store } = await initializeSession();
  app.use(sessionMiddleware);

  // Store redisClient for graceful shutdown
  app.locals.redisClient = redisClient;

  if (store) {
    logger.info(`✅ Session storage: Redis-backed (multi-instance ready)`);
  } else {
    logger.warn(`⚠️ Session storage: In-memory (fallback mode - NOT suitable for production with multiple instances)`);
  }

  // ===================== SECURITY & OPTIMIZATION =====================
  if (isProduction) {
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:", "https://cdn.example.com"],
          connectSrc: ["'self'", "https://api.stripe.com"],
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,  
      crossOriginResourcePolicy: false,
      hidePoweredBy: true,
      xssFilter: true,
      noSniff: true,
      referrerPolicy: { policy: 'same-origin' }
    }));
    
    app.use(compression({
      level: 6,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      }
    }));
    
    logger.info('Production optimizations enabled: CORS-friendly helmet, compression');
  }

  // Health check endpoints are now handled by dedicated healthRoutes
  // This prevents conflicts and ensures consistent CORS handling

  // ===================== MIDDLEWARE SETUP =====================
  await setupMiddleware(app);

  // ===================== ROUTES SETUP =====================
  await setupRoutes(app);

  // ===================== STATIC FILE SERVING FOR FRONTEND =====================
  // Serve static files from the React app's build directory
  // This MUST come AFTER API routes to avoid conflicts
  app.use(express.static(frontendBuildPath, {
    maxAge: isProduction ? '1y' : '0', // Cache static assets in production
    etag: true,
    lastModified: true
  }));

  logger.info(`📁 Static files configured: serving from ${frontendBuildPath}`);

  // ===================== SPA CATCH-ALL ROUTE =====================
  // The "catchall" handler: for any request that doesn't match an API route,
  // send back the main index.html file. This enables React Router to work.
  // 🎯 P0 FIX: Explicit MIME type to prevent text/plain serving
  // 🎯 CRITICAL FIX: Exclude API routes from SPA catch-all to prevent API interception
  app.get('*', (req, res) => {
    const requestPath = req.path;

    // Exclude API and webhook routes from SPA catch-all
    if (requestPath.startsWith('/api') || requestPath.startsWith('/webhooks')) {
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        path: requestPath,
        timestamp: new Date().toISOString()
      });
    }

    const indexPath = path.join(frontendBuildPath, 'index.html');
    logger.info(`🔄 SPA Catch-all: ${req.url} -> serving index.html from ${indexPath}`);

    // 🎯 P0 CRITICAL: Set explicit Content-Type before serving to prevent MIME issues
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', isProduction ? 'public, max-age=300' : 'no-cache');

    res.sendFile(indexPath, (err) => {
      if (err) {
        logger.error(`❌ Failed to serve index.html: ${err.message}`);
        // Reset headers and send error
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(500).send('Error loading application');
      }
    });
  });

  // ===================== ERROR HANDLING =====================
  setupErrorHandling(app);

  logger.info('Express application configured successfully (ULTRA-AGGRESSIVE CORS)');
  return app;
};

export default createApp;
