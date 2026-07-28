/**
 * MODULE: proofFacetLadder
 * PURPOSE: The earned-collection view of the client's progress-proof journey. Turns the
 *   REAL proof-tier ladder (Spark -> Momentum -> Apex -> Legendary, computed from how many
 *   canonical charts a client has populated from LOGGED workouts) into an ordered set of
 *   crystalline "facets" that light as each real threshold is crossed.
 * DATA POLICY: zero fabrication. Thresholds are single-sourced from progressProofSummary's
 *   PROOF_LEVELS ladder (Rule 58 anti-drift). A facet is "earned" only when the client's
 *   verified populated-chart count meets its threshold; nothing is ever pre-lit.
 * COMPLEMENTARY: NextMilestoneGravity shows the single NEXT target; this shows the whole
 *   earned/locked ladder (the trophy shelf). Different jobs, no duplication.
 */

import { PROOF_LEVELS, TOTAL_PROGRESS_PROOF_CHARTS } from './progressProofSummary';

/** Visual weight reused from the v2 MilestoneTile taxonomy (facet < prism < crown). */
export type ProofFacetTier = 'facet' | 'prism' | 'crown';

export interface ProofFacet {
  key: string;
  label: string;
  /** Populated-chart count required to earn this facet. */
  threshold: number;
  earned: boolean;
  /** The single highest EARNED facet (the client's current standing). */
  isCurrent: boolean;
  tier: ProofFacetTier;
}

export interface ProofFacetRailModel {
  facets: ProofFacet[];
  populated: number;
  totalCharts: number;
  earnedCount: number;
  /** Highest earned tier label, or 'Locked' when none earned yet. */
  currentLabel: string;
  /** Next unearned tier label (ascending), or null once Legendary is earned. */
  nextLabel: string | null;
  /** Populated-chart count needed to reach the next tier, or null at max. */
  nextThreshold: number | null;
  /** Charts still needed for the next tier (>=0), or null at max. */
  chartsToNext: number | null;
}

/** Escalating visual weight keyed to the earnable tier's rank (0 = lowest). */
const TIER_BY_RANK: ProofFacetTier[] = ['facet', 'facet', 'prism', 'crown'];

const clampPopulated = (raw: number): number => {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(Math.round(raw), TOTAL_PROGRESS_PROOF_CHARTS));
};

/**
 * Build the ordered (ascending) earnable proof-tier ladder with earned/current/next state
 * for a given verified populated-chart count.
 */
export const buildProofFacetRail = (populatedRaw: number): ProofFacetRailModel => {
  const populated = clampPopulated(populatedRaw);

  // Earnable tiers only: drop the min:0 "Locked" sentinel, sort ascending by threshold.
  const earnable = PROOF_LEVELS
    .filter((lvl) => lvl.min > 0)
    .map((lvl) => ({ label: lvl.label, threshold: lvl.min }))
    .sort((a, b) => a.threshold - b.threshold);

  // Highest earned index (the current standing), -1 when nothing earned yet.
  let currentIdx = -1;
  earnable.forEach((tier, i) => {
    if (populated >= tier.threshold) currentIdx = i;
  });

  const facets: ProofFacet[] = earnable.map((tier, i) => ({
    key: tier.label.toLowerCase(),
    label: tier.label,
    threshold: tier.threshold,
    earned: populated >= tier.threshold,
    isCurrent: i === currentIdx,
    tier: TIER_BY_RANK[Math.min(i, TIER_BY_RANK.length - 1)],
  }));

  const nextTier = earnable[currentIdx + 1] ?? null;

  return {
    facets,
    populated,
    totalCharts: TOTAL_PROGRESS_PROOF_CHARTS,
    earnedCount: currentIdx + 1,
    currentLabel: currentIdx >= 0 ? earnable[currentIdx].label : 'Locked',
    nextLabel: nextTier ? nextTier.label : null,
    nextThreshold: nextTier ? nextTier.threshold : null,
    chartsToNext: nextTier ? Math.max(0, nextTier.threshold - populated) : null,
  };
};
