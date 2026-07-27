/**
 * MODULE: ghostSelf
 * PURPOSE: The "Your Journey" overlay for any real time-series trend chart. Splits the
 *   client's OWN logged series into a faded past-you segment and a vivid present-you
 *   segment (same real timeline + axis - no fabricated comparison, no misleading x),
 *   surfaces the personal-best point, and a direction-aware "since you started" delta.
 *   The visible gap between faded-past and vivid-present IS the progress story.
 * DATA POLICY: uses only the already-loaded, verified series; invents nothing. A true
 *   prior-window "racing ghost" (90-days-ago overlay) needs a comparison endpoint - that
 *   is a v2 and is deliberately NOT faked here.
 */

export interface GhostPoint {
  // string | number so the module is honestly reusable for numeric/time-index x axes
  // (aligns with sanitizeChartData, which also keeps numeric x) - not just string x.
  x: string | number;
  y: number;
}

export interface GhostSelf {
  /** Earlier segment (rendered faded). Includes the split point for a continuous line. */
  ghost: GhostPoint[];
  /** Recent segment (rendered vivid), from the split point to the latest. */
  current: GhostPoint[];
  startPoint: GhostPoint;
  bestPoint: GhostPoint;
  latestPoint: GhostPoint;
  /** e.g. "+18 lbs since W1" / "-2.3 % since Jan 3" (direction-aware). */
  startDeltaLabel: string;
  /** True when the latest value is better than the start (for badge tone). */
  improved: boolean;
}

interface GhostSelfOptions {
  unit?: string;
  higherIsBetter?: boolean;
  /** Minimum points before a journey is worth splitting (default 4). */
  minPoints?: number;
}

// Round to at most one decimal (integers stay integer). Used for BOTH the sign/tone
// decision and the display, so a change that rounds to zero can never show a signed
// "-0" or claim a false "improvement".
const round1 = (value: number): number => (Number.isInteger(value) ? value : Math.round(value * 10) / 10);

const formatMagnitude = (value: number, unit: string): string => (
  `${round1(value)}${unit ? ` ${unit}` : ''}`
);

/**
 * Build the journey overlay from a raw series, or null when there is not enough
 * verified history to tell a before/after story.
 */
export const buildGhostSelf = (
  series: ReadonlyArray<GhostPoint> | undefined | null,
  { unit = '', higherIsBetter = true, minPoints = 4 }: GhostSelfOptions = {},
): GhostSelf | null => {
  const clean = (series ?? []).filter(
    (p): p is GhostPoint => !!p && p.x !== null && p.x !== undefined && p.x !== '' && Number.isFinite(p.y),
  );
  if (clean.length < minPoints) return null;

  // Split at the midpoint; the split point belongs to BOTH segments so the faded and
  // vivid lines meet with no visual break.
  const mid = Math.floor((clean.length - 1) / 2);
  const ghost = clean.slice(0, mid + 1);
  const current = clean.slice(mid);

  const startPoint = clean[0];
  const latestPoint = clean[clean.length - 1];
  const bestPoint = clean.reduce(
    (best, p) => ((higherIsBetter ? p.y > best.y : p.y < best.y) ? p : best),
    clean[0],
  );

  // Decide sign + tone from the ROUNDED delta so a sub-rounding change reads as a clean
  // "0" (no "-0", no false "improved").
  const roundedDelta = round1(latestPoint.y - startPoint.y);
  const improved = roundedDelta === 0 ? false : higherIsBetter ? roundedDelta > 0 : roundedDelta < 0;
  const sign = roundedDelta > 0 ? '+' : roundedDelta < 0 ? '-' : '';
  const startDeltaLabel = `${sign}${formatMagnitude(Math.abs(roundedDelta), unit)} since ${startPoint.x}`;

  return { ghost, current, startPoint, bestPoint, latestPoint, startDeltaLabel, improved };
};