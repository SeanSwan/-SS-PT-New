import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const cartRoutes = readSource('routes/cartRoutes.mjs');

const sliceBetween = (source, start, end) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
};

describe('legacy cart checkout gate', () => {
  it('keeps POST /api/cart/checkout mounted but fail-closed before Stripe', () => {
    const route = sliceBetween(
      cartRoutes,
      "router.post('/checkout'",
      "router.post('/webhook'"
    );

    expect(route).toContain('LEGACY_CART_CHECKOUT_DISABLED_CODE');
    expect(route).toContain('res.status(410).json');
    expect(route).toContain('/api/v2/payments/create-checkout-session');
    expect(route).not.toContain('stripeClient.checkout.sessions.create');
    expect(route).not.toContain('const sessionOptions =');
  });
});
