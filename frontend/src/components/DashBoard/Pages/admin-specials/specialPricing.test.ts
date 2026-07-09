import { describe, expect, it } from 'vitest';
import {
  STICKER_PER_SESSION,
  computeSpecialPricing,
  computeBonusForTargetRate,
  evaluateRateGate,
} from './specialPricing';

// These expectations MIRROR backend/__tests__/specialOfferService.test.mjs so the
// live preview can never disagree with the server's create-route policy.

describe('computeSpecialPricing (client mirror)', () => {
  it('keeps the $175 sticker; derives total/effective from paid+bonus', () => {
    const r = computeSpecialPricing(10, 12);
    expect(STICKER_PER_SESSION).toBe(175);
    expect(r.totalSessions).toBe(22);
    expect(r.totalPrice).toBe(1750);
    expect(r.effectiveHourlyRate).toBe(79.55);
  });

  it('zero bonus => effective equals the sticker', () => {
    expect(computeSpecialPricing(10, 0).effectiveHourlyRate).toBe(175);
  });
});

describe('computeBonusForTargetRate (client mirror)', () => {
  it('$80 target on a 10-pack => +12 bonus, ~$79.55 effective', () => {
    const r = computeBonusForTargetRate(10, 80);
    expect(r.bonusSessions).toBe(12);
    expect(r.effectiveHourlyRate).toBeGreaterThanOrEqual(79);
    expect(r.effectiveHourlyRate).toBeLessThan(80.5);
  });

  it('$175 target => 0 bonus', () => {
    expect(computeBonusForTargetRate(10, 175).bonusSessions).toBe(0);
  });

  it('target above sticker => never negative bonus', () => {
    expect(computeBonusForTargetRate(10, 250).bonusSessions).toBe(0);
  });
});

describe('evaluateRateGate (client mirror — informational only, no floor)', () => {
  it('labels tiers without ever gating (admin is final decider)', () => {
    expect(evaluateRateGate(130)).toMatchObject({ tier: 'standard', requiresOverride: false, requiresReason: false, hardBlocked: false });
    expect(evaluateRateGate(110)).toMatchObject({ tier: 'discounted', requiresOverride: false, requiresReason: false, hardBlocked: false });
    expect(evaluateRateGate(80)).toMatchObject({ tier: 'deep_deal', requiresOverride: false, requiresReason: false, hardBlocked: false });
    expect(evaluateRateGate(45)).toMatchObject({ tier: 'custom_deal', requiresOverride: false, requiresReason: false, hardBlocked: false });
  });
  it('any positive rate is never hard-blocked; a $60 or $20 deal is allowed', () => {
    expect(evaluateRateGate(60).hardBlocked).toBe(false);
    expect(evaluateRateGate(59.99).hardBlocked).toBe(false);
    expect(evaluateRateGate(20).hardBlocked).toBe(false);
  });
  it('only a non-positive rate (typo) is flagged invalid', () => {
    expect(evaluateRateGate(0)).toMatchObject({ tier: 'invalid', hardBlocked: true });
    expect(evaluateRateGate(-5).hardBlocked).toBe(true);
  });
});
