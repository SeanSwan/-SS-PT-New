import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { diagnosticFromUnknownError, toCheckoutDiagnostic } from './checkoutDiagnostics';

const checkoutSource = readFileSync(resolve(__dirname, './CheckoutView.tsx'), 'utf8');

describe('checkout diagnostics privacy contract', () => {
  it('does not log raw transport, response, request, or customer objects', () => {
    expect(checkoutSource).not.toContain("logger.error('[Checkout] Failed:', error)");
    expect(checkoutSource).not.toContain("logger.error('[Checkout] Error response:', error.response)");
    expect(checkoutSource).not.toContain("logger.error('[Checkout] Error data:', error.response?.data)");
    expect(checkoutSource).not.toContain("logger.log('[Checkout] User ID:', user.id)");
    expect(checkoutSource).not.toContain("logger.log('[Checkout] Cart ID:', cart.id)");
  });

  it('keeps synthetic Axios and customer sentinels out of allowlisted metadata', () => {
    const sentinel = 'SYNTHETIC_SECRET_CUSTOMER_TOKEN';
    const diagnostic = diagnosticFromUnknownError('create_session', {
      message: sentinel,
      response: { status: 503, data: { customerEmail: sentinel, token: sentinel } },
      request: { headers: { authorization: sentinel } },
    });
    const serialized = JSON.stringify(diagnostic);

    expect(serialized).not.toContain(sentinel);
    expect(diagnostic).toEqual({
      operation: 'create_session',
      status: 'failed',
      code: 'HTTP',
      httpStatus: 503,
      retryable: true,
    });
    expect(toCheckoutDiagnostic({ operation: 'health', status: 'succeeded', itemCount: -1, totalCents: Number.NaN })).toEqual({
      operation: 'health',
      status: 'succeeded',
    });
  });
});
