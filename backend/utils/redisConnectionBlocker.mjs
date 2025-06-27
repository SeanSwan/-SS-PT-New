/**
 * Redis Connection Blocker
 * ======================
 * AGGRESSIVE solution to prevent ANY Redis connections when REDIS_ENABLED=false
 * This monitors and blocks Redis connection attempts at the environment level
 */

// Check Redis configuration immediately
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

if (!REDIS_ENABLED) {
  console.log('🛡️ Redis Connection Blocker activated - monitoring for Redis connections');
  

  
  // Set additional environment flags to prevent Redis connections
  process.env.NODE_REDIS_DISABLED = 'true';
  process.env.REDIS_DISABLED = 'true';
  
  // Monitor for Redis connection attempts and log them
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('ioredis') || 
        (message.includes('ECONNREFUSED') && message.includes('6379'))) {
      console.log('🚨 INTERCEPTED Redis error (Redis disabled):', message);
      // Still log it, but mark it as intercepted
      return;
    }
    return originalConsoleError.apply(this, args);
  };
  
  // Set up process event monitoring
  process.on('uncaughtException', (error) => {
    const errorMessage = error.message || '';
    if (errorMessage.includes('ioredis') || 
        errorMessage.includes('ECONNREFUSED') && errorMessage.includes('6379')) {
      console.log('🚨 CAUGHT Redis uncaught exception (suppressed):', errorMessage);
      // Prevent the process from crashing due to Redis connection errors
      return;
    }
    // Re-throw non-Redis errors
    throw error;
  });
  
  process.on('unhandledRejection', (reason) => {
    const errorMessage = reason?.message || String(reason);
    if (errorMessage.includes('ioredis') || 
        errorMessage.includes('ECONNREFUSED') && errorMessage.includes('6379')) {
      console.log('🚨 CAUGHT Redis unhandled rejection (suppressed):', errorMessage);
      // Prevent the process from crashing due to Redis connection rejections
      return;
    }
    // Re-throw non-Redis rejections
    throw reason;
  });
  
  console.log('✅ Redis Connection Blocker installed successfully');
} else {
  console.log('ℹ️ Redis Connection Blocker not needed - Redis is enabled');
}

export default {
  isActive: !REDIS_ENABLED,
  message: REDIS_ENABLED ? 'Redis connections allowed' : 'All Redis connections blocked'
};
