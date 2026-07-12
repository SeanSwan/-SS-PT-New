import { describe, expect, it, vi } from 'vitest';
import {
  STICKER_PER_SESSION,
  computeSpecialPricing,
  computeBonusForTargetRate,
  evaluateRateGate,
  assertRateFloor,
  resolveRedemptionLimit,
  createHiddenStorefrontItemForPackage,
  assertClientOwnsActiveSpecial,
  recordSpecialRedemption,
  assertCartSpecialsRedeemable,
  recordCartSpecialRedemptions,
  assertValidityRules,
  SpecialOfferError,
} from '../services/specialOfferService.mjs';

describe('computeSpecialPricing', () => {
  it('keeps the $175 sticker and derives total/effective from paid+bonus', () => {
    const r = computeSpecialPricing({ paidSessions: 10, bonusSessions: 12 });
    expect(r.pricePerSession).toBe(175);
    expect(r.totalSessions).toBe(22);
    expect(r.totalPrice).toBe(1750);           // 10 * 175 — paid only
    expect(r.effectiveHourlyRate).toBe(79.55); // 1750 / 22
  });

  it('with zero bonus, effective rate equals the sticker', () => {
    const r = computeSpecialPricing({ paidSessions: 10, bonusSessions: 0 });
    expect(r.effectiveHourlyRate).toBe(175);
    expect(r.totalSessions).toBe(10);
  });

  it('rejects invalid paid/bonus', () => {
    expect(() => computeSpecialPricing({ paidSessions: 0 })).toThrow(SpecialOfferError);
    expect(() => computeSpecialPricing({ paidSessions: 10, bonusSessions: -1 })).toThrow(SpecialOfferError);
    expect(() => computeSpecialPricing({ paidSessions: 2.5 })).toThrow(SpecialOfferError);
  });
});

describe('computeBonusForTargetRate (admin "type effective $/session")', () => {
  it('computes whole bonus sessions to approach an $80 target on a 10-pack', () => {
    const r = computeBonusForTargetRate({ paidSessions: 10, targetEffectiveRate: 80 });
    expect(r.bonusSessions).toBe(12);
    expect(r.effectiveHourlyRate).toBeGreaterThanOrEqual(79);
    expect(r.effectiveHourlyRate).toBeLessThan(80.5);
    expect(r.pricePerSession).toBe(175);
  });

  it('a $175 target yields zero bonus', () => {
    const r = computeBonusForTargetRate({ paidSessions: 10, targetEffectiveRate: 175 });
    expect(r.bonusSessions).toBe(0);
    expect(r.effectiveHourlyRate).toBe(175);
  });

  it('never produces negative bonus when the target exceeds the sticker', () => {
    const r = computeBonusForTargetRate({ paidSessions: 10, targetEffectiveRate: 250 });
    expect(r.bonusSessions).toBe(0);
  });

  it("honors Sean's deepest real deal ($60 effective on a large package)", () => {
    // 208-session 12-month package at $60 effective — must pass, well under the ceiling.
    const r = computeBonusForTargetRate({ paidSessions: 208, targetEffectiveRate: 60 });
    expect(r.totalSessions).toBeLessThan(700);
    expect(r.effectiveHourlyRate).toBeLessThanOrEqual(61);
  });

  it('THROWS on a fat-finger rate that would mint an implausible session count', () => {
    // $1 instead of $100 on the 12-month package => round(36400/1) = 36,400 sessions.
    // Data-integrity ceiling must reject it rather than silently create a ~$6.4M grant.
    expect(() => computeBonusForTargetRate({ paidSessions: 208, targetEffectiveRate: 1 }))
      .toThrowError(/TOTAL_SESSIONS_TOO_HIGH|exceeds the .* data-integrity ceiling/);
  });
});

describe('evaluateRateGate + assertRateFloor (informational only — no floor, admin is final decider)', () => {
  it('classifies rates into informational tiers, never blocking', () => {
    expect(evaluateRateGate(130)).toMatchObject({ tier: 'standard', requiresOverride: false, requiresReason: false, hardBlocked: false });
    expect(evaluateRateGate(110)).toMatchObject({ tier: 'discounted', requiresOverride: false, requiresReason: false, hardBlocked: false });
    expect(evaluateRateGate(80)).toMatchObject({ tier: 'deep_deal', requiresOverride: false, requiresReason: false, hardBlocked: false });
    expect(evaluateRateGate(60)).toMatchObject({ tier: 'deep_deal', hardBlocked: false });
    expect(evaluateRateGate(45)).toMatchObject({ tier: 'custom_deal', hardBlocked: false });
  });

  it('assertRateFloor NEVER blocks a positive rate — any price the admin picks saves', () => {
    // No override, no reason needed at ANY positive rate (Sean 2026-07-08).
    expect(assertRateFloor({ effectiveHourlyRate: 130 })).toMatchObject({ tier: 'standard' });
    expect(assertRateFloor({ effectiveHourlyRate: 80 })).toMatchObject({ tier: 'deep_deal' });
    expect(assertRateFloor({ effectiveHourlyRate: 60 })).toMatchObject({ tier: 'deep_deal' });
    expect(assertRateFloor({ effectiveHourlyRate: 45 })).toMatchObject({ tier: 'custom_deal' });
    expect(assertRateFloor({ effectiveHourlyRate: 20 })).toMatchObject({ tier: 'custom_deal' });
  });

  it('only a non-positive rate (typo) is rejected as invalid data', () => {
    expect(() => assertRateFloor({ effectiveHourlyRate: 0 })).toThrow(SpecialOfferError);
    expect(() => assertRateFloor({ effectiveHourlyRate: -5 })).toThrow(/greater than \$0/i);
    expect(evaluateRateGate(0).hardBlocked).toBe(true);
    let err;
    try { assertRateFloor({ effectiveHourlyRate: 0 }); } catch (e) { err = e; }
    expect(err.code).toBe('INVALID_RATE');
  });
});

describe('resolveRedemptionLimit', () => {
  it('maps validity types to starting limits', () => {
    expect(resolveRedemptionLimit('one_time')).toBe(1);
    expect(resolveRedemptionLimit('n_times', 3)).toBe(3);
    expect(resolveRedemptionLimit('time_window')).toBeNull();
    expect(resolveRedemptionLimit('ongoing')).toBeNull();
  });
  it('rejects n_times < 2 and unknown types', () => {
    expect(() => resolveRedemptionLimit('n_times', 1)).toThrow(SpecialOfferError);
    expect(() => resolveRedemptionLimit('bogus')).toThrow(SpecialOfferError);
  });
});

describe('createHiddenStorefrontItemForPackage (sessions=total representation)', () => {
  it('backs the special with a hidden item whose sessions == total, at the $175 sticker', async () => {
    let captured = null;
    const StorefrontItem = { create: vi.fn(async (args) => { captured = args; return { id: 42, ...args }; }) };
    const pkg = { name: 'SwanStudios Special', description: null, paidSessions: 10, bonusSessions: 12, totalSessions: 22, totalPrice: 1750 };

    const item = await createHiddenStorefrontItemForPackage(pkg, { StorefrontItem });

    expect(item.id).toBe(42);
    expect(captured.isSpecialOffer).toBe(true);
    expect(captured.packageType).toBe('custom');
    expect(captured.itemKind).toBe('training_package');
    // the whole point: grant credits sessions||totalSessions -> full 22 granted
    expect(captured.sessions).toBe(22);
    expect(captured.totalSessions).toBe(22);
    // sticker preserved on the item; discount lives in the bonus session count
    expect(captured.pricePerSession).toBe(STICKER_PER_SESSION);
    expect(captured.price).toBe(1750);
    expect(captured.totalCost).toBe(1750);
  });

  it('requires the StorefrontItem model', async () => {
    await expect(createHiddenStorefrontItemForPackage({}, {})).rejects.toThrow(/StorefrontItem model/);
  });
});

describe('assertClientOwnsActiveSpecial (IDOR + validity guard)', () => {
  const base = { clientId: 100, status: 'active', expiresAt: null, remainingRedemptions: 1 };

  it('allows the owning client on an active, unexpired, redeemable special', () => {
    expect(assertClientOwnsActiveSpecial({ customPackage: { ...base }, userId: 100 })).toBe(true);
  });

  it('DENIES another client (IDOR) with 403 NOT_OWNER', () => {
    let err;
    try { assertClientOwnsActiveSpecial({ customPackage: { ...base }, userId: 999 }); } catch (e) { err = e; }
    expect(err.code).toBe('NOT_OWNER');
    expect(err.status).toBe(403);
  });

  it('DENIES a missing special with 404', () => {
    let err;
    try { assertClientOwnsActiveSpecial({ customPackage: null, userId: 100 }); } catch (e) { err = e; }
    expect(err.status).toBe(404);
  });

  it('DENIES an expired special with 410', () => {
    const past = new Date(Date.parse('2020-01-01T00:00:00Z'));
    let err;
    try { assertClientOwnsActiveSpecial({ customPackage: { ...base, expiresAt: past }, userId: 100 }); } catch (e) { err = e; }
    expect(err.code).toBe('EXPIRED');
    expect(err.status).toBe(410);
  });

  it('DENIES a spent special (redemption limit) with 409', () => {
    let err;
    try { assertClientOwnsActiveSpecial({ customPackage: { ...base, remainingRedemptions: 0 }, userId: 100 }); } catch (e) { err = e; }
    expect(err.code).toBe('NO_REDEMPTIONS_LEFT');
    expect(err.status).toBe(409);
  });

  it('DENIES a non-active (redeemed/cancelled) special with 409', () => {
    let err;
    try { assertClientOwnsActiveSpecial({ customPackage: { ...base, status: 'redeemed' }, userId: 100 }); } catch (e) { err = e; }
    expect(err.code).toBe('NOT_ACTIVE');
  });

  it('treats null remainingRedemptions (ongoing/time_window) as unlimited', () => {
    expect(assertClientOwnsActiveSpecial({ customPackage: { ...base, remainingRedemptions: null }, userId: 100 })).toBe(true);
  });
});

describe('recordSpecialRedemption', () => {
  const stub = (fields) => {
    const applied = {};
    return { obj: { ...fields, update: vi.fn(async (u) => Object.assign(applied, u)) }, applied };
  };

  it('decrements remaining and marks redeemed when exhausted', async () => {
    const three = stub({ remainingRedemptions: 3, validityType: 'n_times' });
    await recordSpecialRedemption(three.obj);
    expect(three.applied).toEqual({ remainingRedemptions: 2 });

    const last = stub({ remainingRedemptions: 1, validityType: 'n_times' });
    await recordSpecialRedemption(last.obj);
    expect(last.applied).toEqual({ remainingRedemptions: 0, status: 'redeemed' });
  });

  it('rejects an already-exhausted special instead of silently recording another purchase', async () => {
    const spent = stub({ remainingRedemptions: 0, validityType: 'one_time', status: 'redeemed' });
    await expect(recordSpecialRedemption(spent.obj)).rejects.toMatchObject({ code: 'NO_REDEMPTIONS_LEFT' });
    expect(spent.obj.update).not.toHaveBeenCalled();
  });

  it('marks a one_time special redeemed', async () => {
    const one = stub({ remainingRedemptions: null, validityType: 'one_time' });
    await recordSpecialRedemption(one.obj);
    expect(one.applied).toEqual({ status: 'redeemed' });
  });

  it('leaves an ongoing special untouched', async () => {
    const ongoing = stub({ remainingRedemptions: null, validityType: 'ongoing' });
    await recordSpecialRedemption(ongoing.obj);
    expect(ongoing.obj.update).not.toHaveBeenCalled();
  });
});

describe('assertCartSpecialsRedeemable (cart-level guard used at add-to-cart + checkout)', () => {
  const specialRow = (over = {}) => ({
    id: 7, storefrontItemId: 500, clientId: 100, status: 'active',
    expiresAt: null, remainingRedemptions: 1, validityType: 'one_time', ...over,
  });
  const CP = (rows) => ({ findAll: vi.fn(async () => rows) });

  it('is a no-op for a cart containing no specials', async () => {
    const ok = await assertCartSpecialsRedeemable({
      cartItems: [{ storefrontItemId: 1, quantity: 1 }], userId: 100, CustomPackage: CP([]),
    });
    expect(ok).toBe(true);
  });

  it('allows the owning client on a valid special', async () => {
    const ok = await assertCartSpecialsRedeemable({
      cartItems: [{ storefrontItemId: 500, quantity: 1 }], userId: 100, CustomPackage: CP([specialRow()]),
    });
    expect(ok).toBe(true);
  });

  it('DENIES another client (IDOR) at the cart level', async () => {
    let err;
    try {
      await assertCartSpecialsRedeemable({
        cartItems: [{ storefrontItemId: 500, quantity: 1 }], userId: 999, CustomPackage: CP([specialRow()]),
      });
    } catch (e) { err = e; }
    expect(err.code).toBe('NOT_OWNER');
    expect(err.status).toBe(403);
  });

  it('DENIES quantity > 1 on a special', async () => {
    let err;
    try {
      await assertCartSpecialsRedeemable({
        cartItems: [{ storefrontItemId: 500, quantity: 2 }], userId: 100, CustomPackage: CP([specialRow()]),
      });
    } catch (e) { err = e; }
    expect(err.code).toBe('SPECIAL_QUANTITY');
  });
});

describe('recordCartSpecialRedemptions (called inside the grant transaction)', () => {
  it('records a redemption for each special in the purchased cart', async () => {
    const applied = {};
    const row = {
      id: 7, storefrontItemId: 500, clientId: 100, status: 'active', expiresAt: null, remainingRedemptions: 2, validityType: 'n_times',
      update: vi.fn(async (u) => Object.assign(applied, u)),
    };
    const CustomPackage = { findAll: vi.fn(async () => [row]) };
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const recorded = await recordCartSpecialRedemptions({
      cartItems: [{ storefrontItemId: 500, quantity: 1, storefrontItem: { isSpecialOffer: true } }],
      userId: 100,
      CustomPackage,
      transaction,
    });
    expect(recorded).toEqual([7]);
    expect(applied).toEqual({ remainingRedemptions: 1 });
    expect(CustomPackage.findAll).toHaveBeenCalledWith(expect.objectContaining({
      transaction,
      lock: 'UPDATE',
    }));
  });

  it('fails closed when a marked special has no linked CustomPackage row', async () => {
    const CustomPackage = { findAll: vi.fn(async () => []) };
    await expect(recordCartSpecialRedemptions({
      cartItems: [{ storefrontItemId: 500, quantity: 1, storefrontItem: { isSpecialOffer: true } }],
      userId: 100,
      CustomPackage,
      transaction: { LOCK: { UPDATE: 'UPDATE' } },
    })).rejects.toMatchObject({ code: 'SPECIAL_NOT_FOUND' });
  });

  it('rechecks ownership and quantity inside the paid grant transaction', async () => {
    const row = {
      id: 7, storefrontItemId: 500, clientId: 100, status: 'active', expiresAt: null, remainingRedemptions: 1, validityType: 'one_time',
      update: vi.fn(),
    };
    const CustomPackage = { findAll: vi.fn(async () => [row]) };
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };

    await expect(recordCartSpecialRedemptions({
      cartItems: [{ storefrontItemId: 500, quantity: 1, storefrontItem: { isSpecialOffer: true } }],
      userId: 999,
      CustomPackage,
      transaction,
    })).rejects.toMatchObject({ code: 'NOT_OWNER' });

    await expect(recordCartSpecialRedemptions({
      cartItems: [{ storefrontItemId: 500, quantity: 2, storefrontItem: { isSpecialOffer: true } }],
      userId: 100,
      CustomPackage,
      transaction,
    })).rejects.toMatchObject({ code: 'SPECIAL_QUANTITY' });
    expect(row.update).not.toHaveBeenCalled();
  });
});

describe('assertValidityRules (MED-1: time_window must carry an expiry)', () => {
  it('rejects time_window without expiresAt', () => {
    let err;
    try { assertValidityRules({ validityType: 'time_window', expiresAt: null }); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(SpecialOfferError);
    expect(err.code).toBe('EXPIRY_REQUIRED');
    expect(err.status).toBe(400);
  });

  it('allows time_window with an expiresAt', () => {
    expect(assertValidityRules({ validityType: 'time_window', expiresAt: '2026-12-31' })).toBe(true);
  });

  it('is a no-op for one_time / n_times / ongoing', () => {
    expect(assertValidityRules({ validityType: 'one_time' })).toBe(true);
    expect(assertValidityRules({ validityType: 'n_times' })).toBe(true);
    expect(assertValidityRules({ validityType: 'ongoing' })).toBe(true);
  });
});
