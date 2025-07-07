/**
 * Redis Connection Blocker - MINIMAL SAFE EDITION  
 * ===============================================
 * Only sets environment variables - NO console interception
 * NO process event blocking - completely safe for server startup
 */

// Check Redis configuration immediately
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

if (!REDIS_ENABLED) {
  // Only set environment flags - nothing else
  process.env.NODE_REDIS_DISABLED = 'true';
  process.env.REDIS_DISABLED = 'true';
  process.env.DISABLE_REDIS = 'true';
  process.env.NO_REDIS = 'true';
  
  // Remove Redis connection environment variables if they exist
  if (process.env.REDIS_URL) {
    delete process.env.REDIS_URL;
  }
  
  if (process.env.REDIS_HOST) {
    delete process.env.REDIS_HOST;
  }
}

export default {
  isActive: !REDIS_ENABLED,
  level: 'MINIMAL_SAFE',
  message: REDIS_ENABLED ? 'Redis connections allowed' : 'Redis environment variables disabled only'
};
