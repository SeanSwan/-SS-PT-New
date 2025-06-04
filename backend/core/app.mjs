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

  // ===================== SECURITY & OPTIMIZATION =====================
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

  // ===================== CORS CONFIGURATION =====================
  const whitelist = process.env.FRONTEND_ORIGINS
    ? process.env.FRONTEND_ORIGINS.split(',')
    : [
        'http://localhost:5173', 
        'http://localhost:5174', 
        'http://localhost:5175', 
        'https://swanstudios-app.onrender.com',
        'https://sswanstudios.com',
        'https://www.sswanstudios.com',
        'https://swanstudios.com',
        'https://www.swanstudios.com'
      ];

  const corsOptions = {
    origin: function (origin, callback) {
      // Log CORS request for debugging
      logger.info(`CORS request from origin: ${origin || 'null'}`);
      
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        logger.info('CORS: Allowing request with no origin');
        callback(null, true);
        return;
      }
      
      // Development: more permissive
      if (!isProduction) {
        logger.info('CORS: Development mode - allowing all localhost and whitelisted origins');
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || whitelist.includes(origin)) {
          callback(null, true);
          return;
        }
      }
      
      // Production: Check whitelist first
      if (whitelist.includes(origin)) {
        logger.info(`CORS: Origin ${origin} found in whitelist - allowing`);
        callback(null, true);
        return;
      }
      
      // Fallback: Allow any Swan Studios domain
      const isSwanStudiosDomain = origin.includes('swanstudios.com') || origin.includes('sswanstudios.com');
      if (isSwanStudiosDomain) {
        logger.info(`CORS: Swan Studios domain detected - allowing: ${origin}`);
        callback(null, true);
        return;
      }
      
      // Block all other origins
      logger.warn(`CORS: Blocking request from unauthorized origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
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
    exposedHeaders: ['Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    ...(isProduction && { maxAge: 3600 })
  };

  app.use(cors(corsOptions));
  
  // Explicitly handle preflight requests
  app.options('*', cors(corsOptions));
  
  // Add manual CORS headers for additional safety
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (whitelist.includes(origin) || origin.includes('swanstudios.com') || origin.includes('sswanstudios.com'))) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    next();
  });

  logger.info(`CORS configured for ${isProduction ? 'production' : 'development'} with ${whitelist.length} allowed origins`);
  logger.info(`CORS whitelist: ${whitelist.join(', ')}`);

  // Add health check endpoint for CORS testing
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      cors: {
        origin: req.headers.origin || 'no-origin',
        allowed: true
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