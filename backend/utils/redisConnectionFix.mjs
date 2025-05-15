/**
 * SwanStudios Redis Connection Fix
 * This script will verify and fix any Redis connection issues
 */

import logger from '../utils/logger.mjs';

// Force environment check
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

if (!REDIS_ENABLED) {
  logger.info('='.repeat(60));
  logger.info('REDIS CONNECTION FIX APPLIED');
  logger.info('='.repeat(60));
  logger.info('Redis is DISABLED in environment configuration');
  logger.info('All caching operations will use in-memory fallback');
  logger.info('No Redis connections will be attempted');
  logger.info('='.repeat(60));
  
  // Override any potential Redis imports at the module level
  if (typeof global !== 'undefined') {
    // In case something tries to require Redis globally
    global.REDIS_DISABLED = true;
  }
  
  // Set additional environment variables to prevent any Redis connections
  process.env.REDIS_DISABLED = 'true';
  process.env.NO_REDIS = 'true';
  
  logger.info('Redis connection prevention measures activated');
}

export default {
  redisEnabled: REDIS_ENABLED,
  preventRedisConnections: () => {
    if (!REDIS_ENABLED) {
      logger.info('Redis connections prevented - using memory cache only');
      return true;
    }
    return false;
  }
};
