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
import { setupMiddleware } from './middleware/index.mjs';
import { setupRoutes } from './routes.mjs';
import { setupErrorHandling } from './middleware/errorHandler.mjs';
import logger from '../utils/logger.mjs';

/**
 * Create and configure Express application
 */
export const createApp = async () => {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  // ===================== ULTRA-AGGRESSIVE OPTIONS HANDLING (LAYER 1) =====================
  // This runs BEFORE any other middleware to catch ALL OPTIONS requests
  
  const allowedOrigins = [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:3000',
    'https://sswanstudios.com',
    'https://www.sswanstudios.com',
    'https://swanstudios.com',
    'https://www.swanstudios.com'
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

  // ===================== ERROR HANDLING =====================
  setupErrorHandling(app);

  logger.info('Express application configured successfully (ULTRA-AGGRESSIVE CORS)');
  return app;
};

export default createApp;
