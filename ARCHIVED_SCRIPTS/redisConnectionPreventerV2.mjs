/**
 * Simple Redis Connection Preventer
 * Allows ioredis module to load but prevents actual connections
 */

// Override the process.env to disable Redis before any imports
process.env.REDIS_ENABLED = 'false';

// Create a custom ioredis wrapper that prevents connections
const Module = require('module');
const originalRequire = Module.prototype.require;

// Only intercept ioredis when actually instantiated
Module.prototype.require = function(id) {
  if (id === 'ioredis') {
    // Get the original ioredis module
    const OriginalRedis = originalRequire.apply(this, arguments);
    
    // Create a wrapper class that extends the original but prevents connections
    class RedisConnectionPreventer extends OriginalRedis {
      constructor(options = {}) {
        // Don't call super() to avoid connection attempt
        // Instead, create a mock instance that behaves like disconnected Redis
        this.status = 'disconnected';
        this.options = { ...options };
        
        // Set up event emitter behavior
        this._events = {};
        this._eventsCount = 0;
        this._maxListeners = 0;
        
        // Prevent any connection attempts
        setTimeout(() => {
          if (this.emit) {
            this.emit('error', new Error('Redis connection prevented by design'));
          }
        }, 10);
      }
      
      // Override connection methods to be no-ops
      connect() { 
        console.log('🚫 Redis connection attempt blocked');
        return Promise.resolve(); 
      }
      
      // Mock all Redis methods to prevent errors
      get() { return Promise.resolve(null); }
      set() { return Promise.resolve('OK'); }
      del() { return Promise.resolve(1); }
      exists() { return Promise.resolve(0); }
      keys() { return Promise.resolve([]); }
      hget() { return Promise.resolve(null); }
      hset() { return Promise.resolve(1); }
      hgetall() { return Promise.resolve({}); }
      zadd() { return Promise.resolve(1); }
      zrange() { return Promise.resolve([]); }
      publish() { return Promise.resolve(0); }
      subscribe() { return this; }
      unsubscribe() { return this; }
      quit() { return Promise.resolve(); }
      disconnect() { return Promise.resolve(); }
      
      // Event emitter methods
      on(event, listener) { 
        console.log(`🚫 Redis event '${event}' listener blocked`);
        return this; 
      }
      once(event, listener) { return this; }
      off(event, listener) { return this; }
      removeListener(event, listener) { return this; }
      emit(event, ...args) { 
        // Only emit error events to maintain some compatibility
        if (event === 'error') {
          console.log('🚫 Redis error event suppressed');
        }
        return this; 
      }
    }
    
    // Also handle Cluster class
    RedisConnectionPreventer.Cluster = class extends RedisConnectionPreventer {};
    
    return RedisConnectionPreventer;
  }
  
  return originalRequire.apply(this, arguments);
};

console.log('🛡️ Redis connection preventer activated');
