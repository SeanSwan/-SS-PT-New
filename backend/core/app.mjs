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
      if (!isProduction) {
        // Development: more permissive
        if (!origin || whitelist.some(allowed => 
          origin.includes(allowed) || allowed.includes(origin) ||
          origin.includes('localhost') || origin.includes('127.0.0.1')
        )) {
          callback(null, true);
          return;
        }
      }
      
      // Production: strict matching
      if (!origin || whitelist.includes(origin)) {
        callback(null, true);
      } else {
        const isSwanStudiosDomain = origin.includes('swanstudios.com') || origin.includes('sswanstudios.com');
        if (isSwanStudiosDomain) {
          logger.warn(`CORS: Swan Studios domain not in whitelist, allowing: ${origin}`);
          callback(null, true);
        } else {
          logger.warn(`CORS blocked request from origin: ${origin}`);
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    ...(isProduction && { maxAge: 3600 })
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  logger.info(`CORS configured for ${isProduction ? 'production' : 'development'} with ${whitelist.length} allowed origins`);

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