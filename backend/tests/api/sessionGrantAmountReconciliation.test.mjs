import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Money-path safety — charge-vs-cart amount reconciliation (C1, grant side).
 * ============================================================================
 * INVARIANT: sessions may only be granted when what Stripe actually charged
 * covers what the cart claims. amount_total (minus Stripe-held discounts) must
 * be >= the cart's stored checkout-time subtotal; Stripe-added tax only makes
 * the charge LARGER, so the one-directional check is safe for tax and coupons:
 *
 *   amountTotalCents + discountCents + tolerance >= round(subtotal * 100)
 *
 * A violation means the cart rows changed after the checkout was priced
 * (the pay-1x-grant-Nx attack) — the grant must be WITHHELD (no increment, no
 * completion), surfaced as { blocked: 'amount_mismatch' }, and left for
 * manual reconciliation. Callers WITHOUT a Stripe session (admin-manual
 * grants, reconciliation script) pass no expectedCharge and are untouched;
 * legacy carts without a stored subtotal are skipped, not bricked.
 *
 * Behavioral harness copied from sessionGrantService.test.mjs (mocked
 * sequelize model layer; no DB).
 */
const { mockTransaction, mockShoppingCart, mockUserModel } = vi.hoisted(() => {
  const mockTransaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn().mockResolvedValue(true),
    rollback: vi.fn().mockResolvedValue(true),
  };
  const mockShoppingCart = { findOne: vi.fn() };
  const mockUserModel = { findByPk: vi.fn() };
  return { mockTransaction, mockShoppingCart, mockUserModel };
});

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn().mockResolvedValue(mockTransaction),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getShoppingCart: () => mockShoppingCart,
  getCartItem: () => ({}),
  getStorefrontItem: () => ({}),
  getUser: () => mockUserModel,
}));

import {
  grantSessionsForCart,
  chargeCoversCartSubtotal,
} from '../../services/SessionGrantService.mjs';

// ── Helpers ──────────────────────────────────────────────────
function makeUser(id, sessions = 0, overrides = {}) {
  return {
    id,
    availableSessions: sessions,
    role: 'client',
    clientSource: 'swanstudios',
    update: vi.fn().mockResolvedValue(true),
    increment: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeCart(cartId, userId, overrides = {}) {
  return {
    id: cartId,
    userId,
    status: 'pending_payment',
    sessionsGranted: false,
    subtotal: 2000, // $2,000.00 — checkout-time subtotal persisted by v2 checkout
    cartItems: [
      {
        quantity: 1,
        storefrontItem: { itemKind: 'training_package', sessions: 40 },
      },
    ],
    update: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTransaction.commit.mockResolvedValue(true);
  mockTransaction.rollback.mockResolvedValue(true);
  const user = makeUser(100, 0);
  const cart = makeCart(1, 100);
  mockShoppingCart.findOne.mockResolvedValue(cart);
  mockUserModel.findByPk.mockResolvedValue(user);
});

describe('pure invariant: chargeCoversCartSubtotal', () => {
  it('exact charge covers the subtotal', () => {
    expect(chargeCoversCartSubtotal({ amountTotalCents: 200000, subtotal: 2000 })).toBe(true);
  });

  it('charge above subtotal (Stripe tax added on top) covers it', () => {
    expect(chargeCoversCartSubtotal({ amountTotalCents: 217500, subtotal: 2000 })).toBe(true);
  });

  it('a Stripe-held discount is credited back before comparing', () => {
    expect(
      chargeCoversCartSubtotal({ amountTotalCents: 100000, discountCents: 100000, subtotal: 2000 })
    ).toBe(true);
  });

  it('pay-1x-while-cart-claims-Nx is a violation', () => {
    // Cart mutated to 10x ($20,000) after a 1x ($2,000) checkout was priced.
    expect(
      chargeCoversCartSubtotal({ amountTotalCents: 200000, subtotal: 20000 })
    ).toBe(false);
  });

  it('skips legacy carts without a stored subtotal', () => {
    expect(chargeCoversCartSubtotal({ amountTotalCents: 1, subtotal: null })).toBe(true);
    expect(chargeCoversCartSubtotal({ amountTotalCents: 1, subtotal: undefined })).toBe(true);
    expect(chargeCoversCartSubtotal({ amountTotalCents: 1, subtotal: 0 })).toBe(true);
  });

  it('skips callers without a Stripe charge', () => {
    expect(chargeCoversCartSubtotal({ amountTotalCents: undefined, subtotal: 2000 })).toBe(true);
  });
});

describe('grantSessionsForCart: amount reconciliation gate', () => {
  it('grants normally when the charge covers the cart subtotal', async () => {
    const result = await grantSessionsForCart(1, 100, 'webhook', {
      amountTotalCents: 200000,
      discountCents: 0,
    });
    expect(result.granted).toBe(true);
    expect(result.sessionsAdded).toBe(40);
  });

  it('grants when Stripe tax pushed the charge above the subtotal', async () => {
    const result = await grantSessionsForCart(1, 100, 'webhook', {
      amountTotalCents: 217500,
      discountCents: 0,
    });
    expect(result.granted).toBe(true);
  });

  it('WITHHOLDS the grant when the charge cannot cover the current cart rows', async () => {
    // Simulates the C1 attack: cart rows mutated to 10x AFTER checkout priced 1x.
    mockShoppingCart.findOne.mockResolvedValue(makeCart(1, 100, { subtotal: 20000 }));
    const user = makeUser(100, 0);
    mockUserModel.findByPk.mockResolvedValue(user);

    const result = await grantSessionsForCart(1, 100, 'webhook', {
      amountTotalCents: 200000,
      discountCents: 0,
    });

    expect(result.granted).toBe(false);
    expect(result.blocked).toBe('amount_mismatch');
    expect(result.sessionsAdded).toBe(0);
    expect(user.increment).not.toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it('stays idempotent-compatible: callers without a charge still grant', async () => {
    const result = await grantSessionsForCart(1, 100, 'verify-session');
    expect(result.granted).toBe(true);
  });

  it('does not brick legacy carts that never stored a subtotal', async () => {
    mockShoppingCart.findOne.mockResolvedValue(makeCart(1, 100, { subtotal: undefined }));
    const result = await grantSessionsForCart(1, 100, 'webhook', {
      amountTotalCents: 100, // absurdly low, but there is nothing to reconcile against
      discountCents: 0,
    });
    expect(result.granted).toBe(true);
  });
});
