/**
 * AI Rate Limiter Middleware
 * ==========================
 * Express middleware wrapper for the AI rate limiter.
 * Placed in the route chain AFTER auth but BEFORE the controller.
 *
 * Route chain: protect → aiKillSwitch → aiRateLimiter → generateWorkoutPlan
 *
 * Phase 3A — Provider Router (Smart Workout Logger)
 */
import { checkRateLimit } from '../services/ai/rateLimiter.mjs';

/**
 * Express middleware that enforces AI generation rate limits.
 * Returns 429 if the request exceeds per-user or global limits.
 */
export function aiRateLimiter(req, res, next) {
  const userId = req.user?.id;

  if (!userId) {
    // Auth middleware should have caught this — but fail safe
    return res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
  }

  const result = checkRateLimit(userId);

  if (!result.allowed) {
    const httpStatus = result.code === 'AI_GLOBAL_RATE_LIMITED' ? 503 : 429;
    return res.status(httpStatus).json({
      success: false,
      code: result.code,
      message: result.message,
    });
  }

  next();
}
