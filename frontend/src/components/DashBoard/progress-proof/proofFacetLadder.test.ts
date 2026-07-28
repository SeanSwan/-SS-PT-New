/**
 * TEST: proofFacetRail (earned proof-tier ladder core)
 * PURPOSE: The ladder is single-sourced from PROOF_LEVELS and reflects ONLY the real
 *   populated-chart count. Nothing pre-lights; the current tier is the highest earned;
 *   the next-tier math is honest; the max tier has no "next".
 */

import { describe, expect, it } from 'vitest';
import { buildProofFacetRail } from './proofFacetLadder';
import { PROOF_LEVELS, TOTAL_PROGRESS_PROOF_CHARTS } from './progressProofSummary';

const legendaryThreshold = TOTAL_PROGRESS_PROOF_CHARTS;

describe('buildProofFacetRail', () => {
  it('exposes the 4 earnable tiers ascending (Locked sentinel excluded)', () => {
    const rail = buildProofFacetRail(0);
    expect(rail.facets.map((f) => f.label)).toEqual(['Spark', 'Momentum', 'Apex', 'Legendary']);
    // thresholds strictly ascending
    const t = rail.facets.map((f) => f.threshold);
    expect(t).toEqual([...t].sort((a, b) => a - b));
    // the max earnable tier is the full deck (single-sourced, not hardcoded)
    expect(rail.facets[rail.facets.length - 1].threshold).toBe(legendaryThreshold);
  });

  it('lights NOTHING and reports Locked at zero populated charts', () => {
    const rail = buildProofFacetRail(0);
    expect(rail.facets.every((f) => !f.earned)).toBe(true);
    expect(rail.earnedCount).toBe(0);
    expect(rail.currentLabel).toBe('Locked');
    expect(rail.nextLabel).toBe('Spark');
    expect(rail.chartsToNext).toBe(1);
  });

  it('earns the current tier and everything below it, but not above', () => {
    const rail = buildProofFacetRail(5); // >= Momentum(4), < Apex(8)
    const byLabel = Object.fromEntries(rail.facets.map((f) => [f.label, f]));
    expect(byLabel.Spark.earned).toBe(true);
    expect(byLabel.Momentum.earned).toBe(true);
    expect(byLabel.Apex.earned).toBe(false);
    expect(byLabel.Legendary.earned).toBe(false);
    expect(byLabel.Momentum.isCurrent).toBe(true);
    expect(rail.facets.filter((f) => f.isCurrent)).toHaveLength(1);
    expect(rail.currentLabel).toBe('Momentum');
    expect(rail.nextLabel).toBe('Apex');
    expect(rail.chartsToNext).toBe(3); // 8 - 5
  });

  it('has no next tier once Legendary is earned (full deck)', () => {
    const rail = buildProofFacetRail(legendaryThreshold);
    expect(rail.facets.every((f) => f.earned)).toBe(true);
    expect(rail.currentLabel).toBe('Legendary');
    expect(rail.nextLabel).toBeNull();
    expect(rail.nextThreshold).toBeNull();
    expect(rail.chartsToNext).toBeNull();
  });

  it('clamps out-of-range / non-finite input instead of fabricating', () => {
    expect(buildProofFacetRail(9999).currentLabel).toBe('Legendary');
    expect(buildProofFacetRail(9999).populated).toBe(legendaryThreshold);
    expect(buildProofFacetRail(-4).currentLabel).toBe('Locked');
    expect(buildProofFacetRail(Number.NaN).currentLabel).toBe('Locked');
    expect(buildProofFacetRail(Number.NaN).earnedCount).toBe(0);
  });

  it('assigns escalating visual weight (facet -> prism -> crown)', () => {
    const rail = buildProofFacetRail(TOTAL_PROGRESS_PROOF_CHARTS);
    const byLabel = Object.fromEntries(rail.facets.map((f) => [f.label, f]));
    expect(byLabel.Spark.tier).toBe('facet');
    expect(byLabel.Apex.tier).toBe('prism');
    expect(byLabel.Legendary.tier).toBe('crown');
  });

  it('stays consistent with PROOF_LEVELS thresholds (single source)', () => {
    const rail = buildProofFacetRail(0);
    const earnable = PROOF_LEVELS.filter((l) => l.min > 0).map((l) => l.min).sort((a, b) => a - b);
    expect(rail.facets.map((f) => f.threshold)).toEqual(earnable);
  });
});