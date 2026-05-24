/**
 * stripeEnvironmentSafety.mjs
 * ===========================
 * Local safety checks for Stripe key mode. This prevents development
 * checkouts from accidentally creating live-mode payment sessions.
 */

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function getStripeSecretKeyMode(secretKey = '') {
  if (typeof secretKey !== 'string') {
    return 'missing';
  }

  const trimmed = secretKey.trim();
  if (!trimmed) {
    return 'missing';
  }

  if (/^[sr]k_live_/.test(trimmed)) {
    return 'live';
  }

  if (/^[sr]k_test_/.test(trimmed)) {
    return 'test';
  }

  return 'unknown';
}

export function isTruthyEnvFlag(value) {
  return TRUE_VALUES.has(String(value || '').trim().toLowerCase());
}

export function shouldBlockLiveStripeInLocal({
  secretKey = process.env.STRIPE_SECRET_KEY,
  nodeEnv = process.env.NODE_ENV,
  allowLiveLocal = process.env.SWAN_ALLOW_LIVE_STRIPE_LOCAL,
} = {}) {
  const keyMode = getStripeSecretKeyMode(secretKey);
  const isProduction = nodeEnv === 'production';

  return keyMode === 'live' && !isProduction && !isTruthyEnvFlag(allowLiveLocal);
}

export function getLiveStripeLocalBlockDetails() {
  return 'Live Stripe checkout is blocked in local development. Use sk_test_/pk_test_ sandbox keys, restart npm run dev, and create a fresh checkout session. To intentionally test live mode locally, set SWAN_ALLOW_LIVE_STRIPE_LOCAL=true before starting the backend.';
}
