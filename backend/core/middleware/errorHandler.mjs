/**
 * Error Handling Middleware
 * =========================
 * Centralized error handling for SwanStudios platform
 */

import path from 'path';
import { existsSync } from 'fs';
import logger from '../../utils/logger.mjs';
import { reportServerError } from '../../services/monitoring/errorReporter.mjs';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Setup error handling middleware
 */
export const setupErrorHandling = (app) => {
  // ===================== ROUTE NOT FOUND HANDLER =====================
  app.use((req, res, next) => {
    // Handle SPA routing in production
    if (isProduction && !req.path.startsWith('/api/') && !req.path.startsWith('/uploads/') && !req.path.includes('.')) {
      const indexPath = path.join(__dirname, '../../../frontend/dist/index.html');
      if (existsSync(indexPath)) {
        logger.info(`SPA Routing: Serving index.html for ${req.path}`);
        return res.sendFile(indexPath);
      }
    }
    
    // API routes or files not found (exclude /photos/ handled by R2 proxy)
    if (req.path.startsWith('/api/') || (req.path.includes('.') && !req.path.startsWith('/photos/'))) {
      logger.warn(`Route not found: ${req.path} (${req.method})`);
      return res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path,
        method: req.method
      });
    }
    
    // Default 404 for production
    if (isProduction) {
      return res.status(404).send('Frontend not built. Please run npm run build in frontend directory.');
    }
    
    next();
  });

  // ===================== GLOBAL ERROR HANDLER =====================
  app.use((err, req, res, next) => {
    const statusCode = err.status || 500;

    logger.error(`Unhandled error: ${err.message}`, {
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    // Capture, scrub and group the fault so the reassurance below is TRUE.
    // Until 2026-07-29 this handler told users "Our team has been notified"
    // while nothing notified anyone — a rule-75 violation in user-facing copy.
    // reportServerError ignores 4xx, never captures a request body, and is
    // fail-open: it can never break the response.
    reportServerError({ err, req, statusCode });

    const errorResponse = {
      success: false,
      message: isProduction
        ? 'An unexpected error occurred. Our team has been notified.'
        : err.message || 'An unexpected error occurred',
    };

    res.status(statusCode).json(errorResponse);
  });

  // ===================== PROCESS ERROR HANDLERS =====================
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', { promise, reason: reason?.stack || reason });
    if (isProduction) {
      logger.error('Critical: Unhandled rejection in production. Server will shut down for safety.');
      process.exit(1);
    }
  });

  process.on('uncaughtException', (err, origin) => {
    logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack, origin });
    if (isProduction) {
      logger.error('Critical: Uncaught exception in production. Server will shut down for safety.');
      process.exit(1);
    }
  });

  logger.info('Error handling middleware configured');
};

export default setupErrorHandling;
