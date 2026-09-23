/**
 * Session Configuration with Redis Support
 * =========================================
 *
 * Provides scalable session storage using Redis for multi-instance deployments.
 * Falls back to in-memory sessions for development if Redis is unavailable.
 */

import session from 'express-session';
import { RedisStore } from 'connect-redis';
import Redis from 'ioredis';
import { randomBytes } from 'node:crypto';
import logger from '../utils/logger.mjs';

const shouldUseRedisSessions = () => {
  if (process.env.USE_REDIS_SESSIONS === 'true') return true;
  if (process.env.USE_REDIS_SESSIONS === 'false') return false;

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    // In production, require an explicit Redis URL to avoid noisy localhost retries.
    return Boolean(process.env.REDIS_URL);
  }

  // In development/test default to in-memory sessions unless explicitly enabled.
  return false;
};

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
  const useRedis = shouldUseRedisSessions();
  const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET;

  /**
   * A degraded session store in production is not a warning.
   *
   * express-session's MemoryStore is explicitly not for production: it is
   * per-instance (sessions vanish on restart and are not shared across
   * instances) and it never prunes, so it grows without bound. `rolling: true`
   * plus any `req.session` write re-saves the session on every request, so
   * unauthenticated traffic can grow it too — a Redis outage degrading to this
   * store turns into unbounded memory growth rather than a loud failure.
   *
   * Previously this degradation logged at `warn` level in production, sitting
   * next to routine startup noise. It is an `error` in production now.
   */
  const reportStoreDegradation = (reason) => {
    const detail = `Session store degraded to the in-memory MemoryStore (${reason}). `
      + 'Sessions are per-instance, lost on restart, and the store never prunes.';
    if (isProduction) {
      logger.error(`⛔ ${detail} Not a production-safe store — set REDIS_URL / fix the Redis connection.`);
    } else {
      logger.warn(`⚠️  ${detail} Expected outside production.`);
    }
  };

  if (isProduction && !sessionSecret) {
    throw new Error('SESSION_SECRET or JWT_SECRET is required in production');
  }

  /**
   * M-04 fix (hostile review of the review, 2026-09-18) — key separation.
   *
   * Reusing the JWT signing secret as the session-cookie signing secret means a
   * single leak compromises both, and the project's own standard already
   * forbids it elsewhere (authControllerJwtSecretGuard.test.mjs,
   * coachProposalReviewSecretGuard.test.mjs).
   *
   * WHY THIS WARNS INSTEAD OF THROWING
   * ----------------------------------
   * The ledger recommended "require an independent SESSION_SECRET" — a hard
   * fail-fast. Applied literally, that would break production login the moment
   * the Render environment does not define SESSION_SECRET, and nothing in the
   * ledger checks whether it does. The repo's own .env defines JWT_SECRET and
   * NO SESSION_SECRET (key names only were inspected, never values).
   *
   * A blind fail-fast on an unverified environment variable is exactly the
   * class of change §11.2 refused to make for E-06's TTL default. Same
   * reasoning applies here, so: keep working, say it loudly, and make the
   * hard-fail a deliberate follow-up once the environment is confirmed.
   */
  if (isProduction && !process.env.SESSION_SECRET && process.env.JWT_SECRET) {
    logger.error(
      '⚠️  [session] SESSION_SECRET is not set — falling back to JWT_SECRET. '
      + 'This is cryptographic key reuse: one leak compromises both sessions and tokens. '
      + 'Set a distinct SESSION_SECRET in the environment (openssl rand -hex 32). '
      + 'Once confirmed, this fallback should be removed (M-04).',
    );
  }

  if (isProduction && !useRedis) {
    reportStoreDegradation(
      process.env.USE_REDIS_SESSIONS === 'false' ? 'USE_REDIS_SESSIONS=false' : 'REDIS_URL not set',
    );
  }

  let store;
  let redisClient;

  if (useRedis) {
    try {
      redisClient = createRedisClient();

      // Attach handlers BEFORE connect() so ioredis does not emit unhandled errors.
      redisClient.on('error', (err) => {
        logger.error('Redis Client Error:', err);
      });

      redisClient.on('reconnecting', () => {
        logger.warn('Redis client reconnecting...');
      });

      redisClient.on('ready', () => {
        logger.info('Redis client ready');
      });

      // Connect to Redis
      await redisClient.connect();

      logger.info('✅ Redis connected successfully for session storage');

      // Create Redis store
      store = new RedisStore({
        client: redisClient,
        prefix: 'swanstudios:sess:',
        ttl: 86400, // 24 hours in seconds
      });

    } catch (error) {
      logger.error('Failed to connect to Redis, falling back to in-memory sessions:', error);
      reportStoreDegradation('Redis connection failed');
      // Stop reconnect loops after startup failure.
      try {
        if (redisClient) {
          await redisClient.quit();
        }
      } catch {
        try {
          redisClient?.disconnect();
        } catch {
          // Ignore shutdown errors during fallback.
        }
      } finally {
        redisClient = undefined;
      }
      store = undefined; // Will use default MemoryStore
    }
  } else {
    logger.info('📝 Redis sessions disabled via USE_REDIS_SESSIONS=false');
    reportStoreDegradation('USE_REDIS_SESSIONS=false');
  }

  // Hostile-review fix: never fall back to a PUBLIC hardcoded secret. The
  // production check above already throws when no secret is set; outside
  // production, generate a per-process secret instead of shipping a known
  // literal ("fallback-secret-change-in-production" was exactly that — any
  // session cookie signed with it is forgeable by anyone who has read this
  // repo). Non-production sessions are in-memory by default, so a per-boot
  // secret invalidates nothing of value.
  const effectiveSecret = sessionSecret || randomBytes(32).toString('hex');
  if (!sessionSecret) {
    logger.warn('⚠️  SESSION_SECRET/JWT_SECRET unset — generated a per-process session secret. Set SESSION_SECRET in .env to keep sessions valid across restarts.');
  }

  // Session middleware configuration
  const sessionConfig = {
    store,
    secret: effectiveSecret,
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
