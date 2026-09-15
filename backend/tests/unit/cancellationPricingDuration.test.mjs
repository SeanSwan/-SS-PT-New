/**
 * getClientPackagePricing — duration-aware refusal (SWA-212 headline)
 * ===================================================================
 * SwanStudios sells two rates: $175/60-min and $110/30-min. `getClientPackagePricing`
 * derived ONE `pricePerSession` from the client's packages while knowing nothing about
 * the duration of the session being priced, so it was wrong by $65 in either direction:
 *
 *   - a $110/30-min client cancelling a 60-MINUTE session  -> derived 110, under by $65
 *   - a $175/60-min client cancelling a 30-MINUTE session  -> derived 175, over  by $65
 *
 * The ambiguity guard could not catch either: it only fires when the client holds
 * packages at DIFFERENT rates. A client with one package has no rate ambiguity — the
 * mismatch is between the package's duration and the SESSION's duration.
 *
 * Duration-aware SELECTION remains unimplementable (StorefrontItem records no duration —
 * schema gap, not a parameter gap). What IS implementable is duration-aware REFUSAL.
 * Two independent signals, either of which is enough to refuse:
 *
 *   1. the package NAME states a duration ('30-Minute Assessment Pack') that disagrees
 *      with the session's duration
 *   2. the derived rate is exactly the canonical rate of the OTHER duration band
 *      ('Single Session' at $175 is the 60-min rate; the session is 30 minutes)
 *
 * Signal 2 matters because production's 60-minute package is named 'Single Session' —
 * it does not carry '60' anywhere, so name parsing alone catches only one direction.
 *
 * THE SAFETY PROPERTY, asserted at the bottom: no path returns a NEW non-fallback rate.
 * A derived number is either exactly what it was before, or it becomes a refusal — so this
 * cannot introduce a new wrong CHARGE, and both callers degrade correctly on isFallback (the
 * service declines to suggest and logs UNVERIFIED; the client panel renders 'See cancellation
 * policy' instead of a number).
 *
 * The FALLBACK figure does change, deliberately: it now matches the session's duration instead
 * of always being $175. That is asserted separately below rather than hidden inside the
 * property, because computeCancellationCharge consumes it without checking isFallback.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

const { getClientPackagePricing, expectedRateForDuration } = await import(
  '../../utils/cancellationPricing.mjs'
);

const item = (overrides) => ({
  id: 1,
  name: 'Package',
  price: '1750.00',
  sessions: 10,
  packageType: 'fixed',
  isActive: true,
  ...overrides
});

const modelsReturning = (storefrontItems) => ({
  Order: {
    findAll: vi.fn().mockResolvedValue([
      { orderItems: storefrontItems.map((storefrontItem) => ({ storefrontItem })) }
    ])
  },
  OrderItem: {},
  StorefrontItem: {}
});

// The two REAL production packages, verbatim from seeders/20260407-seed-storefront-packages.mjs.
// Fixture names that conveniently encode duration ('Signature 60 10-Pack') do not exist in
// production and must not be what this fix is validated against.
const SINGLE_SESSION = item({ id: 1, name: 'Single Session', price: '175.00', sessions: 1 });
const THIRTY_MIN_PACK = item({ id: 5, name: '30-Minute Assessment Pack', price: '1100.00', sessions: 10 });

describe('duration-aware refusal — the $65 defect, both directions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('REFUSES when a 30-minute package is asked to price a 60-minute session (was: under by $65)', async () => {
    const result = await getClientPackagePricing(301, modelsReturning([THIRTY_MIN_PACK]), {
      durationMinutes: 60
    });

    expect(result.isFallback).toBe(true);
    expect(result.requiresAdminReview).toBe(true);
    expect(result.packageName).toMatch(/duration/i);
  });

  it('REFUSES when a 60-minute package is asked to price a 30-minute session (was: over by $65)', async () => {
    // 'Single Session' carries no '60' in its name — caught by the canonical-rate signal.
    const result = await getClientPackagePricing(301, modelsReturning([SINGLE_SESSION]), {
      durationMinutes: 30
    });

    expect(result.isFallback).toBe(true);
    expect(result.requiresAdminReview).toBe(true);
  });

  it('resolves normally when package and session durations agree (60/60)', async () => {
    const result = await getClientPackagePricing(301, modelsReturning([SINGLE_SESSION]), {
      durationMinutes: 60
    });

    expect(result.isFallback).toBe(false);
    expect(result.pricePerSession).toBe(175);
  });

  it('resolves normally when package and session durations agree (30/30)', async () => {
    const result = await getClientPackagePricing(301, modelsReturning([THIRTY_MIN_PACK]), {
      durationMinutes: 30
    });

    expect(result.isFallback).toBe(false);
    expect(result.pricePerSession).toBe(110);
  });

  it('does NOT over-refuse a discounted package whose rate matches neither canonical band', async () => {
    // $130/session for a 60-min package is a legitimate discount, not a duration mismatch.
    const result = await getClientPackagePricing(
      301,
      modelsReturning([item({ id: 9, name: 'Loyalty 10-Pack', price: '1300.00', sessions: 10 })]),
      { durationMinutes: 60 }
    );

    expect(result.isFallback).toBe(false);
    expect(result.pricePerSession).toBe(130);
  });

  it('falls back at the rate matching the SESSION duration, not always $175', async () => {
    // A client with no completed order cancelling a 30-min session was told $175.
    const result = await getClientPackagePricing(301, modelsReturning([]), { durationMinutes: 30 });

    expect(result.isFallback).toBe(true);
    expect(result.pricePerSession).toBe(110);
  });
});

describe('backward compatibility — no durationMinutes means no behaviour change', () => {
  beforeEach(() => vi.clearAllMocks());

  it('behaves exactly as before when the caller passes no duration', async () => {
    // The two legacy callers in sessionRoutes.mjs never pass one. That file is NOT dead:
    // its direct mount was removed but routes/api.mjs:25 still serves it (core/routes.mjs:322).
    // Leaving them on this path is the deliberate no-regression choice, not an oversight.
    for (const pkg of [SINGLE_SESSION, THIRTY_MIN_PACK]) {
      const result = await getClientPackagePricing(301, modelsReturning([pkg]));
      expect(result.isFallback).toBe(false);
    }
  });

  it('ignores a malformed or absent duration rather than refusing on it', async () => {
    for (const durationMinutes of [null, undefined, 0, -5, NaN, 'sixty', {}]) {
      const result = await getClientPackagePricing(301, modelsReturning([SINGLE_SESSION]), {
        durationMinutes
      });
      expect(result.isFallback).toBe(false);
      expect(result.pricePerSession).toBe(175);
    }
  });
});

describe('expectedRateForDuration — one source for a policy number that had copies', () => {
  it('maps the two bands the business actually sells', () => {
    expect(expectedRateForDuration(60)).toBe(175);
    expect(expectedRateForDuration(90)).toBe(175);
    expect(expectedRateForDuration(30)).toBe(110);
    expect(expectedRateForDuration(45)).toBe(110);
  });

  it('treats an unknown duration as the 60-minute default, matching prior behaviour', () => {
    for (const bad of [null, undefined, 0, NaN, 'x']) expect(expectedRateForDuration(bad)).toBe(175);
  });
});

describe('the FALLBACK number is now duration-aware — a deliberate money-path change', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is consumed even when isFallback is true, so this change is real and intended', async () => {
    // computeCancellationCharge reads `packageInfo.pricePerSession || FALLBACK` WITHOUT checking
    // isFallback, and sessionCancellationReviewService calls it on the live path. So the fallback
    // figure is not inert - lowering it from 175 to 110 for a short session changes a computed
    // charge. That is the correction, not a side effect: routes/sessions.mjs already computed a
    // duration-aware `fallbackPrice` and then DISCARDED it, because `pricePerSession ?? fallbackPrice`
    // preferred the helper's duration-blind 175. The two now agree.
    const thirty = await getClientPackagePricing(301, modelsReturning([]), { durationMinutes: 30 });
    const sixty = await getClientPackagePricing(301, modelsReturning([]), { durationMinutes: 60 });
    const blind = await getClientPackagePricing(301, modelsReturning([]));

    expect(thirty.pricePerSession).toBe(110);
    expect(sixty.pricePerSession).toBe(175);
    expect(blind.pricePerSession).toBe(175); // unchanged for callers that pass no duration
  });

  it('applies the duration-aware fallback on the refusal path too', async () => {
    const result = await getClientPackagePricing(301, modelsReturning([SINGLE_SESSION]), {
      durationMinutes: 30
    });
    expect(result.isFallback).toBe(true);
    expect(result.pricePerSession).toBe(110);
  });
});

describe('SAFETY PROPERTY: monotonically more conservative', () => {
  beforeEach(() => vi.clearAllMocks());

  it('never returns a non-fallback rate that differs from the no-duration result', async () => {
    // For every package/duration pair, the derived number must either be IDENTICAL to what
    // the duration-blind call returns, or be marked isFallback. A new non-fallback number
    // would be a new way to be wrong — exactly what this workstream keeps producing.
    const packages = [
      SINGLE_SESSION,
      THIRTY_MIN_PACK,
      item({ id: 9, name: 'Loyalty 10-Pack', price: '1300.00', sessions: 10 }),
      item({ id: 10, name: '45-Minute Focus Pack', price: '900.00', sessions: 10 })
    ];

    for (const pkg of packages) {
      const blind = await getClientPackagePricing(301, modelsReturning([pkg]));
      for (const durationMinutes of [30, 45, 60, 90]) {
        const aware = await getClientPackagePricing(301, modelsReturning([pkg]), { durationMinutes });
        if (!aware.isFallback) {
          expect(aware.pricePerSession).toBe(blind.pricePerSession);
        }
      }
    }
  });
});
