/**
 * Stripe idempotency utilities for SwanStudios payment routes.
 *
 * Stripe idempotency keys must identify one business payment attempt. These
 * helpers keep retry keys stable for duplicate browser submits while allowing
 * a new key when the cart/package/amount or retry window changes.
 */
import { createHash } from 'node:crypto';

export const DEFAULT_IDEMPOTENCY_WINDOW_MS = 60 * 1000;

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value ?? null);
}

function cleanPrefix(prefix) {
  return String(prefix || 'stripe')
    .replace(/[^a-zA-Z0-9:_-]/g, '-')
    .slice(0, 120);
}

export function buildStripeIdempotencyKey(prefix, payload) {
  const digest = createHash('sha256')
    .update(stableSerialize(payload))
    .digest('hex')
    .slice(0, 48);

  return `${cleanPrefix(prefix)}:${digest}`;
}

function normalizeStripeFingerprintNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
}

export function buildCartItemsStripeFingerprint(cartItems = [], getSessionCredits = () => 0) {
  return (cartItems || [])
    .map((item) => [
      String(item?.storefrontItemId ?? ''),
      String(item?.productVariantId ?? ''),
      normalizeStripeFingerprintNumber(item?.quantity || 0),
      normalizeStripeFingerprintNumber(item?.price || 0),
      normalizeStripeFingerprintNumber(getSessionCredits(item)),
    ].join(':'))
    .sort()
    .join('|');
}

export function buildWindowedStripeIdempotencyKey(prefix, payload, options = {}) {
  const windowMs = options.windowMs ?? DEFAULT_IDEMPOTENCY_WINDOW_MS;
  const nowMs = options.nowMs ?? Date.now();
  const retryWindow = Math.floor(nowMs / windowMs);

  return buildStripeIdempotencyKey(prefix, {
    retryWindow,
    payload,
  });
}

export function getStripeRetryWindowStart(options = {}) {
  const windowMs = options.windowMs ?? DEFAULT_IDEMPOTENCY_WINDOW_MS;
  const nowMs = options.nowMs ?? Date.now();
  return Math.floor(nowMs / windowMs) * windowMs;
}
