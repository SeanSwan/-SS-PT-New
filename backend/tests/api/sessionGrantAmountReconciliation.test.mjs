import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Money-path safety — charge-vs-cart amount reconciliation (C1, grant side).
 * ============================================================================
 * INVARIANT: sessions may only be granted when what Stripe actually charged
 * covers what the cart's CURRENT rows claim to be worth:
 *
 *   amountTotalCents + discountCents + tolerance >= LIVE rows value (price×qty)
 *
 * Round-2 hardening (2026-09-26): the first version of this check compared
 * against the checkout-time `subtotal` — frozen at checkout creation while
 * the mutation routes keep only `total` in sync — so it could never detect
 * post-checkout growth. The comparison target is now the live rows. Rows
 * without a stored price fall back to the frozen subtotal; neither present
 * skips. Stripe-added tax only makes the charge larger; Stripe-held
 * promotions are credited back via discountCents.
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
  chargeCoversCartValue,
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

// $2,000 package, 40 sessions, 1x — the checkout-time state
function makeCart(cartId, userId, overrides = {}) {
  return {
    id: cartId,
    userId,
    status: 'pending_payment',
    sessionsGranted: false,
    subtotal: 2000,
    cartItems: [
      { quantity: 1, price: 2000, storefrontItem: { itemKind: 'training_package', sessions: 40 } },
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

describe('pure invariant: chargeCoversCartValue', () => {
  it('exact charge covers the live rows', () => {
    const rows = [{ quantity: 1, price: 2000 }];
    expect(chargeCoversCartValue({ amountTotalCents: 200000, cartItems: rows })).toBe(true);
  });

  it('charge above rows value (Stripe tax added on top) covers it', () => {
    const rows = [{ quantity: 1, price: 2000 }];
    expect(chargeCoversCartValue({ amountTotalCents: 217500, cartItems: rows })).toBe(true);
  });

  it('a Stripe-held discount is credited back before comparing', () => {
    const rows = [{ quantity: 1, price: 2000 }];
    expect(chargeCoversCartValue({ amountTotalCents: 100000, discountCents: 100000, cartItems: rows })).toBe(true);
  });

  it('pay-1x-while-rows-claim-Nx is a violation — LIVE rows, not frozen subtotal', () => {
    // Round-2 regression: rows mutated to 10x after checkout priced 1x. The
    // frozen subtotal stays 2000 (mutation routes only update `total`), so a
    // subtotal-based check passed; the live rows value is 20,000 and blocks.
    const mutatedRows = [{ quantity: 10, price: 2000 }];
    expect(chargeCoversCartValue({ amountTotalCents: 200000, cartItems: mutatedRows, subtotal: 2000 })).toBe(false);
  });

  it('multi-line rows sum correctly', () => {
    const rows = [
      { quantity: 2, price: 2000 }, // 4,000
      { quantity: 1, price: 175 },  // 175
    ];
    expect(chargeCoversCartValue({ amountTotalCents: 417500, cartItems: rows })).toBe(true);
    // below the rows value by more than the 1¢ tolerance
    expect(chargeCoversCartValue({ amountTotalCents: 417000, cartItems: rows })).toBe(false);
  });

  it('rows without a stored price fall back to the frozen subtotal', () => {
    const priceless = [{ quantity: 10 }]; // no price → 0 live value
    expect(chargeCoversCartValue({ amountTotalCents: 200000, cartItems: priceless, subtotal: 20000 })).toBe(false);
    expect(chargeCoversCartValue({ amountTotalCents: 200000, cartItems: priceless, subtotal: 2000 })).toBe(true);
  });

  it('skips carts with nothing to reconcile against', () => {
    expect(chargeCoversCartValue({ amountTotalCents: 1, cartItems: [], subtotal: null })).toBe(true);
    expect(chargeCoversCartValue({ amountTotalCents: undefined, cartItems: [{ quantity: 1, price: 2000 }] })).toBe(true);
  });
});

describe('grantSessionsForCart: amount reconciliation gate', () => {
  it('grants normally when the charge covers the live rows', async () => {
    const result = await grantSessionsForCart(1, 100, 'webhook', {
      amountTotalCents: 200000,
      discountCents: 0,
    });
    expect(result.granted).toBe(true);
    expect(result.sessionsAdded).toBe(40);
  });

  it('grants when Stripe tax pushed the charge above the rows value', async () => {
    const result = await grantSessionsForCart(1, 100, 'webhook', {
      amountTotalCents: 217500,
      discountCents: 0,
    });
    expect(result.granted).toBe(true);
  });

  it('WITHHOLDS the grant when the charge cannot cover the CURRENT rows (C1 attack)', async () => {
    // Cart mutated to 10x AFTER a 1x checkout was priced: subtotal stays
    // frozen at 2000 (the round-1 blind spot), rows now worth 20,000.
    mockShoppingCart.findOne.mockResolvedValue(makeCart(1, 100, {
      cartItems: [
        { quantity: 10, price: 2000, storefrontItem: { itemKind: 'training_package', sessions: 40 } },
      ],
    }));
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

  it('does not brick legacy carts whose rows never stored a price', async () => {
    mockShoppingCart.findOne.mockResolvedValue(makeCart(1, 100, {
      cartItems: [
        { quantity: 1, storefrontItem: { itemKind: 'training_package', sessions: 40 } },
      ],
    }));
    const result = await grantSessionsForCart(1, 100, 'webhook', {
      amountTotalCents: 200000, // covers the frozen subtotal
      discountCents: 0,
    });
    expect(result.granted).toBe(true);
  });
});
