/**
 * AI Command Guards — Lane Kill Switch + Rate Limiter
 * ====================================================
 * Express middleware for the Swan Coach command lane (/api/ai-command).
 *
 * Route chain: protect → aiCommandLaneKillSwitch → aiCommandRateLimiter → handler
 *
 * The command lane previously had NO rate limiter (verified 2026-06-10).
 * Limits are higher than the chat lane's (3/min) because voice-driven rapid
 * logging legitimately fires commands in bursts.
 *
 *   AI_COMMANDS_ENABLED=false       → whole lane 503s (default ON)
 *   AI_COMMAND_RATE_PER_MINUTE      → per-user/minute (default 10)
 *   AI_COMMAND_RATE_PER_HOUR        → per-user/hour (default 120)
 *
 * Slice F1 — Command-Lane Security Foundation (2026-06-10)
 */
import logger from '../utils/logger.mjs';
import {
  isCommandLaneEnabled,
  COMMAND_LANE_PAUSED_MESSAGE,
} from '../services/ai/commandLaneControls.mjs';

const DEFAULT_PER_MINUTE = 10;
const DEFAULT_PER_HOUR = 120;
const WINDOW_MINUTE_MS = 60 * 1000;
const WINDOW_HOUR_MS = 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function envLimit(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// ── State ────────────────────────────────────────────────────────────────────

/** @type {Map<number, number[]>} userId → request timestamps (minute window) */
const minuteRequests = new Map();
/** @type {Map<number, number[]>} userId → request timestamps (hour window) */
const hourRequests = new Map();

const _cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of minuteRequests) {
    const pruned = timestamps.filter((t) => now - t < WINDOW_MINUTE_MS);
    if (pruned.length === 0) minuteRequests.delete(userId);
    else minuteRequests.set(userId, pruned);
  }
  for (const [userId, timestamps] of hourRequests) {
    const pruned = timestamps.filter((t) => now - t < WINDOW_HOUR_MS);
    if (pruned.length === 0) hourRequests.delete(userId);
    else hourRequests.set(userId, pruned);
  }
}, CLEANUP_INTERVAL_MS);
if (_cleanupTimer.unref) _cleanupTimer.unref();

// ── Middleware ───────────────────────────────────────────────────────────────

/**
 * Lane kill switch. Blocks the whole command lane when
 * AI_COMMANDS_ENABLED === 'false'. Default: enabled.
 */
export function aiCommandLaneKillSwitch(req, res, next) {
  if (!isCommandLaneEnabled()) {
    logger.info('[AI Command Kill Switch] Command lane disabled via AI_COMMANDS_ENABLED=false', {
      userId: req.user?.id,
      route: req.originalUrl || req.path,
    });
    return res.status(503).json({
      success: false,
      code: 'AI_COMMANDS_DISABLED',
      message: COMMAND_LANE_PAUSED_MESSAGE,
    });
  }
  next();
}

/**
 * Per-user rate limiter for the command lane.
 * 429 with code AI_COMMAND_RATE_LIMITED when over per-minute or per-hour limit.
 */
export function aiCommandRateLimiter(req, res, next) {
  const userId = req.user?.id;
  if (!userId) {
    // protect middleware should have caught this — fail safe
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  const now = Date.now();
  const perMinute = envLimit('AI_COMMAND_RATE_PER_MINUTE', DEFAULT_PER_MINUTE);
  const perHour = envLimit('AI_COMMAND_RATE_PER_HOUR', DEFAULT_PER_HOUR);

  const minuteTimestamps = (minuteRequests.get(userId) || []).filter((t) => now - t < WINDOW_MINUTE_MS);
  if (minuteTimestamps.length >= perMinute) {
    logger.warn('[AI Command Rate Limiter] Per-minute limit hit', { userId, perMinute });
    return res.status(429).json({
      success: false,
      code: 'AI_COMMAND_RATE_LIMITED',
      message: `Rate limit exceeded. Maximum ${perMinute} Coach commands per minute.`,
    });
  }

  const hourTimestamps = (hourRequests.get(userId) || []).filter((t) => now - t < WINDOW_HOUR_MS);
  if (hourTimestamps.length >= perHour) {
    logger.warn('[AI Command Rate Limiter] Per-hour limit hit', { userId, perHour });
    return res.status(429).json({
      success: false,
      code: 'AI_COMMAND_RATE_LIMITED',
      message: `Rate limit exceeded. Maximum ${perHour} Coach commands per hour.`,
    });
  }

  minuteTimestamps.push(now);
  hourTimestamps.push(now);
  minuteRequests.set(userId, minuteTimestamps);
  hourRequests.set(userId, hourTimestamps);

  next();
}

/** Reset limiter state. Tests only. */
export function resetCommandRateLimiter() {
  minuteRequests.clear();
  hourRequests.clear();
}
