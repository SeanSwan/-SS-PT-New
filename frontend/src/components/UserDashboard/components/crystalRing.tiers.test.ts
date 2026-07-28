/**
 * crystalRing.tiers.test.ts — the pure EVOLUTION spec (Kimi K3 + Claude fusion 2026-07-27).
 * Verifies: 20 bands / 4 eras, continuous ascent, silhouette escalation, material substitution
 * (gold withheld until Era IV), swan-crest gating by level, motion slows, scrim protects legibility.
 */
import { describe, it, expect } from 'vitest';
import {
  ascent, dialsFor, eraOf, bandOf, bandIndexOf, swanStageOf, isBandThreshold, isEraThreshold,
  MAX_LEVEL, BAND_COUNT, RING_ERAS, RING_BANDS, clampLevel,
} from './crystalRing.tiers';

describe('crystalRing.tiers (evolution)', () => {
  it('has 20 bands in 4 eras', () => {
    expect(RING_BANDS).toHaveLength(20);
    expect(RING_ERAS).toHaveLength(4);
    expect(BAND_COUNT).toBe(20);
  });

  it('maps level → band every 50 levels', () => {
    expect(bandOf(1)).toBe(1);
    expect(bandOf(50)).toBe(1);
    expect(bandOf(51)).toBe(2);
    expect(bandOf(1000)).toBe(20);
    expect(bandIndexOf(1000)).toBe(19);
  });

  it('assigns 4 contiguous eras across the climb', () => {
    expect(eraOf(1).key).toBe('frostbound');
    expect(eraOf(250).key).toBe('frostbound');
    expect(eraOf(251).key).toBe('argent');
    expect(eraOf(600).key).toBe('amethyst');
    expect(eraOf(1000).key).toBe('gilded');
  });

  it('flags band + era thresholds', () => {
    expect(isBandThreshold(1)).toBe(true);
    expect(isBandThreshold(51)).toBe(true);
    expect(isBandThreshold(50)).toBe(false);
    expect(isEraThreshold(1)).toBe(true);
    expect(isEraThreshold(251)).toBe(true);
    expect(isEraThreshold(51)).toBe(false);
  });

  it('ascent escalates CONTINUOUSLY (no dead zone between bands)', () => {
    expect(ascent(21)).toBeLessThan(ascent(39));
    expect(ascent(500)).toBeLessThan(ascent(501));
    expect(ascent(1)).toBeCloseTo(0, 5);
    expect(ascent(1000)).toBeCloseTo(1, 5);
  });

  it('silhouette evolves — sides are non-decreasing and Era I opens as a smooth circle', () => {
    expect(dialsFor(1).sides).toBe(0); // First Frost — a smooth ring
    expect(dialsFor(250).sides).toBeGreaterThanOrEqual(6); // Glacier Gate — a polygon
    expect(dialsFor(1000).sides).toBe(12); // The Apex — a 12-gon crown
    const sides = RING_BANDS.map((b) => b.sides);
    for (let i = 1; i < sides.length; i += 1) expect(sides[i]).toBeGreaterThanOrEqual(sides[i - 1]);
  });

  it('withholds GOLD until Era IV (substitution, not early gamer-gold)', () => {
    for (const era of RING_ERAS.slice(0, 3)) {
      expect(era.spectrum.join(' ')).not.toContain('gilded-fern');
    }
    expect(RING_ERAS[3].spectrum.join(' ')).toContain('gilded-fern');
    // a single gold TRACE promise appears in late Amethyst only
    expect(dialsFor(650).goldTrace).toBe(true);
    expect(dialsFor(400).goldTrace).toBe(false);
    expect(dialsFor(900).goldTrace).toBe(false); // Era IV uses full gold material, not a trace
  });

  it('earns the swan crest by level: none → watermark → occluder → emblem → coronation', () => {
    expect(swanStageOf(600)).toBe('none');
    expect(swanStageOf(650)).toBe('watermark');
    expect(swanStageOf(700)).toBe('occluder');
    expect(swanStageOf(800)).toBe('emblem');
    expect(swanStageOf(1000)).toBe('coronation');
    expect(dialsFor(1000).swan).toBe('coronation');
  });

  it('motion SLOWS as the ring deepens; scrim + glow rise together (legibility protected)', () => {
    expect(dialsFor(900).loopMs).toBeGreaterThan(dialsFor(50).loopMs);
    expect(dialsFor(1).loopMs).toBeGreaterThanOrEqual(9000);
    expect(dialsFor(1000).loopMs).toBeLessThanOrEqual(22000);
    expect(dialsFor(990).glow).toBeGreaterThan(dialsFor(10).glow);
    expect(dialsFor(990).scrimAlpha).toBeGreaterThan(dialsFor(10).scrimAlpha);
  });

  it('caps the dispersion fringe alpha at the §4 budget (≤0.7)', () => {
    expect(dialsFor(1000).fringeAlpha).toBeLessThanOrEqual(0.7 + 1e-9);
  });

  it('marks the ultimate only at 1000 and clamps out-of-range/non-finite safely', () => {
    expect(dialsFor(1000).isUltimate).toBe(true);
    expect(dialsFor(999).isUltimate).toBe(false);
    expect(clampLevel(-5)).toBe(1);
    expect(clampLevel(99999)).toBe(MAX_LEVEL);
    expect(() => dialsFor(NaN)).not.toThrow();
    expect(dialsFor(NaN).level).toBe(1);
  });
});