#!/usr/bin/env node

/**
 * Comprehensive Redis Connection Blocker
 * Prevents all Redis connections before any modules load
 */

// Override ioredis import to prevent connections entirely
import Module from 'module';

const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'ioredis' || id.includes('ioredis')) {
    // Return a mock ioredis that never attempts connections
    return class MockIORedis {
      constructor() {
        this.status = 'disconnected';
        return this;
      }
      
      // Mock all common ioredis methods
      connect() { return Promise.resolve(); }
      disconnect() { return Promise.resolve(); }
      quit() { return Promise.resolve(); }
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
      on() { return this; }
      off() { return this; }
      once() { return this; }
      removeListener() { return this; }
      emit() { return this; }
      
      // Cluster methods
      static Cluster = class MockCluster extends this {};
    };
  }
  
  return originalRequire.apply(this, arguments);
};

// Also override ES6 imports
const originalLoader = globalThis.__loader;
if (originalLoader) {
  globalThis.__loader = function(url, context, nextLoad) {
    if (url.includes('ioredis')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: `
          export default class MockIORedis {
            constructor() { this.status = 'disconnected'; }
            connect() { return Promise.resolve(); }
            disconnect() { return Promise.resolve(); }
            quit() { return Promise.resolve(); }
            get() { return Promise.resolve(null); }
            set() { return Promise.resolve('OK'); }
            del() { return Promise.resolve(1); }
            exists() { return Promise.resolve(0); }
            keys() { return Promise.resolve([]); }
            hget() { return Promise.resolve(null); }
            hset() { return Promise.resolve(1); }
            hgetall() { return Promise.resolve({}); }
            on() { return this; }
            off() { return this; }
            once() { return this; }
            removeListener() { return this; }
            emit() { return this; }
          }
          
          export const Redis = MockIORedis;
          export { MockIORedis as Cluster };
        `
      };
    }
    return originalLoader(url, context, nextLoad);
  };
}

console.log('🚫 Redis connection blocker activated - preventing all ioredis connections');
