/**
 * Redis Wrapper Service
 * ====================
 * Provides a Redis interface that respects the REDIS_ENABLED environment variable
 * If Redis is disabled, all operations are no-ops with in-memory fallback
 * 
 * IMPORTANT: This wrapper uses dynamic imports to prevent ioredis from being loaded
 * when Redis is disabled, eliminating connection attempt errors.
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger.mjs';

// Check Redis configuration immediately but don't import ioredis yet
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';
if (!REDIS_ENABLED) {
  logger.info('Redis is disabled in configuration - all operations will use memory cache only');
}

class RedisWrapper extends EventEmitter {
  constructor() {
    super();
    
    this.enabled = process.env.REDIS_ENABLED === 'true';
    this.connected = false;
    this.client = null;
    this.initialized = false;
    
    // In-memory cache fallback
    this.memoryCache = new Map();
    this.memoryTTL = new Map();
    
    // Always start with ready state for memory cache when Redis is disabled
    if (!this.enabled) {
      logger.info('Redis is disabled, using in-memory cache fallback');
      setTimeout(() => this.emit('ready'), 0); // Emit ready async
    }
    
    // Clean up expired cache entries periodically
    this.cleanupInterval = setInterval(() => this.cleanupExpiredEntries(), 60000); // Every minute
    
    // Log initialization
    logger.info(`RedisWrapper initialized - Redis enabled: ${this.enabled}`);
  }
  
  async _ensureInitialized() {
    if (!this.initialized) {
      this.initialized = true;
      if (this.enabled) {
        await this.initializeRedis();
      }
    }
  }
  
  async initializeRedis() {
    // First check: Is Redis actually enabled?
    if (!this.enabled || process.env.REDIS_ENABLED !== 'true') {
      logger.info('Redis initialization skipped - Redis is disabled in environment');
      this.emit('ready');
      return;
    }
    
    try {
      logger.info('Redis is enabled - checking Redis server availability...');
      
      // Check if Redis server is reachable before importing ioredis
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const url = new URL(redisUrl);
      const host = url.hostname || 'localhost';
      const port = parseInt(url.port) || 6379;
      
      // Simple connectivity check using native Node.js net module
      const net = await import('net');
      const isReachable = await new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);
        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });
        socket.on('error', () => {
          socket.destroy();
          resolve(false);
        });
        socket.connect(port, host);
      });
      
      if (!isReachable) {
        logger.warn(`Redis server is not reachable at ${host}:${port} - falling back to memory cache`);
        this.enabled = false;
        this.emit('ready');
        return;
      }
      
      // Only import Redis if server is reachable AND Redis is enabled
      logger.info('Redis server is reachable - dynamically importing ioredis module...');
      
      // Dynamic import of ioredis - this prevents the module from being loaded when Redis is disabled
      const redisModule = await import('ioredis');
      const Redis = redisModule.default;
      
      logger.info('Creating Redis connection', { url: redisUrl.replace(/\\/\\/.*@/, '//***:***@') });
      
      this.client = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 0, // Immediately fail instead of retrying
        retryDelayOnFailure: 100,
        connectTimeout: 5000,
        lazyConnect: true,
        autoResubscribe: false,
        autoResendUnfulfilledCommands: false,
        enableAutoPipelining: false,
        enableReadyCheck: true
      });
      
      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.connected = true;
        this.emit('connect');
      });
      
      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.emit('ready');
      });
      
      this.client.on('error', (error) => {
        logger.error('Redis error - disabling Redis and using memory fallback:', error.message);
        this.connected = false;
        this.enabled = false; // Disable Redis to prevent further connection attempts
        
        // Clean up the client to prevent further errors
        if (this.client) {
          this.client.removeAllListeners();
          this.client.disconnect();
          this.client = null;
        }
        
        this.emit('error', error);
        logger.warn('Redis connection failed, falling back to memory cache');
      });
      
      this.client.on('close', () => {
        logger.info('Redis connection closed');
        this.connected = false;
        this.emit('close');
      });
      
      // Attempt connection
      await this.client.connect();
      
    } catch (error) {
      logger.error('Failed to initialize Redis:', error.message);
      this.enabled = false;
      this.connected = false;
      
      // Clean up any partial connection
      if (this.client) {
        try {
          this.client.disconnect();
        } catch (cleanupError) {
          logger.warn('Error during Redis cleanup:', cleanupError.message);
        }
        this.client = null;
      }
      
      this.emit('error', error);
      logger.info('Continuing with memory cache fallback');
    }
  }
  
  /**
   * Set a key-value pair with optional TTL
   */
  async set(key, value, ttl = null) {
    await this._ensureInitialized();
    try {
      if (this.enabled && this.connected && this.client) {
        if (ttl) {
          return await this.client.setex(key, ttl, value);
        } else {
          return await this.client.set(key, value);
        }
      } else {
        // Fallback to memory cache
        this.memoryCache.set(key, value);
        if (ttl) {
          this.memoryTTL.set(key, Date.now() + (ttl * 1000));
        }
        return 'OK';
      }
    } catch (error) {
      logger.warn('Redis SET failed, using memory fallback:', error.message);
      this.memoryCache.set(key, value);
      if (ttl) {
        this.memoryTTL.set(key, Date.now() + (ttl * 1000));
      }
      return 'OK';
    }
  }
  
  /**
   * Get a value by key
   */
  async get(key) {
    await this._ensureInitialized();
    try {
      if (this.enabled && this.connected && this.client) {
        return await this.client.get(key);
      } else {
        // Check TTL first
        if (this.memoryTTL.has(key)) {
          const expiry = this.memoryTTL.get(key);
          if (Date.now() > expiry) {
            this.memoryCache.delete(key);
            this.memoryTTL.delete(key);
            return null;
          }
        }
        return this.memoryCache.get(key) || null;
      }
    } catch (error) {
      logger.warn('Redis GET failed, using memory fallback:', error.message);
      if (this.memoryTTL.has(key)) {
        const expiry = this.memoryTTL.get(key);
        if (Date.now() > expiry) {
          this.memoryCache.delete(key);
          this.memoryTTL.delete(key);
          return null;
        }
      }
      return this.memoryCache.get(key) || null;
    }
  }
  
  /**
   * Delete a key
   */
  async del(key) {
    await this._ensureInitialized();
    try {
      if (this.enabled && this.connected && this.client) {
        return await this.client.del(key);
      } else {
        const existed = this.memoryCache.has(key);
        this.memoryCache.delete(key);
        this.memoryTTL.delete(key);
        return existed ? 1 : 0;
      }
    } catch (error) {
      logger.warn('Redis DEL failed, using memory fallback:', error.message);
      const existed = this.memoryCache.has(key);
      this.memoryCache.delete(key);
      this.memoryTTL.delete(key);
      return existed ? 1 : 0;
    }
  }
  
  /**
   * Check if key exists
   */
  async exists(key) {
    await this._ensureInitialized();
    try {
      if (this.enabled && this.connected && this.client) {
        return await this.client.exists(key);
      } else {
        // Check TTL first
        if (this.memoryTTL.has(key)) {
          const expiry = this.memoryTTL.get(key);
          if (Date.now() > expiry) {
            this.memoryCache.delete(key);
            this.memoryTTL.delete(key);
            return 0;
          }
        }
        return this.memoryCache.has(key) ? 1 : 0;
      }
    } catch (error) {
      logger.warn('Redis EXISTS failed, using memory fallback:', error.message);
      if (this.memoryTTL.has(key)) {
        const expiry = this.memoryTTL.get(key);
        if (Date.now() > expiry) {
          this.memoryCache.delete(key);
          this.memoryTTL.delete(key);
          return 0;
        }
      }
      return this.memoryCache.has(key) ? 1 : 0;
    }
  }
  
  /**
   * Set TTL for existing key
   */
  async expire(key, ttl) {
    await this._ensureInitialized();
    try {
      if (this.enabled && this.connected && this.client) {
        return await this.client.expire(key, ttl);
      } else {
        if (this.memoryCache.has(key)) {
          this.memoryTTL.set(key, Date.now() + (ttl * 1000));
          return 1;
        }
        return 0;
      }
    } catch (error) {
      logger.warn('Redis EXPIRE failed, using memory fallback:', error.message);
      if (this.memoryCache.has(key)) {
        this.memoryTTL.set(key, Date.now() + (ttl * 1000));
        return 1;
      }
      return 0;
    }
  }
  
  /**
   * Flush all data
   */
  async flushall() {
    await this._ensureInitialized();
    try {
      if (this.enabled && this.connected && this.client) {
        return await this.client.flushall();
      } else {
        this.memoryCache.clear();
        this.memoryTTL.clear();
        return 'OK';
      }
    } catch (error) {
      logger.warn('Redis FLUSHALL failed, using memory fallback:', error.message);
      this.memoryCache.clear();
      this.memoryTTL.clear();
      return 'OK';
    }
  }
  
  /**
   * Get Redis info or status
   */
  async info() {
    await this._ensureInitialized();
    try {
      if (this.enabled && this.connected && this.client) {
        return await this.client.info();
      } else {
        return `# Memory Cache Fallback
memory_cache_enabled:1
memory_cache_keys:${this.memoryCache.size}
memory_cache_with_ttl:${this.memoryTTL.size}
redis_enabled:${this.enabled}
redis_connected:${this.connected}`;
      }
    } catch (error) {
      logger.warn('Redis INFO failed:', error.message);
      return `# Memory Cache Fallback (Error)
memory_cache_enabled:1
memory_cache_keys:${this.memoryCache.size}
memory_cache_with_ttl:${this.memoryTTL.size}
redis_enabled:${this.enabled}
redis_connected:false
error:${error.message}`;
    }
  }
  
  /**
   * Clean up expired entries from memory cache
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    for (const [key, expiry] of this.memoryTTL.entries()) {
      if (now > expiry) {
        this.memoryCache.delete(key);
        this.memoryTTL.delete(key);
      }
    }
  }
  
  /**
   * Close Redis connection and cleanup
   */
  async disconnect() {
    if (this.client && this.connected) {
      await this.client.disconnect();
      this.connected = false;
      logger.info('Redis disconnected');
    }
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  /**
   * Get connection status
   */
  isConnected() {
    return this.enabled && this.connected;
  }
  
  /**
   * Get current status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      connected: this.connected,
      using_memory_fallback: !this.enabled || !this.connected,
      memory_cache_size: this.memoryCache.size,
      memory_ttl_entries: this.memoryTTL.size
    };
  }
}

// Lazy singleton instance to prevent immediate initialization
let redisInstance = null;

export const redis = (() => {
  if (!redisInstance) {
    redisInstance = new RedisWrapper();
  }
  return redisInstance;
})();

export default redis;
