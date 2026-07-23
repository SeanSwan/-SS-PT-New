/**
 * crystalRing.tiers.test.ts — the pure escalation spec.
 * Kimi mandates verified here: continuous (level-indexed) escalation, tier
 * thresholds every 20, motion SLOWS as it deepens, scrim scales with glow.
 */
import { describe, it, expect } from 'vitest';
import {
  ascent, dialsFor, eraOf, isTierThreshold, tierOf,
  MAX_LEVEL, MAX_TIER, RING_ERAS,
} from './crystalRing.tiers';

describe('crystalRing.tiers', () => {
  it('maps level → tier every 20 levels (1..50)', () => {
    expect(tierOf(1)).toBe(1);
    expect(tierOf(20)).toBe(1);
    expect(tierOf(21)).toBe(2);
    expect(tierOf(1000)).toBe(MAX_TIER);
    expect(MAX_TIER).toBe(50);
  });

  it('flags tier thresholds on the first level of each tier', () => {
    expect(isTierThreshold(1)).toBe(true);
    expect(isTierThreshold(21)).toBe(true);
    expect(isTierThreshold(41)).toBe(true);
    expect(isTierThreshold(20)).toBe(false);
    expect(isTierThreshold(30)).toBe(false);
  });

  it('escalates CONTINUOUSLY — ascent strictly increases per level (no dead zone)', () => {
    // Kimi's #1 fix: a user at 21 and 39 must NOT see the identical artifact.
    expect(ascent(21)).toBeLessThan(ascent(39));
    expect(ascent(500)).toBeLessThan(ascent(501));
    expect(ascent(1)).toBeCloseTo(0, 5);
    expect(ascent(1000)).toBeCloseTo(1, 5);
  });

  it('motion SLOWS as the ring deepens (loopMs grows with ascent — sacred = slow)', () => {
    expect(dialsFor(900).loopMs).toBeGreaterThan(dialsFor(50).loopMs);
    expect(dialsFor(1).loopMs).toBeGreaterThanOrEqual(9000);
    expect(dialsFor(1000).loopMs).toBeLessThanOrEqual(22000);
  });

  it('numeral-sanctuary scrim scales UP with the glow (legibility protected)', () => {
    const low = dialsFor(10);
    const high = dialsFor(990);
    expect(high.glow).toBeGreaterThan(low.glow);
    expect(high.scrimAlpha).toBeGreaterThan(low.scrimAlpha);
  });

  it('caps the dispersion fringe alpha at the §4 budget (≤0.7)', () => {
    expect(dialsFor(1000).fringeAlpha).toBeLessThanOrEqual(0.7 + 1e-9);
  });

  it('assigns named eras across the full climb and marks the ultimate', () => {
    expect(eraOf(1).key).toBe('frost');
    expect(eraOf(1000).key).toBe('ascendant');
    expect(dialsFor(1000).isUltimate).toBe(true);
    expect(dialsFor(999).isUltimate).toBe(false);
    // eras are contiguous and cover 1..1000
    expect(RING_ERAS[0].minLevel).toBe(1);
    expect(RING_ERAS[RING_ERAS.length - 1].maxLevel).toBe(MAX_LEVEL);
  });

  it('clamps out-of-range and non-finite levels safely', () => {
    expect(tierOf(-5)).toBe(1);
    expect(tierOf(99999)).toBe(MAX_TIER);
    expect(() => dialsFor(NaN)).not.toThrow();
    expect(dialsFor(NaN).tier).toBe(1);
  });
});
