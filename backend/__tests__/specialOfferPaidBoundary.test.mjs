/**
 * FILE: specialOfferPaidBoundary.test.mjs
 * PURPOSE: Hostile regression coverage for the locked paid-special boundary.
 * OWNER: Codex
 * SECURITY: Pre-payment drift fails closed; paid snapshots preserve customer fulfillment.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  assertCartSpecialsRedeemable,
  recordCartSpecialRedemptions,
  recordDirectSpecialRedemption,
} from '../services/specialOfferService.mjs';

describe('hostile paid-boundary special invariants', () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };

  it('fails checkout preflight when a marked special has no backing row', async () => {
    await expect(assertCartSpecialsRedeemable({
      cartItems: [{ storefrontItemId: 500, quantity: 1, storefrontItem: { isSpecialOffer: true } }],
      userId: 100,
      CustomPackage: { findAll: vi.fn(async () => []) },
    })).rejects.toMatchObject({ code: 'SPECIAL_NOT_FOUND' });
  });

  it('rejects duplicate special rows before checkout and before paid redemption', async () => {
    const row = {
      id: 7, storefrontItemId: 500, clientId: 100, status: 'active',
      expiresAt: null, remainingRedemptions: 2, validityType: 'n_times',
      update: vi.fn(),
    };
    const items = [
      { storefrontItemId: 500, quantity: 1, storefrontItem: { isSpecialOffer: true } },
      { storefrontItemId: 500, quantity: 1, storefrontItem: { isSpecialOffer: true } },
    ];
    const CustomPackage = { findAll: vi.fn(async () => [row]) };

    await expect(assertCartSpecialsRedeemable({
      cartItems: items, userId: 100, CustomPackage,
    })).rejects.toMatchObject({ code: 'SPECIAL_QUANTITY' });
    await expect(recordCartSpecialRedemptions({
      cartItems: items, userId: 100, CustomPackage, transaction,
    })).rejects.toMatchObject({ code: 'SPECIAL_QUANTITY' });
    expect(row.update).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: 'cancelled', expiresAt: null }, 'cancelled'],
    [{ status: 'active', expiresAt: new Date(Date.now() - 60_000) }, 'expired'],
  ])('honors an already-issued paid checkout after the offer becomes %s', async (overrides) => {
    const applied = {};
    const row = {
      id: 7, storefrontItemId: 500, clientId: 100, status: 'active',
      expiresAt: null, remainingRedemptions: 1, validityType: 'one_time',
      update: vi.fn(async (updates) => Object.assign(applied, updates)),
      ...overrides,
    };
    await expect(recordDirectSpecialRedemption({
      storefrontItemId: 500,
      userId: 100,
      CustomPackage: { findOne: vi.fn(async () => row) },
      transaction,
    })).resolves.toBe(7);
    expect(applied).toEqual({ remainingRedemptions: 0, status: 'redeemed' });
  });
});
