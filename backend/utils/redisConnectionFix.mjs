/**
 * Redis Connection Fix
 * Simplified version - main fix now implemented via dynamic imports in redisWrapper
 */

import logger from '../utils/logger.mjs';

// Force environment check
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

if (!REDIS_ENABLED) {
  logger.info('='.repeat(60));
  logger.info('REDIS CONNECTION FIX ACTIVE');
  logger.info('='.repeat(60));
  logger.info('Redis is DISABLED in environment configuration');
  logger.info('Redis wrapper will use memory cache fallback');
  logger.info('ioredis module will NOT be loaded (preventing connection attempts)');
  logger.info('='.repeat(60));
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
