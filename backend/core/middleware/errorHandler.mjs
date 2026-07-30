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

    // Capture, scrub and group the fault. reportServerError ignores 4xx, never
    // captures a request body, and is fail-open: it can never break the response.
    //
    // Rule 75 — capture is NOT notification. registerErrorSink() has no runtime
    // caller (only tests), so getErrorSnapshot().sinkConfigured is false in
    // production: the fault reaches a log line and an in-memory group, and no
    // further. The user-facing copy below therefore says "recorded", not
    // "notified". When Sean registers a sink, the stronger wording can return.
    reportServerError({ err, req, statusCode });
    // Mark it so the response-boundary reporter does not double-count this
    // fault — it has already been captured here, with the Error and its stack.
    req.__errorReported = true;

    const errorResponse = {
      success: false,
      message: isProduction
        ? 'An unexpected error occurred and has been recorded. Please try again — if it keeps happening, report it from the Support page.'
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
