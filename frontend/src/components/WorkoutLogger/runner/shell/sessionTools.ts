/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ sessionTools — pure trainer-floor math (feature batch 4).   │
 * │ plateBreakdown: the "45+25+10 per side" math trainers do    │
 * │   ~40× a session, done for them at weight-entry time.       │
 * │ buildWarmupRamp: top set → 40/60/80% ramp sets.             │
 * │ diffNewPRs: which PRs are NEW versus a previous snapshot —  │
 * │   powers the in-session PR toast without double-firing.     │
 * │ Pure functions, no DOM, fully unit-tested.                  │
 * └─────────────────────────────────────────────────────────────┘
 */
import type { PersonalRecord } from '../../useSessionStats';

export const STANDARD_BAR_LBS = 45;
const PLATES_LBS = [45, 35, 25, 10, 5, 2.5] as const;

export interface PlateBreakdown {
  /** Plates for ONE side of the bar, heaviest first. */
  perSide: number[];
  /** Weight that cannot be built from standard plates (per side). */
  remainder: number;
  /** Total below the bar itself → no plate math applies. */
  belowBar: boolean;
}

export function plateBreakdown(totalWeight: number, barWeight: number = STANDARD_BAR_LBS): PlateBreakdown {
  if (!Number.isFinite(totalWeight) || totalWeight <= barWeight) {
    return { perSide: [], remainder: 0, belowBar: true };
  }
  let perSideLeft = (totalWeight - barWeight) / 2;
  const perSide: number[] = [];
  for (const plate of PLATES_LBS) {
    while (perSideLeft >= plate) {
      perSide.push(plate);
      perSideLeft = Math.round((perSideLeft - plate) * 100) / 100;
    }
  }
  return { perSide, remainder: perSideLeft, belowBar: false };
}

/** "45+25+10 / side" — or honest notes for edge weights. */
export function formatPlateBreakdown(totalWeight: number, barWeight: number = STANDARD_BAR_LBS): string | null {
  const result = plateBreakdown(totalWeight, barWeight);
  if (result.belowBar) return null;
  if (result.perSide.length === 0) {
    return result.remainder > 0 ? `bar (${barWeight}) +${result.remainder} / side` : `bar only (${barWeight})`;
  }
  const stack = result.perSide.join('+');
  return result.remainder > 0 ? `${stack} / side (+${result.remainder})` : `${stack} / side`;
}

export interface WarmupRampSet {
  weight: number;
  reps: number;
}

/**
 * 40/60/80% of the top working weight, rounded to the nearest 5,
 * classic descending reps. Weights that round below 5 are skipped;
 * duplicate weights collapse (light top sets).
 */
export function buildWarmupRamp(topWeight: number): WarmupRampSet[] {
  if (!Number.isFinite(topWeight) || topWeight <= 0) return [];
  const steps: Array<[number, number]> = [[0.4, 10], [0.6, 6], [0.8, 3]];
  const ramp: WarmupRampSet[] = [];
  for (const [pct, reps] of steps) {
    const weight = Math.round((topWeight * pct) / 5) * 5;
    if (weight < 5) continue;
    if (ramp.some((set) => set.weight === weight)) continue;
    if (weight >= topWeight) continue;
    ramp.push({ weight, reps });
  }
  return ramp;
}

const prKey = (pr: PersonalRecord): string => `${pr.exerciseName}|${pr.type}`;

/** PRs present in `next` that are new (or improved) versus `prev`. */
export function diffNewPRs(prev: PersonalRecord[], next: PersonalRecord[]): PersonalRecord[] {
  const previous = new Map(prev.map((pr) => [prKey(pr), pr.value]));
  return next.filter((pr) => {
    const before = previous.get(prKey(pr));
    return before === undefined || pr.value > before;
  });
}
