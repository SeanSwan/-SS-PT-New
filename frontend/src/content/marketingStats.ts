/**
 * marketingStats.ts — THE single source of truth for marketing numbers
 * ======================================================================
 * Launch charter P1-2 (BP04 §2): Home and About shipped CONTRADICTING claims
 * (clients 500+ vs 1000+, satisfaction 98% vs 97%, exercises 840+ vs 900+,
 * years 25+ vs 26). Every marketing number now lives HERE and only here;
 * a contract test bans raw number-claims in the consumer files.
 *
 * VALUE PROVENANCE
 * - exerciseLibrary: [VERIFIED] live production "Exercises" count = 908 on
 *   2026-07-07 (read-only SQL). Claim "900+" is truthful; the old "840+"
 *   undersold and any ">908" claim would overclaim.
 * - yearsExperience: Sean's standing credential — "26+ years" (never "25+").
 * - clientsTransformed / satisfactionPct / sessionsDelivered / lbsLostTogether:
 *   [NEEDS-SEAN-NUMBER] — charter decision D-F. Until Sean supplies real
 *   numbers, the CONSERVATIVE value from the previously-shipped pair is used
 *   (never the higher claim). Update HERE when D-F lands; consumers follow.
 * - swimmersTaught: consistent across both prior surfaces.
 */

export interface MarketingStat {
  value: number;
  suffix: string;
  /** Compact display override for counters (e.g. '10k'). */
  display?: string;
}

export const MARKETING_STATS = {
  /** Sean's standing credential. */
  yearsExperience: { value: 26, suffix: '+' },
  /** [NEEDS-SEAN-NUMBER D-F] conservative of shipped 500+ vs 1000+. */
  clientsTransformed: { value: 500, suffix: '+' },
  /** [NEEDS-SEAN-NUMBER D-F] conservative of shipped 98% vs 97%. */
  satisfactionPct: { value: 97, suffix: '%' },
  /** [NEEDS-SEAN-NUMBER D-F] */
  sessionsDelivered: { value: 10000, suffix: '+', display: '10k' },
  swimmersTaught: { value: 312, suffix: '' },
  /** [NEEDS-SEAN-NUMBER D-F] */
  lbsLostTogether: { value: 12450, suffix: '+', display: '12.4k' },
  /** [VERIFIED] prod count 908 @ 2026-07-07. */
  exerciseLibrary: { value: 900, suffix: '+' },
} as const satisfies Record<string, MarketingStat>;

/** String claims for prose/meta copy — keep phrasing consistent everywhere. */
export const YEARS_EXPERIENCE_CLAIM = `${MARKETING_STATS.yearsExperience.value}${MARKETING_STATS.yearsExperience.suffix}`;
export const EXERCISE_LIBRARY_CLAIM = `${MARKETING_STATS.exerciseLibrary.value}${MARKETING_STATS.exerciseLibrary.suffix}`;
export const CLIENTS_TRANSFORMED_CLAIM = `${MARKETING_STATS.clientsTransformed.value}${MARKETING_STATS.clientsTransformed.suffix}`;
export const SATISFACTION_CLAIM = `${MARKETING_STATS.satisfactionPct.value}${MARKETING_STATS.satisfactionPct.suffix}`;
