/**
 * Core Application Configuration
 * =============================
 * Simplified Express app setup with modular architecture
 * Master Prompt v28 aligned - Clean, maintainable, production-ready
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

  // ===================== DIAGNOSTIC: ULTRA-PRIORITY OPTIONS HANDLER =====================
  // THIS RUNS BEFORE EVERYTHING ELSE TO ISOLATE RENDER/MIDDLEWARE CONFLICTS
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin;
      logger.info(`🚨 DIAGNOSTIC OPTIONS HANDLER: ${req.path} from ${origin || 'no-origin'}`);
      
      // ULTRA-PERMISSIVE for diagnostic - reflect origin or allow all
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');
      
      logger.info(`🚨 DIAGNOSTIC: Sending 204 with headers for OPTIONS ${req.path}`);
      return res.status(204).end();
    }
    next();
  });

  // ===================== CORS CONFIGURATION (FIRST!) =====================
  // CRITICAL: CORS must be the very first middleware to handle preflight requests
  // Parse allowed origins with proper cleanup
  const rawOrigins = process.env.FRONTEND_ORIGINS || '';
  const envOrigins = rawOrigins
    ? rawOrigins.split(',').map(origin => origin.trim()).filter(Boolean)
    : [];

  const defaultOrigins = [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:3000',
    'https://swanstudios-app.onrender.com',
    'https://sswanstudios.com',
    'https://www.sswanstudios.com',
    'https://swanstudios.com',
    'https://www.swanstudios.com'
  ];

  const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

  // ===================== EXPLICIT PREFLIGHT HANDLER (BULLETPROOF) =====================
  // This runs BEFORE the cors middleware to ensure OPTIONS requests always get proper headers
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const method = req.method;
    
    // Log all requests for debugging
    logger.info(`📡 REQUEST: ${method} ${req.path} from origin: ${origin || 'no-origin'}`);
    
    // Determine if origin should be allowed
    let isOriginAllowed = false;
    
    if (!origin) {
      // No origin header (mobile apps, server-to-server, etc.)
      isOriginAllowed = true;
    } else if (isProduction && origin === 'https://sswanstudios.com') {
      // Production override for main domain
      isOriginAllowed = true;
    } else if (allowedOrigins.includes(origin)) {
      // Exact match in allowed origins list
      isOriginAllowed = true;
    } else if (!isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      // Development localhost with any port
      isOriginAllowed = true;
    } else if (isProduction && (origin.includes('sswanstudios.com') || origin.includes('swanstudios.com'))) {
      // Production fallback for Swan Studios domains
      isOriginAllowed = true;
    }
    
    // If origin is allowed, set CORS headers
    if (isOriginAllowed && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (isOriginAllowed && !origin) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    // Set other required CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.setHeader('Access-Control-Expose-Headers', 'Authorization, X-Total-Count');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle OPTIONS preflight requests
    if (method === 'OPTIONS') {
      if (isOriginAllowed) {
        logger.info(`✅ PREFLIGHT SUCCESS: OPTIONS ${req.path} from ${origin || 'no-origin'} - sending 204`);
        return res.status(204).end();
      } else {
        logger.error(`❌ PREFLIGHT REJECTED: OPTIONS ${req.path} from ${origin} - origin not allowed`);
        return res.status(403).json({ error: 'CORS: Origin not allowed' });
      }
    }
    
    // Continue to next middleware for non-OPTIONS requests
    if (isOriginAllowed) {
      logger.info(`✅ CORS: ${method} ${req.path} from ${origin || 'no-origin'} - allowed`);
    } else {
      logger.error(`❌ CORS: ${method} ${req.path} from ${origin} - origin not allowed`);
    }
    
    next();
  });

  // SIMPLIFIED CORS configuration as backup (should not be needed for preflight after above)
  const corsOptions = {
    origin: true, // Trust our explicit handler above
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'Accept', 
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ],
    exposedHeaders: ['Authorization', 'X-Total-Count'],
    credentials: true
  };

  // Apply simplified CORS middleware (explicit preflight handler above handles the complex logic)
  app.use(cors(corsOptions));

  logger.info(`🔧 CORS Configuration Complete:`);
  logger.info(`   🚨 DIAGNOSTIC MODE: Ultra-priority OPTIONS handler active (pre-everything)`);
  logger.info(`   Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  logger.info(`   Allowed Origins (${allowedOrigins.length}): ${allowedOrigins.join(', ')}`);
  logger.info(`   FRONTEND_ORIGINS env: '${rawOrigins}'`);
  logger.info(`   🛡️ HELMET: CORS-friendly mode (crossOrigin policies disabled)`);
  logger.info(`   🎯 This should resolve Render preflight issues - monitoring OPTIONS requests...`);

  // ===================== SECURITY & OPTIMIZATION (AFTER CORS) =====================
  if (isProduction) {
    // CORS-FRIENDLY Security headers (helmet configured to not interfere with CORS)
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
      crossOriginEmbedderPolicy: false, // Disable COEP which can interfere with CORS
      crossOriginOpenerPolicy: false,   // Disable COOP which can interfere with CORS
      crossOriginResourcePolicy: false, // Disable CORP which can interfere with CORS
      hidePoweredBy: true,
      xssFilter: true,
      noSniff: true,
      referrerPolicy: { policy: 'same-origin' }
    }));
    
    logger.info('✅ Helmet configured with CORS-friendly settings (COEP/COOP/CORP disabled)');
    
    // Compression for performance
    app.use(compression({
      level: 6,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      }
    }));
    
    logger.info('Production optimizations enabled: CORS-friendly helmet, compression');
  }

  // CORS test endpoint (before other middleware that might interfere)
  app.get('/health', (req, res) => {
    const origin = req.headers.origin;
    const isOriginAllowed = !origin || allowedOrigins.includes(origin) || 
      (!isProduction && origin.includes('localhost')) ||
      (isProduction && (origin.includes('sswanstudios.com') || origin.includes('swanstudios.com')));
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      cors: {
        requestOrigin: origin || 'no-origin',
        isAllowed: isOriginAllowed,
        allowedOrigins: allowedOrigins,
        userAgent: req.headers['user-agent']
      }
    });
  });

  // ===================== MIDDLEWARE SETUP =====================
  await setupMiddleware(app);

  // ===================== ROUTES SETUP =====================
  await setupRoutes(app);

  // ===================== ERROR HANDLING =====================
  setupErrorHandling(app);

  logger.info('Express application configured successfully');
  return app;
};

export default createApp;