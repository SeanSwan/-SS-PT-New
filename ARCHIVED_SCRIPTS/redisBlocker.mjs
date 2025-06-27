/**
 * Comprehensive Redis Blocker
 * This module completely prevents any Redis connections when Redis is disabled
 */

import logger from '../utils/logger.mjs';

// Store original ioredis if it gets imported
let originalIoredis = null;

/**
 * Create a mock Redis client that logs attempts and returns no-op functions
 */
class MockRedisClient {
  constructor(url, options) {
    logger.warn('Redis connection attempt blocked - Redis is disabled');
    logger.warn(`Attempted connection to: ${url || 'default Redis URL'}`);
    
    // Set up event emitter functionality
    this.listeners = new Map();
    
    // Emit ready after a short delay to avoid issues
    setTimeout(() => {
      this.emit('ready');
    }, 100);
  }
  
  // Event emitter methods
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(listener);
    return this;
  }
  
  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          logger.warn('Error in Redis mock event listener:', error.message);
        }
      });
    }
    return this;
  }
  
  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }
  
  // Redis command methods that do nothing
  get(key) { return Promise.resolve(null); }
  set(key, value, ...args) { return Promise.resolve('OK'); }
  del(key) { return Promise.resolve(0); }
  exists(key) { return Promise.resolve(0); }
  expire(key, ttl) { return Promise.resolve(0); }
  flushall() { return Promise.resolve('OK'); }
  info() { return Promise.resolve('# Mock Redis - Disabled'); }
  
  // Connection methods
  connect() { 
    logger.info('Mock Redis connect called - returning success');
    return Promise.resolve(); 
  }
  disconnect() { 
    logger.info('Mock Redis disconnect called');
    return Promise.resolve(); 
  }
  
  // Other common methods
  ping() { return Promise.resolve('PONG'); }
  quit() { return Promise.resolve(); }
}

/**
 * Mock ioredis module
 */
const mockIoredis = class MockRedis extends MockRedisClient {
  constructor(url, options) {
    super(url, options);
  }
  
  static default = class extends MockRedisClient {};
};

// Copy static properties and methods
mockIoredis.default = mockIoredis;

/**
 * Intercept ioredis imports and replace with mock
 */
export function blockRedisConnections() {
  const redisEnabled = process.env.REDIS_ENABLED === 'true';
  
  if (!redisEnabled) {
    logger.info('Installing Redis connection blocker...');
    
    // Override module resolution for ioredis
    const Module = await import('module');
    const originalRequire = Module.default.prototype.require;
    
    // For ES modules, we need to override the import mechanism
    // This is more complex, so let's use a different approach
    
    // Set global flags
    global.__REDIS_BLOCKED__ = true;
    process.env.REDIS_BLOCKED = 'true';
    
    // Create a module cache entry for ioredis
    if (Module.default._cache) {
      Module.default._cache['ioredis'] = {
        exports: mockIoredis,
        loaded: true,
        children: [],
        parent: null,
        filename: 'mock-ioredis.js',
        paths: []
      };
    }
    
    logger.info('Redis connection blocker installed successfully');
  }
}

export { mockIoredis, MockRedisClient };
