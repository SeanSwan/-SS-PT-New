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

  // Serve frontend in production with ROBUST path resolution
  if (isProduction) {
    // Try multiple possible frontend dist paths for different deployment scenarios
    const possibleFrontendPaths = [
      path.join(__dirname, '../../../frontend/dist'),           // Local development structure
      path.join(__dirname, '../../frontend/dist'),              // Alternative structure
      path.join(process.cwd(), 'frontend/dist'),                // From project root
      path.join(process.cwd(), 'dist'),                         // Build output in root
      '/app/frontend/dist',                                     // Render.com structure
      '/app/dist'                                               // Alternative Render structure
    ];
    
    let frontendDistPath = null;
    let indexPath = null;
    
    // Find the correct frontend path
    for (const testPath of possibleFrontendPaths) {
      const testIndexPath = path.join(testPath, 'index.html');
      if (existsSync(testIndexPath)) {
        frontendDistPath = testPath;
        indexPath = testIndexPath;
        logger.info(`✅ Found frontend dist at: ${frontendDistPath}`);
        break;
      } else {
        logger.debug(`❌ Frontend not found at: ${testPath}`);
      }
    }
    
    if (frontendDistPath && indexPath) {
      logger.info(`🎯 Serving frontend static files from: ${frontendDistPath}`);
      
      // Configure static file serving with proper caching
      app.use(express.static(frontendDistPath, {
        maxAge: '1y',
        etag: true,
        lastModified: true,
        index: false, // Don't auto-serve index.html here, we'll handle it in SPA fallback
        setHeaders: (res, filePath) => {
          // Cache static assets aggressively
          if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
          // Don't cache HTML files
          else if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        }
      }));
      
      // Store paths globally for SPA fallback use
      global.FRONTEND_DIST_PATH = frontendDistPath;
      global.FRONTEND_INDEX_PATH = indexPath;
      
      logger.info('✅ Frontend static files configured with robust path resolution');
    } else {
      logger.error('🚨 CRITICAL: Frontend dist directory not found in any expected location!');
      logger.error('🔍 Searched paths:', possibleFrontendPaths);
      logger.error('💡 Ensure frontend is built with: npm run build');
    }
  }

  logger.info('Middleware setup completed');
};

export default setupMiddleware;