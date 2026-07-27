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
  x: string;
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

const formatMagnitude = (value: number, unit: string): string => {
  // Keep one decimal only when the value is genuinely fractional (body fat, est-1RM).
  const rounded = Number.isInteger(value) ? value : Math.round(value * 10) / 10;
  return `${rounded}${unit ? ` ${unit}` : ''}`;
};

/**
 * Build the journey overlay from a raw series, or null when there is not enough
 * verified history to tell a before/after story.
 */
export const buildGhostSelf = (
  series: ReadonlyArray<GhostPoint> | undefined | null,
  { unit = '', higherIsBetter = true, minPoints = 4 }: GhostSelfOptions = {},
): GhostSelf | null => {
  const clean = (series ?? []).filter(
    (p): p is GhostPoint => !!p && typeof p.x === 'string' && Number.isFinite(p.y),
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

  const delta = latestPoint.y - startPoint.y;
  const improved = higherIsBetter ? delta > 0 : delta < 0;
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  const startDeltaLabel = `${sign}${formatMagnitude(Math.abs(delta), unit)} since ${startPoint.x}`;

  return { ghost, current, startPoint, bestPoint, latestPoint, startDeltaLabel, improved };
};