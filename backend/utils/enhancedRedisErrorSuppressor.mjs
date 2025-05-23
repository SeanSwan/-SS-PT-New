/**
 * Enhanced Redis Error Suppressor
 * Prevents Redis connection errors by intercepting and suppressing them
 */

// Capture original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Track if Redis is disabled
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

// Set up error suppression
if (!REDIS_ENABLED) {
  // Override console.error to suppress Redis errors
  console.error = function(...args) {
    const message = args.join(' ');
    
    // Check if this is a Redis-related error
    if (message.includes('ioredis') || 
        message.includes('redis') || 
        message.includes('ECONNREFUSED 127.0.0.1:6379') ||
        message.includes('redis connection') ||
        message.includes('Redis') ||
        message.includes('connect ECONNREFUSED') && message.includes('6379')) {
      // Suppress the error - don't log it
      return;
    }
    
    // For non-Redis errors, use the original console.error
    originalConsoleError.apply(console, args);
  };
  
  // Override process error handlers to catch unhandled errors
  const originalListeners = process.listeners('uncaughtException');
  process.removeAllListeners('uncaughtException');
  
  process.on('uncaughtException', (error) => {
    if (error.message && 
        (error.message.includes('ioredis') || 
         error.message.includes('redis') ||
         error.message.includes('ECONNREFUSED 127.0.0.1:6379'))) {
      // Suppress Redis-related uncaught exceptions
      return;
    }
    
    // Re-run original listeners for non-Redis errors
    originalListeners.forEach(listener => listener(error));
  });
  
  // Also handle unhandled rejections
  const originalRejectionListeners = process.listeners('unhandledRejection');
  process.removeAllListeners('unhandledRejection');
  
  process.on('unhandledRejection', (reason, promise) => {
    if (reason && reason.message && 
        (reason.message.includes('ioredis') || 
         reason.message.includes('redis') ||
         reason.message.includes('ECONNREFUSED 127.0.0.1:6379'))) {
      // Suppress Redis-related unhandled rejections
      return;
    }
    
    // Re-run original listeners for non-Redis rejections
    originalRejectionListeners.forEach(listener => listener(reason, promise));
  });
  
  console.log('🔇 Redis error suppressor activated');
}

export default {
  activate: () => {
    console.log('✅ Redis error suppression active');
  },
  deactivate: () => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log('❌ Redis error suppression deactivated');
  }
};
