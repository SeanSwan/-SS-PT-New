/**
 * Redis Connection Preventer
 * Ensures no Redis connections are attempted when Redis is disabled
 */

import logger from '../utils/logger.mjs';

/**
 * Verify Redis configuration and prevent unwanted connections
 */
export function preventRedisConnections() {
  const redisEnabled = process.env.REDIS_ENABLED === 'true';
  
  logger.info(`Redis Configuration Check - Enabled: ${redisEnabled}`);
  
  if (!redisEnabled) {
    // Set environment flags to prevent Redis connections
    process.env.REDIS_DISABLED = 'true';
    process.env.NO_REDIS = 'true';
    
    // Set global flags if available
    if (typeof global !== 'undefined') {
      global.REDIS_DISABLED = true;
      global.NO_REDIS = true;
    }
    
    logger.info('Redis connection prevention measures active');
  } else {
    logger.info('Redis is enabled - connections will be attempted');
  }
}

/**
 * Check if Redis server is actually available before attempting connection
 */
export async function checkRedisAvailability() {
  if (process.env.REDIS_ENABLED !== 'true') {
    return { available: false, reason: 'Redis is disabled' };
  }
  
  try {
    // Simple TCP connection check without importing ioredis
    const net = await import('net');
    
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 3000; // 3 seconds
      
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve({ available: true, reason: 'Redis server is reachable' });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ available: false, reason: 'Redis server connection timeout' });
      });
      
      socket.on('error', (error) => {
        socket.destroy();
        resolve({ available: false, reason: `Redis server error: ${error.message}` });
      });
      
      // Extract host and port from Redis URL
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const url = new URL(redisUrl);
      const host = url.hostname || 'localhost';
      const port = parseInt(url.port) || 6379;
      
      socket.connect(port, host);
    });
  } catch (error) {
    return { available: false, reason: `Check failed: ${error.message}` };
  }
}

export default {
  preventRedisConnections,
  checkRedisAvailability
};
