import { describe, expect, it } from 'vitest';
import {
  classifyStripeCheckoutSessionError,
  validateCheckoutSessionId,
} from '../../utils/stripeCheckoutSessionErrors.mjs';

describe('stripeCheckoutSessionErrors', () => {
  it('rejects missing and malformed checkout session ids before Stripe lookup', () => {
    expect(validateCheckoutSessionId('')).toEqual(expect.objectContaining({
      ok: false,
      statusCode: 400,
      code: 'SESSION_ID_REQUIRED',
    }));

    expect(validateCheckoutSessionId('pi_test_123')).toEqual(expect.objectContaining({
      ok: false,
      statusCode: 400,
      code: 'INVALID_CHECKOUT_SESSION_ID',
    }));
  });

  it('accepts Stripe test and live checkout session ids', () => {
    expect(validateCheckoutSessionId('cs_test_abc123')).toEqual({
      ok: true,
      sessionId: 'cs_test_abc123',
    });
    expect(validateCheckoutSessionId('cs_live_abc123')).toEqual({
      ok: true,
      sessionId: 'cs_live_abc123',
    });
  });

  it('maps Stripe missing-session errors to an actionable account-mode mismatch response', () => {
    const classified = classifyStripeCheckoutSessionError({
      type: 'StripeInvalidRequestError',
      code: 'resource_missing',
      message: 'No such checkout.session: cs_test_missing',
    });

    expect(classified).toEqual(expect.objectContaining({
      statusCode: 404,
      code: 'CHECKOUT_SESSION_NOT_FOUND',
    }));
    expect(classified.details).toContain('same account and mode');
  });
});
