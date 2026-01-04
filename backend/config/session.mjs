/**
 * Session Configuration with Redis Support
 * =========================================
 *
 * Provides scalable session storage using Redis for multi-instance deployments.
 * Falls back to in-memory sessions for development if Redis is unavailable.
 */

import session from 'express-session';
import RedisStore from 'connect-redis';
import Redis from 'ioredis';
import logger from '../utils/logger.mjs';

/**
 * Create Redis client with production-ready configuration
 */
const createRedisClient = () => {
  const redisConfig = {
    // Render provides REDIS_URL, fallback to local Redis
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    // Connection resilience
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  };

  // If REDIS_URL is provided (Render/production), use it directly
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, {
      retryStrategy: redisConfig.retryStrategy,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      enableReadyCheck: redisConfig.enableReadyCheck,
      lazyConnect: redisConfig.lazyConnect,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    });
  }

  return new Redis(redisConfig);
};

/**
 * Initialize session middleware with Redis or in-memory store
 */
export const initializeSession = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const useRedis = process.env.USE_REDIS_SESSIONS !== 'false'; // Default to true

  let store;
  let redisClient;

  if (useRedis) {
    try {
      redisClient = createRedisClient();

      // Connect to Redis
      await redisClient.connect();

      logger.info('✅ Redis connected successfully for session storage');

      // Create Redis store
      store = new RedisStore({
        client: redisClient,
        prefix: 'swanstudios:sess:',
        ttl: 86400, // 24 hours in seconds
      });

      // Handle Redis errors gracefully
      redisClient.on('error', (err) => {
        logger.error('Redis Client Error:', err);
      });

      redisClient.on('reconnecting', () => {
        logger.warn('Redis client reconnecting...');
      });

      redisClient.on('ready', () => {
        logger.info('Redis client ready');
      });

    } catch (error) {
      logger.error('Failed to connect to Redis, falling back to in-memory sessions:', error);
      logger.warn('⚠️  Using in-memory session store - NOT suitable for multi-instance deployments');
      store = undefined; // Will use default MemoryStore
    }
  } else {
    logger.info('📝 Redis sessions disabled via USE_REDIS_SESSIONS=false');
    logger.warn('⚠️  Using in-memory session store - NOT suitable for multi-instance deployments');
  }

  // Session middleware configuration
  const sessionConfig = {
    store,
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'swanstudios.sid', // Custom session cookie name
    cookie: {
      secure: isProduction, // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: isProduction ? 'none' : 'lax', // CORS support in production
      domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
    },
    rolling: true, // Refresh session expiry on each request
  };

  // Log session configuration
  logger.info('Session Configuration:');
  logger.info(`  - Store: ${store ? 'Redis' : 'Memory (default)'}`);
  logger.info(`  - Secure Cookies: ${sessionConfig.cookie.secure}`);
  logger.info(`  - SameSite: ${sessionConfig.cookie.sameSite}`);
  logger.info(`  - Max Age: ${sessionConfig.cookie.maxAge / 1000 / 60} minutes`);

  return {
    middleware: session(sessionConfig),
    redisClient,
    store,
  };
};

/**
 * Graceful shutdown for Redis connection
 */
export const closeRedisConnection = async (redisClient) => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('✅ Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
};
