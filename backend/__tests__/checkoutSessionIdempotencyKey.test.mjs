/**
 * checkoutSessionIdempotencyKey.test.mjs
 * ======================================
 * Guards browser double-submit protection for Stripe Checkout creation.
 * Equivalent cart rows can arrive with DECIMAL prices as strings or numbers;
 * the Stripe idempotency key must not drift just because Sequelize shape did.
 */
import { describe, expect, it } from 'vitest';
import {
  buildCartItemsStripeFingerprint,
  buildStripeIdempotencyKey,
} from '../utils/stripeIdempotency.mjs';

function makeCart(price) {
  return {
    id: 42,
    cartItems: [
      {
        storefrontItemId: 7,
        quantity: '1',
        price,
        storefrontItem: {
          sessions: 10,
        },
      },
    ],
  };
}

describe('checkout session idempotency key', () => {
  it('keeps the same key for equivalent numeric price shapes', () => {
    const buildKey = (cart) => buildStripeIdempotencyKey(
      `checkout:3:${cart.id}`,
      buildCartItemsStripeFingerprint(cart.cartItems, (item) => item.storefrontItem.sessions),
    );
    const stringPriceKey = buildKey(makeCart('165.00'));
    const numberPriceKey = buildKey(makeCart(165));

    expect(stringPriceKey).toBe(numberPriceKey);
  });
});
