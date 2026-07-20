/**
 * Rate Limiter Middleware
 * ======================
 *
 * Provides rate limiting for API endpoints to prevent abuse
 * Uses in-memory storage for development (consider Redis for production)
 *
 * Created: 2026-01-05
 * Part of: API Security Layer
 */

import rateLimit from 'express-rate-limit';

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

// Stricter rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
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
  legacyHeaders: false
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
  legacyHeaders: false
});

// Public waiver submission rate limiter (10 req / 15 min per IP)
export const waiverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  // Both fields — see contactLimiter. Public-form consumers read `data.message`.
  message: {
    success: false,
    error: 'Too many waiver submissions, please try again later.',
    message: 'Too many waiver submissions, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public contact / pricing-inquiry rate limiter (5 req / 15 min per IP).
 *
 * POST /api/contact is PUBLIC (prospects aren't logged in) and each accepted
 * submission fans out to SendGrid email + Twilio SMS — real per-message cost,
 * delivered to the owner AND owner's second recipient — plus a CRM lead row.
 * The storefront "Ask About Pricing" button makes this endpoint trivially
 * reachable, so an unthrottled flood would burn Twilio spend, blow up the
 * owners' phones, and poison the lead pipeline. Stricter than waiverLimiter
 * for that reason. 5 leaves room for a genuine prospect asking about several
 * packages; it kills automated abuse.
 *
 * Per-IP keying is correct here: core/app.mjs sets `trust proxy` to 1, so
 * req.ip resolves to the real client, not Render's proxy.
 */
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  // `message` AND `error` carry the same text on purpose: the public form
  // consumers read `data.message` (PricingInquiryModal, OrientationForm), while
  // this module's older limiters used `error`. Sending both means a throttled
  // PROSPECT sees "try again in a few minutes" instead of a generic failure —
  // a false-positive block must stay recoverable, because a lost lead costs
  // vastly more than the handful of messages the cap saves.
  message: {
    success: false,
    error: 'Too many inquiries from this IP. Please try again in a few minutes.',
    message: 'Too many inquiries from this IP. Please try again in a few minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public orientation / "Schedule Your Free Consultation" rate limiter
 * (5 req / 15 min per IP).
 *
 * POST /api/orientation/submit is explicitly public. Each submission writes an
 * Orientation row, raises an admin notification, and intakes SENSITIVE data
 * (healthInfo + waiver initials). Unthrottled it can be used to flood the
 * owner's notifications, poison the consultation pipeline that acquisition
 * depends on, and mass-inject junk health records. A real prospect books a
 * consultation once, so 5 is generous.
 */
export const orientationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  // Both fields — see contactLimiter. OrientationForm reads `errorData.message`.
  message: {
    success: false,
    error: 'Too many consultation requests from this IP. Please try again in a few minutes.',
    message: 'Too many consultation requests from this IP. Please try again in a few minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Post-Save Handoff re-entry rate limiter (30 req / 5 min per IP).
 *
 * GET /api/workout/sessions/:id/handoff is authenticated but triggers a real
 * assembly (60-session proof load + NBA resolve, up to 2500ms of DB work) on
 * every hit with no cache. A legit user re-opens a handoff a handful of times;
 * 30/5min is generous for humans and kills scripted hammering of the endpoint
 * as a DB-load amplification vector (flagged by the Kimi go-live review).
 * Response shape: standard 429 + generic JSON body (express-rate-limit default). This leaks nothing
 * about the target session: the limiter keys on per-IP REQUEST COUNT before auth, independent of
 * whether the session exists — so a 429 cannot function as an existence oracle. (The route itself
 * still 404s identically for miss AND unauthorized.)
 */
export const handoffLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many requests. Please try again in a few minutes.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  apiLimiter,
  authLimiter,
  adminLimiter,
  uploadLimiter,
  waiverLimiter,
  contactLimiter,
  orientationLimiter,
  handoffLimiter,
};