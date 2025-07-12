/**
 * Redis Error Suppressor - Production Fix
 * =======================================
 * Suppresses ioredis unhandled error events to prevent log spam
 * on Render deployment where Redis service is not available
 */

import logger from './logger.mjs';

// Suppress ioredis unhandled error events in production
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  // Override console.error temporarily to catch ioredis errors
  const originalConsoleError = console.error;
  
  console.error = function(...args) {
    const message = args[0];
    
    // Suppress ioredis unhandled error events
    if (typeof message === 'string' && message.includes('[ioredis] Unhandled error event')) {
      // Log once that we're suppressing Redis errors
      if (!global.redisErrorSuppressed) {
        logger.info('Redis not available on Render - using memory cache fallback');
        global.redisErrorSuppressed = true;
      }
      return; // Suppress the error
    }
    
    // Allow all other console.error calls
    originalConsoleError.apply(console, args);
  };
  
  logger.info('Redis error suppressor activated for production deployment');
}

export default true;
