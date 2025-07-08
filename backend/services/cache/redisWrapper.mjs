/**
 * Redis Wrapper Service - ORIGINAL WORKING VERSION
 * ================================================
 * Memory cache fallback that was working before our changes
 * Simple, safe, no Redis import blocking
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger.mjs';

class RedisWrapper extends EventEmitter {
  constructor() {
    super();
    
    this.enabled = false; // Always disabled for production
    this.connected = false;
    this.client = null;
    this.initialized = true;
    
    // In-memory cache fallback
    this.memoryCache = new Map();
    this.memoryTTL = new Map();
    
    // Clean up expired cache entries periodically
    this.cleanupInterval = setInterval(() => this.cleanupExpiredEntries(), 60000);
    
    // Emit ready immediately
    setTimeout(() => this.emit('ready'), 0);
    
    logger.info('Redis wrapper initialized with memory cache fallback');
  }
  
  async set(key, value, ttl = null) {
    this.memoryCache.set(key, value);
    if (ttl) {
      this.memoryTTL.set(key, Date.now() + (ttl * 1000));
    }
    return 'OK';
  }
  
  async get(key) {
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
  
  async del(key) {
    const existed = this.memoryCache.has(key);
    this.memoryCache.delete(key);
    this.memoryTTL.delete(key);
    return existed ? 1 : 0;
  }
  
  async exists(key) {
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
  
  async expire(key, ttl) {
    if (this.memoryCache.has(key)) {
      this.memoryTTL.set(key, Date.now() + (ttl * 1000));
      return 1;
    }
    return 0;
  }
  
  async flushall() {
    this.memoryCache.clear();
    this.memoryTTL.clear();
    return 'OK';
  }
  
  async info() {
    return `# Memory Cache Fallback
memory_cache_enabled:1
memory_cache_keys:${this.memoryCache.size}
memory_cache_with_ttl:${this.memoryTTL.size}
redis_enabled:${this.enabled}
redis_connected:${this.connected}`;
  }
  
  cleanupExpiredEntries() {
    const now = Date.now();
    for (const [key, expiry] of this.memoryTTL.entries()) {
      if (now > expiry) {
        this.memoryCache.delete(key);
        this.memoryTTL.delete(key);
      }
    }
  }
  
  async disconnect() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  isConnected() {
    return this.connected;
  }
  
  getStatus() {
    return {
      enabled: this.enabled,
      connected: this.connected,
      using_memory_fallback: true,
      memory_cache_size: this.memoryCache.size,
      memory_ttl_entries: this.memoryTTL.size
    };
  }
}

// Singleton instance
let redisInstance = null;

export const redis = (() => {
  if (!redisInstance) {
    redisInstance = new RedisWrapper();
  }
  return redisInstance;
})();

export default redis;
