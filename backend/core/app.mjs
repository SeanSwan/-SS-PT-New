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

  // Simplified, robust CORS configuration
  const corsOptions = {
    origin: function (origin, callback) {
      logger.info(`🌐 CORS Request - Origin: ${origin || 'null'}, Environment: ${process.env.NODE_ENV}`);
      
      // Allow requests with no origin (Postman, mobile apps, curl, etc.)
      if (!origin) {
        logger.info('✅ CORS: No origin header - allowing (mobile/server-to-server)');
        return callback(null, true);
      }
      
      // Check exact match in allowed origins list
      if (allowedOrigins.includes(origin)) {
        logger.info(`✅ CORS: Origin '${origin}' found in allowedOrigins - ALLOWING`);
        return callback(null, true);
      }
      
      // Development mode: allow localhost with any port
      if (!isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        logger.info(`✅ CORS: Development localhost origin '${origin}' - ALLOWING`);
        return callback(null, true);
      }
      
      // Production fallback: Swan Studios domains (defensive)
      if (isProduction && (origin.includes('sswanstudios.com') || origin.includes('swanstudios.com'))) {
        logger.info(`✅ CORS: Production Swan Studios domain '${origin}' - ALLOWING as fallback`);
        return callback(null, true);
      }
      
      // Reject all other origins
      logger.error(`❌ CORS: Origin '${origin}' NOT ALLOWED. Allowed origins: ${allowedOrigins.join(', ')}`);
      const error = new Error(`CORS: Origin '${origin}' not allowed`);
      error.status = 403;
      return callback(error, false);
    },
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
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  };

  // Apply CORS middleware as THE FIRST middleware (critical for preflight)
  app.use(cors(corsOptions));
  
  // Explicitly handle preflight OPTIONS requests for all routes
  app.options('*', cors(corsOptions));

  logger.info(`🔧 CORS Configuration Complete (Applied FIRST):`);
  logger.info(`   Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  logger.info(`   Allowed Origins (${allowedOrigins.length}): ${allowedOrigins.join(', ')}`);
  logger.info(`   FRONTEND_ORIGINS env: '${rawOrigins}'`);

  // ===================== SECURITY & OPTIMIZATION (AFTER CORS) =====================
  if (isProduction) {
    // Security headers
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
      hidePoweredBy: true,
      xssFilter: true,
      noSniff: true,
      referrerPolicy: { policy: 'same-origin' }
    }));
    
    // Compression for performance
    app.use(compression({
      level: 6,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      }
    }));
    
    logger.info('Production optimizations enabled: helmet security, compression');
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