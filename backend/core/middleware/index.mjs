/**
 * Middleware Configuration Module
 * ===============================
 * Centralized middleware setup for SwanStudios platform
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { requestLogger } from '../../middleware/debugMiddleware.mjs';
import logger from '../../utils/logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Setup all application middleware
 */
export const setupMiddleware = async (app) => {
  // ===================== BODY PARSING =====================
  const bodyLimit = isProduction ? '10mb' : '50mb';
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // ===================== REQUEST LOGGING =====================
  if (!isProduction) {
    app.use(requestLogger);
    logger.info('Debug middleware enabled for development');
  }

  app.use((req, res, next) => {
    const isHealthCheck = req.path === '/health';
    const shouldLog = !isProduction || (!isHealthCheck && req.path !== '/favicon.ico');
    
    if (shouldLog) {
      logger.info(`[REQUEST] ${req.method} ${req.url} from ${req.ip || 'unknown'}`);
    }
    next();
  });

  // ===================== STATIC FILE SERVING =====================
  // Serve uploaded files
  const uploadsPath = path.join(__dirname, '../../uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Serve frontend in production
  if (isProduction) {
    const frontendDistPath = path.join(__dirname, '../../../frontend/dist');
    
    if (existsSync(frontendDistPath)) {
      logger.info(`Serving frontend static files from: ${frontendDistPath}`);
      
      app.use(express.static(frontendDistPath, {
        maxAge: '1y',
        etag: true,
        lastModified: true,
        setHeaders: (res, path) => {
          if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        }
      }));
      
      logger.info('✅ Frontend static files configured successfully');
    } else {
      logger.warn(`⚠️ Frontend dist directory not found at: ${frontendDistPath}`);
    }
  }

  logger.info('Middleware setup completed');
};

export default setupMiddleware;