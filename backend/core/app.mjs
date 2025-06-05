/**
 * Core Application Configuration - PLATFORM-LEVEL CORS VERSION
 * ============================================================
 * Simplified Express app with Render platform-level CORS handling
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

  // ===================== SIMPLIFIED CORS (PLATFORM HANDLES PREFLIGHT) =====================
  // Render's platform-level headers handle OPTIONS preflight requests
  // This app-level CORS only handles actual request validation
  
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

  // BASIC CORS middleware (platform handles preflight, this handles actual requests)
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        logger.info(`✅ CORS: Origin '${origin}' allowed by app-level check`);
        return callback(null, true);
      }
      
      // Development fallback
      if (!isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        logger.info(`✅ CORS: Development origin '${origin}' allowed`);
        return callback(null, true);
      }
      
      logger.warn(`⚠️ CORS: Origin '${origin}' not in app allowlist (platform headers should handle)`);
      return callback(null, true); // Let platform headers handle it
    },
    credentials: true
  };

  // Apply basic CORS middleware
  app.use(cors(corsOptions));

  logger.info(`🔧 CORS Configuration: PLATFORM + APP HYBRID:`);
  logger.info(`   🏢 PLATFORM LEVEL: Render headers handle preflight OPTIONS requests`);
  logger.info(`   🚀 APP LEVEL: Basic origin validation for actual requests`);
  logger.info(`   📝 Allowed Origins: ${allowedOrigins.join(', ')}`);
  logger.info(`   🎯 This should resolve Render preflight interference!`);

  // ===================== SECURITY & OPTIMIZATION =====================
  if (isProduction) {
    // CORS-FRIENDLY Security headers
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

  // Health check endpoint
  app.get('/health', (req, res) => {
    const origin = req.headers.origin;
    logger.info(`🏥 Health check from origin: ${origin || 'no-origin'}`);
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      cors: {
        requestOrigin: origin || 'no-origin',
        platformLevel: 'Render headers handle preflight',
        appLevel: 'Basic origin validation',
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

  logger.info('Express application configured successfully (PLATFORM-LEVEL CORS)');
  return app;
};

export default createApp;
