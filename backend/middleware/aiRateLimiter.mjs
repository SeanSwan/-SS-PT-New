/**
 * AI Rate Limiter Middleware
 * ==========================
 * Express middleware wrapper for the AI rate limiter.
 * Placed in the route chain AFTER auth but BEFORE the controller.
 *
 * Route chain: protect → aiKillSwitch → aiRateLimiter → generateWorkoutPlan
 *
 * CRITICAL FIX: Automatically releases the concurrent lock when the response
 * finishes, so downstream handlers can never forget to release it.
 * This fixes the bug where a user gets permanently 429'd after one AI request.
 *
 * Phase 3A — Provider Router (Smart Workout Logger)
 */
import { checkRateLimit, releaseConcurrent } from '../services/ai/rateLimiter.mjs';

/**
 * Express middleware that enforces AI generation rate limits.
 * Returns 429 if the request exceeds per-user or global limits.
 * Auto-releases the concurrent lock when the response completes.
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

  // Auto-release concurrent lock when response finishes (or connection closes)
  // This ensures the lock is ALWAYS released, even if the handler crashes or forgets
  let released = false;
  const releaseOnce = () => {
    if (released) return;
    released = true;
    releaseConcurrent(userId);
    res.removeListener('finish', releaseOnce);
    res.removeListener('close', releaseOnce);
  };
  res.on('finish', releaseOnce);
  res.on('close', releaseOnce);

  next();
}
