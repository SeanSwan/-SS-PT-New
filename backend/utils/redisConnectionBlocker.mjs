/**
 * Redis Connection Blocker - SURGICAL PRECISION EDITION  
 * =====================================================
 * Blocks ONLY Redis connection attempts and Redis-specific errors
 * Preserves ALL other logging including health checks
 */

// Check Redis configuration immediately
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';
const REDIS_COMPLETELY_BLOCKED = !REDIS_ENABLED;

if (REDIS_COMPLETELY_BLOCKED) {
  // Set environment flags to prevent Redis connections
  process.env.NODE_REDIS_DISABLED = 'true';
  process.env.REDIS_DISABLED = 'true';
  process.env.DISABLE_REDIS = 'true';
  process.env.NO_REDIS = 'true';
  
  // Block common Redis connection environment variables
  if (process.env.REDIS_URL) {
    delete process.env.REDIS_URL;
  }
  
  if (process.env.REDIS_HOST) {
    delete process.env.REDIS_HOST;
  }
  
  // SURGICAL ERROR INTERCEPTION - Block ONLY specific Redis errors
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;
  
  // Block console.error ONLY for specific Redis connection errors
  console.error = function(...args) {
    const message = args.join(' ');
    
    // VERY SPECIFIC Redis error patterns to avoid blocking other errors
    const specificRedisPatterns = [
      '[ioredis] Unhandled error event: Error: connect ECONNREFUSED 127.0.0.1:6379',
      'connect ECONNREFUSED 127.0.0.1:6379',
      'Error: connect ECONNREFUSED 127.0.0.1:6379'
    ];
    
    const isSpecificRedisError = specificRedisPatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (isSpecificRedisError) {
      return; // Block only specific Redis connection errors
    }
    return originalConsoleError.apply(this, args);
  };
  
  // Block console.log ONLY for Redis intercepted messages
  console.log = function(...args) {
    const message = args.join(' ');
    
    // ONLY block our own intercepted messages
    const interceptedPatterns = [
      '🚨 INTERCEPTED Redis error (Redis disabled):',
      '🚨 CAUGHT Redis uncaught exception',
      '🚨 CAUGHT Redis unhandled rejection',
      '🚨 CAUGHT Redis process error',
      '🚫 BLOCKED net.createConnection to Redis port'
    ];
    
    const isInterceptedMessage = interceptedPatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (isInterceptedMessage) {
      return; // Block only our intercepted messages
    }
    return originalConsoleLog.apply(this, args);
  };
  
  // Block process errors ONLY for Redis
  process.on('uncaughtException', (error) => {
    const errorMessage = error.message || '';
    const stackTrace = error.stack || '';
    
    // VERY SPECIFIC Redis error detection
    const isSpecificRedisError = 
      (errorMessage.includes('ECONNREFUSED') && errorMessage.includes('127.0.0.1:6379')) ||
      (stackTrace.includes('ioredis') && stackTrace.includes('6379'));
    
    if (isSpecificRedisError) {
      return; // Silently handle Redis connection errors
    }
    
    // Let all other errors pass through normally
    throw error;
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    const errorMessage = reason?.message || String(reason);
    
    // VERY SPECIFIC Redis rejection detection
    const isSpecificRedisRejection = 
      (errorMessage.includes('ECONNREFUSED') && errorMessage.includes('127.0.0.1:6379')) ||
      (errorMessage.includes('ioredis') && errorMessage.includes('6379'));
    
    if (isSpecificRedisRejection) {
      return; // Silently handle Redis rejections
    }
    
    // Let all other rejections pass through normally
    throw reason;
  });
  
  // Block net module connections to Redis ports
  try {
    const originalNet = require('net');
    const originalCreateConnection = originalNet.createConnection;
    
    originalNet.createConnection = function(options, ...args) {
      const port = options?.port || options;
      
      if (port === 6379 || port === '6379') {
        const mockSocket = new (require('events').EventEmitter)();
        mockSocket.connect = () => mockSocket;
        mockSocket.write = () => true;
        mockSocket.end = () => mockSocket;
        mockSocket.destroy = () => mockSocket;
        // Don't emit error to avoid logs
        return mockSocket;
      }
      
      return originalCreateConnection.apply(this, [options, ...args]);
    };
  } catch (netBlockError) {
    // Silent failure
  }
}

export default {
  isActive: REDIS_COMPLETELY_BLOCKED,
  level: 'SURGICAL_PRECISION',
  message: REDIS_ENABLED ? 'Redis connections allowed' : 'Specific Redis connection errors blocked, all other logging preserved'
};
