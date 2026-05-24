/**
 * stripeCheckoutSessionErrors.mjs
 * ===============================
 * Small error classifier for Stripe Checkout Session verification.
 * Keeps customer-facing payment success errors actionable without leaking keys.
 */

const CHECKOUT_SESSION_ID_PATTERN = /^cs_(test|live)_[A-Za-z0-9]+$/;

export function validateCheckoutSessionId(sessionId) {
  const normalized = typeof sessionId === 'string' ? sessionId.trim() : '';

  if (!normalized) {
    return {
      ok: false,
      statusCode: 400,
      code: 'SESSION_ID_REQUIRED',
      message: 'Checkout session ID is required',
    };
  }

  if (!CHECKOUT_SESSION_ID_PATTERN.test(normalized)) {
    return {
      ok: false,
      statusCode: 400,
      code: 'INVALID_CHECKOUT_SESSION_ID',
      message: 'Checkout session ID is invalid',
    };
  }

  return { ok: true, sessionId: normalized };
}

export function classifyStripeCheckoutSessionError(error) {
  const stripeType = error?.type || '';
  const stripeCode = error?.code || '';
  const message = String(error?.message || '');
  const isMissingSession = (
    stripeCode === 'resource_missing' ||
    /No such checkout\.session/i.test(message)
  );

  if (isMissingSession) {
    return {
      statusCode: 404,
      code: 'CHECKOUT_SESSION_NOT_FOUND',
      message: 'Checkout session was not found for this Stripe account or mode',
      details: 'Use Stripe keys from the same account and mode as the checkout session. For sandbox QA, restart the backend with test keys, then create a fresh cs_test checkout session.',
    };
  }

  if (stripeType.startsWith('Stripe')) {
    return {
      statusCode: 502,
      code: stripeCode || 'STRIPE_SESSION_LOOKUP_FAILED',
      message: 'Stripe checkout session lookup failed',
      details: 'Stripe could not verify this checkout session. Confirm the backend Stripe key and checkout session mode match.',
    };
  }

  return {
    statusCode: 500,
    code: 'SESSION_VERIFICATION_FAILED',
    message: 'Failed to verify session',
    details: process.env.NODE_ENV === 'development' ? message : 'Internal server error',
  };
}
