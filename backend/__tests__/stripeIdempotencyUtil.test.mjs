/**
 * Regression tests for Stripe idempotency key helpers.
 *
 * These helpers back browser-triggered payment routes, so their output must be
 * stable for equivalent requests and change when the business attempt changes.
 */
import { describe, expect, it } from 'vitest';
import {
  buildStripeIdempotencyKey,
  buildWindowedStripeIdempotencyKey,
} from '../utils/stripeIdempotency.mjs';

describe('stripe idempotency utilities', () => {
  it('builds the same key for objects with the same data in different key orders', () => {
    const first = buildStripeIdempotencyKey('checkout:user:cart', {
      cartId: 10,
      items: [{ id: 2, quantity: 1 }],
      total: 85,
    });

    const second = buildStripeIdempotencyKey('checkout:user:cart', {
      total: 85,
      items: [{ quantity: 1, id: 2 }],
      cartId: 10,
    });

    expect(first).toBe(second);
  });

  it('changes the key when cart contents change', () => {
    const first = buildStripeIdempotencyKey('checkout:user:cart', {
      items: [{ id: 2, quantity: 1 }],
    });
    const second = buildStripeIdempotencyKey('checkout:user:cart', {
      items: [{ id: 2, quantity: 2 }],
    });

    expect(first).not.toBe(second);
  });

  it('keeps duplicate submits in the same retry window on the same key', () => {
    const payload = { userId: 4, packageId: 'elite', amount: 1400 };

    const first = buildWindowedStripeIdempotencyKey('package', payload, {
      nowMs: 1_000,
      windowMs: 60_000,
    });
    const second = buildWindowedStripeIdempotencyKey('package', payload, {
      nowMs: 30_000,
      windowMs: 60_000,
    });

    expect(first).toBe(second);
  });

  it('allows a new payment attempt after the retry window changes', () => {
    const payload = { userId: 4, packageId: 'elite', amount: 1400 };

    const first = buildWindowedStripeIdempotencyKey('package', payload, {
      nowMs: 1_000,
      windowMs: 60_000,
    });
    const second = buildWindowedStripeIdempotencyKey('package', payload, {
      nowMs: 61_000,
      windowMs: 60_000,
    });

    expect(first).not.toBe(second);
  });

  it('honors zero-valued clock options for deterministic edge tests', () => {
    const payload = { userId: 4, packageId: 'elite', amount: 1400 };

    const first = buildWindowedStripeIdempotencyKey('package', payload, {
      nowMs: 0,
      windowMs: 60_000,
    });
    const second = buildWindowedStripeIdempotencyKey('package', payload, {
      nowMs: 1,
      windowMs: 60_000,
    });

    expect(first).toBe(second);
  });
});
