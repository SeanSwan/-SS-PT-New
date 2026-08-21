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

const PER_USER_PER_MINUTE = 3;
const PER_USER_PER_HOUR = 60;
const GLOBAL_PER_MINUTE = 60;
const WINDOW_MINUTE_MS = 60 * 1000;
const WINDOW_HOUR_MS = 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Prune stale entries every 5 min
const SUSPICIOUS_WINDOW_MS = 5 * 60 * 1000; // Window for repeated-rate-limit-hit detection

// ── State ────────────────────────────────────────────────────────────────────

/** @type {Map<number, number[]>} userId → array of request timestamps */
const userRequestsPerMinute = new Map();
/** @type {Map<number, number[]>} userId → array of request timestamps */
const userRequestsPerHour = new Map();
/** @type {number[]} global request timestamps */
let globalRequests = [];

/** @type {Map<number, number>} userId → timestamp when lock was acquired */
const concurrentUsers = new Map();
const CONCURRENT_LOCK_TIMEOUT_MS = 35_000; // Auto-release stuck locks after 35s (Render proxy timeout is 30s)

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

  // S6: the two maps the original sweep forgot.
  //
  // Filtering is not eviction. A user who trips the limit once and never returns
  // was never revisited, so their key survived for the life of the process; the
  // same is true of a concurrent lock whose owner never comes back (auto-release
  // only fires on that user's NEXT request, which may never arrive).
  //
  // Growth here is bounded by the number of authenticated users, NOT attacker-
  // amplifiable — unlike the req.ip-keyed limiter in middleware/authMiddleware.mjs,
  // where rotating source IPs minted unbounded keys. That sibling was hardened on
  // 2026-07-29 with a sweep plus a maxKeys FIFO cap; the fix did not sweep sideways
  // to this file. Same bug class, lower severity, fixed here for completeness.
  for (const [userId, timestamps] of rateLimitHits) {
    const pruned = timestamps.filter(t => now - t < SUSPICIOUS_WINDOW_MS);
    if (pruned.length === 0) rateLimitHits.delete(userId);
    else rateLimitHits.set(userId, pruned);
  }
  for (const [userId, lockTime] of concurrentUsers) {
    if (now - lockTime > CONCURRENT_LOCK_TIMEOUT_MS) concurrentUsers.delete(userId);
  }
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

  // 1. Concurrent limit (1 per user) with stuck-lock auto-release
  if (concurrentUsers.has(userId)) {
    const lockTime = concurrentUsers.get(userId);
    if (now - lockTime > CONCURRENT_LOCK_TIMEOUT_MS) {
      // Lock is stuck — auto-release and allow this request
      logger.warn('[Rate Limiter] Auto-releasing stuck concurrent lock for user %d (held %ds)',
        userId, Math.round((now - lockTime) / 1000));
      concurrentUsers.delete(userId);
    } else {
      return {
        allowed: false,
        code: 'AI_CONCURRENT_LIMIT',
        message: 'An AI generation request is already in progress. Please wait for it to complete.',
      };
    }
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
  concurrentUsers.set(userId, now);

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
 * Reset ALL rate limit state, including the suspicious-hit tracker. Used in tests.
 *
 * S6: this previously cleared four of the five state maps and left `rateLimitHits`
 * populated, while its own docstring said "all". State therefore leaked between
 * tests: a suite that provoked three rejections left the counter armed, so the very
 * next test's FIRST rejection tripped the >= 3 suspicious warning. That also made
 * the detector untestable in isolation. Pinned by aiRateLimiterStateHygiene.test.mjs.
 */
export function resetAll() {
  userRequestsPerMinute.clear();
  userRequestsPerHour.clear();
  globalRequests = [];
  concurrentUsers.clear();
  rateLimitHits.clear();
}

// ── Suspicious Activity Tracking ─────────────────────────────────────────────

/** @type {Map<number, number[]>} userId → timestamps of rate limit hits */
const rateLimitHits = new Map();

function logSuspicious(userId, reason) {
  const now = Date.now();
  const hits = (rateLimitHits.get(userId) || []).filter(t => now - t < SUSPICIOUS_WINDOW_MS);
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
