/**
 * AI Rate Limiter
 * ===============
 * In-memory per-user and global rate limiting for AI generation requests.
 * Sliding window counters with TTL-based cleanup.
 *
 * Phase 3A — Provider Router (Smart Workout Logger)
 */
import logger from '../../utils/logger.mjs';

// ── Configuration ────────────────────────────────────────────────────────────

const PER_USER_PER_MINUTE = 10;
const PER_USER_PER_HOUR = 20;
const GLOBAL_PER_MINUTE = 30;
const WINDOW_MINUTE_MS = 60 * 1000;
const WINDOW_HOUR_MS = 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Prune stale entries every 5 min

// ── State ────────────────────────────────────────────────────────────────────

/** @type {Map<number, number[]>} userId → array of request timestamps */
const userRequestsPerMinute = new Map();
/** @type {Map<number, number[]>} userId → array of request timestamps */
const userRequestsPerHour = new Map();
/** @type {number[]} global request timestamps */
let globalRequests = [];

/** @type {Set<number>} userIds with an in-flight request */
const concurrentUsers = new Set();

// Periodic cleanup of stale entries
const _cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of userRequestsPerMinute) {
    const pruned = timestamps.filter(t => now - t < WINDOW_MINUTE_MS);
    if (pruned.length === 0) userRequestsPerMinute.delete(userId);
    else userRequestsPerMinute.set(userId, pruned);
  }
  for (const [userId, timestamps] of userRequestsPerHour) {
    const pruned = timestamps.filter(t => now - t < WINDOW_HOUR_MS);
    if (pruned.length === 0) userRequestsPerHour.delete(userId);
    else userRequestsPerHour.set(userId, pruned);
  }
  globalRequests = globalRequests.filter(t => now - t < WINDOW_MINUTE_MS);
}, CLEANUP_INTERVAL_MS);
// Allow Node to exit even if timer is running
if (_cleanupTimer.unref) _cleanupTimer.unref();

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} RateLimitResult
 * @property {boolean} allowed
 * @property {string|null} code - 'AI_USER_RATE_LIMITED' | 'AI_CONCURRENT_LIMIT' | 'AI_GLOBAL_RATE_LIMITED' | null
 * @property {string|null} message
 */

/**
 * Check if a request is allowed under all rate limits.
 * If allowed, records the request. If not, returns the rejection reason.
 *
 * @param {number} userId
 * @returns {RateLimitResult}
 */
export function checkRateLimit(userId) {
  const now = Date.now();

  // 1. Concurrent limit (1 per user)
  if (concurrentUsers.has(userId)) {
    return {
      allowed: false,
      code: 'AI_CONCURRENT_LIMIT',
      message: 'An AI generation request is already in progress. Please wait for it to complete.',
    };
  }

  // 2. Per-user per-minute
  const minuteTimestamps = (userRequestsPerMinute.get(userId) || []).filter(t => now - t < WINDOW_MINUTE_MS);
  if (minuteTimestamps.length >= PER_USER_PER_MINUTE) {
    logSuspicious(userId, 'per_minute_limit');
    return {
      allowed: false,
      code: 'AI_USER_RATE_LIMITED',
      message: `Rate limit exceeded. Maximum ${PER_USER_PER_MINUTE} AI requests per minute.`,
    };
  }

  // 3. Per-user per-hour
  const hourTimestamps = (userRequestsPerHour.get(userId) || []).filter(t => now - t < WINDOW_HOUR_MS);
  if (hourTimestamps.length >= PER_USER_PER_HOUR) {
    return {
      allowed: false,
      code: 'AI_USER_RATE_LIMITED',
      message: `Rate limit exceeded. Maximum ${PER_USER_PER_HOUR} AI requests per hour.`,
    };
  }

  // 4. Global per-minute
  globalRequests = globalRequests.filter(t => now - t < WINDOW_MINUTE_MS);
  if (globalRequests.length >= GLOBAL_PER_MINUTE) {
    return {
      allowed: false,
      code: 'AI_GLOBAL_RATE_LIMITED',
      message: 'AI system is experiencing high demand. Please try again in a moment.',
    };
  }

  // All limits passed — record request
  minuteTimestamps.push(now);
  hourTimestamps.push(now);
  globalRequests.push(now);
  userRequestsPerMinute.set(userId, minuteTimestamps);
  userRequestsPerHour.set(userId, hourTimestamps);
  concurrentUsers.add(userId);

  return { allowed: true, code: null, message: null };
}

/**
 * Release the concurrent lock for a user. Called after request completes.
 * @param {number} userId
 */
export function releaseConcurrent(userId) {
  concurrentUsers.delete(userId);
}

/**
 * Reset all rate limit state. Used in tests.
 */
export function resetAll() {
  userRequestsPerMinute.clear();
  userRequestsPerHour.clear();
  globalRequests = [];
  concurrentUsers.clear();
}

// ── Suspicious Activity Tracking ─────────────────────────────────────────────

/** @type {Map<number, number[]>} userId → timestamps of rate limit hits */
const rateLimitHits = new Map();

function logSuspicious(userId, reason) {
  const now = Date.now();
  const hits = (rateLimitHits.get(userId) || []).filter(t => now - t < 5 * 60 * 1000);
  hits.push(now);
  rateLimitHits.set(userId, hits);

  if (hits.length >= 3) {
    logger.warn('[Rate Limiter] Suspicious repeated rate limit hits', {
      userId,
      reason,
      hitsInWindow: hits.length,
    });
  }
}
