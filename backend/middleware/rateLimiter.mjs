/**
 * Rate Limiter Middleware
 * ======================
 *
 * Provides rate limiting for API endpoints to prevent abuse.
 *
 * M-05 / L-01 (hostile review of the review, 2026-09-18)
 * -----------------------------------------------------
 * The repo has TWO implementations both exporting a symbol called
 * `rateLimiter`:
 *
 *   - this file (express-rate-limit)          -> apiLimiter, adminLimiter, ...
 *   - middleware/authMiddleware.mjs:872       -> a hand-rolled in-memory one
 *
 * They differ in keying, storage and header semantics, so their limits are not
 * comparable; and BOTH were in-memory, so on a multi-instance deployment each
 * instance enforced its own counter and the effective limit was
 * N_instances x configured — i.e. the limit was not the limit.
 *
 * THIS FILE IS THE AUTHORITATIVE IMPLEMENTATION. `authMiddleware.rateLimiter`
 * is legacy and should be retired route by route; new code uses these.
 *
 * Storage: a small ioredis-backed store is used whenever REDIS_URL is set, so
 * the counter is shared across instances. Without Redis it falls back to
 * express-rate-limit's in-memory store, and says so at startup. Store errors
 * fail OPEN (requests are served) — for a rate limiter, availability beats
 * strictness, and failing closed would turn a Redis blip into a total outage.
 */

import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.mjs';

/**
 * Minimal express-rate-limit v7 store backed by ioredis.
 * Implements only the methods v7 requires; `localKeys = false` because the
 * counters do not live in this process.
 */
class RedisRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.localKeys = false;
    this.client = null;
  }

  init(options) {
    this.windowMs = options.windowMs;
    if (this.client) return;
    // Lazy import so a deployment without Redis never loads ioredis.
    import('ioredis')
      .then(({ default: Redis }) => {
        this.client = new Redis(process.env.REDIS_URL, {
          lazyConnect: false,
          maxRetriesPerRequest: 1,
        });
        this.client.on('error', (err) => {
          logger.warn(`[rateLimit] Redis store error (failing open): ${err.message}`);
        });
        logger.info(`[rateLimit] Using Redis-backed store for ${this.prefix}`);
      })
      .catch((err) => {
        logger.warn(`[rateLimit] ioredis unavailable (${err.message}) — using in-memory store`);
      });
  }

  async increment(key) {
    if (!this.client) {
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
    try {
      const redisKey = `${this.prefix}:${key}`;
      const totalHits = await this.client.incr(redisKey);
      if (totalHits === 1) await this.client.pexpire(redisKey, this.windowMs);
      const ttl = await this.client.pttl(redisKey);
      return {
        totalHits,
        resetTime: new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs)),
      };
    } catch (err) {
      // Fail open — see the header note.
      logger.warn(`[rateLimit] Redis increment failed (failing open): ${err.message}`);
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(key) {
    if (!this.client) return;
    try { await this.client.decr(`${this.prefix}:${key}`); } catch { /* fail open */ }
  }

  async resetKey(key) {
    if (!this.client) return;
    try { await this.client.del(`${this.prefix}:${key}`); } catch { /* fail open */ }
  }
}

/** Shared store selection: Redis when configured, otherwise the default. */
function storeFor(prefix) {
  return process.env.REDIS_URL ? new RedisRateLimitStore(prefix) : undefined;
}

// API Rate Limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: storeFor('rl:api'),
  // Skip rate limiting for health checks and static assets
  skip: (req) => {
    return req.path === '/health' ||
           req.path === '/api/health' ||
           req.path.startsWith('/static/') ||
           req.path.startsWith('/assets/');
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Stricter rate limiter for authentication endpoints.
 *
 * L-01: this was written, exported, documented — and imported by nothing, so a
 * purpose-built brute-force control sat dead while `/login` used an ad-hoc
 * inline limiter from the OTHER implementation. It is now wired to `/login`
 * and `/refresh-token` in routes/authRoutes.mjs.
 *
 * max is 10, not 5: that is the limit `/login` already enforced, so wiring this
 * in changes which implementation is used without changing how many attempts a
 * client gets. A studio's clients behind one NAT IP would otherwise have been
 * silently locked out by a "fix".
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: {
    success: false,
    error: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: storeFor('rl:auth'),
  skip: (req) => req.path === '/health' || req.path === '/api/health'
});

// Admin endpoints rate limiter (more restrictive)
export const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit admin actions
  message: {
    success: false,
    error: 'Too many admin requests, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: storeFor('rl:admin')
});

// File upload rate limiter (stricter for uploads)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit file uploads
  message: {
    success: false,
    error: 'Too many file uploads, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: storeFor('rl:upload')
});

// Public waiver submission rate limiter (10 req / 15 min per IP)
export const waiverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too many waiver submissions, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: storeFor('rl:waiver'),
});

export default {
  apiLimiter,
  authLimiter,
  adminLimiter,
  uploadLimiter,
  waiverLimiter,
};