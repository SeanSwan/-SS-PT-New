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

describe('evaluateRateGate (client mirror)', () => {
  it('>= $120 clear, no override', () => {
    expect(evaluateRateGate(130)).toMatchObject({ tier: 'clear', requiresOverride: false, hardBlocked: false });
  });
  it('$100–120 needs override, no reason', () => {
    expect(evaluateRateGate(110)).toMatchObject({ tier: 'below_warning', requiresOverride: true, requiresReason: false });
  });
  it('$60–100 needs override + reason', () => {
    expect(evaluateRateGate(80)).toMatchObject({ tier: 'below_floor', requiresOverride: true, requiresReason: true });
  });
  it('$60 exactly is not hard-blocked; below $60 is', () => {
    expect(evaluateRateGate(60).hardBlocked).toBe(false);
    expect(evaluateRateGate(59.99).hardBlocked).toBe(true);
  });
});
