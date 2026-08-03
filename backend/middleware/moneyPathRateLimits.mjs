/**
 * ============================================================================
 * FILE: moneyPathRateLimits.mjs
 * PURPOSE: Rate limits for the revenue path (cart mutations + Stripe Checkout
 *          Session creation). Launch audit Lane 4, 2026-08-03.
 *
 * WHY THIS EXISTS: before this file, NO endpoint on the money path carried a
 * limiter — not cart add/update/remove/clear, not create-checkout-session.
 * `POST /api/v2/payments/create-checkout-session` mints a real Stripe object on
 * every call, so an authenticated account could loop it and (a) burn Stripe API
 * quota, (b) flood the dashboard with abandoned sessions, (c) churn cart rows.
 * The public contact form was already capped (`contactLimiter`); the endpoints
 * that actually cost money were not.
 *
 * KEYING: per authenticated user id, falling back to IP. `core/app.mjs:44` sets
 * `trust proxy = 1`, so `req.ip` is the real client behind Render's proxy — but
 * IP alone would bucket every client training at the same gym (shared NAT) into
 * one quota. Identity is the fairer key on authenticated routes.
 *
 * NOT APPLIED TO: Stripe webhooks. Stripe retries and bursts by design; a
 * throttled webhook is a lost payment credit. Signature verification is the
 * correct control there, and it is already in place.
 *
 * CEILINGS are deliberately generous — a false block on the money path costs
 * far more than the abuse it prevents. These stop loops, not customers.
 * ============================================================================
 */
import rateLimit from 'express-rate-limit';

/** Per-user when authenticated, per-IP otherwise. */
const keyByUserThenIp = (req) => {
  const id = req?.user?.id;
  return id ? `u:${id}` : `ip:${req.ip}`;
};

/**
 * Both `message` and `error` carry the same text, matching the house pattern in
 * `middleware/rateLimiter.mjs` — frontend consumers read one or the other, and a
 * throttled buyer must see a recoverable message, never a generic failure.
 */
const throttleBody = (text) => ({
  success: false,
  error: text,
  message: text,
  retryAfter: '15 minutes',
});

/**
 * Cart mutations (add / update / remove / clear).
 * 120 per 15 min: a shopper adding, re-quantifying and clearing a large cart
 * stays far under; a scripted loop does not. Reads (GET /api/cart) are NOT
 * limited — the cart is re-fetched on many UI events and throttling a read
 * would show a logged-in buyer an empty cart.
 */
export const cartMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  keyGenerator: keyByUserThenIp,
  message: throttleBody('Too many cart updates. Please wait a moment and try again.'),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stripe Checkout Session creation — the expensive one (a real Stripe object per
 * call). 20 per 15 min absorbs genuine retries after a decline, a browser back
 * button, or an expired session being re-created, while killing a mint loop.
 */
export const checkoutSessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: keyByUserThenIp,
  message: throttleBody('Too many checkout attempts. Please wait a few minutes and try again.'),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Post-payment verification polling. The success page polls activation status,
 * so this is higher than checkout creation but still bounded.
 */
export const paymentVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: keyByUserThenIp,
  message: throttleBody('Too many verification requests. Please wait a moment and refresh.'),
  standardHeaders: true,
  legacyHeaders: false,
});

export default { cartMutationLimiter, checkoutSessionLimiter, paymentVerifyLimiter };
