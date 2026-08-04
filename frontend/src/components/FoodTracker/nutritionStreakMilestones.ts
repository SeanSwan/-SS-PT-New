/**
 * FILE: nutritionStreakMilestones.ts
 * PURPOSE: Phase 4C streak logic — read the additive currentLogStreak field
 *          from /api/macros/summary and detect milestone crossings (3/7/30)
 *          for the CelebrationToast.
 * HOW IT FITS: NutritionWorkspace watches summary changes; a log action that
 *          pushes the streak across a milestone fires one celebration.
 * ED-SAFE LAW: celebration only. No broken-streak / streak-loss copy exists
 *          in this module, and a decreasing streak never produces output.
 */
import type { MacroSummary } from '../../hooks/useMacroSummary';

/** Additive S1.2 fields on the summary response (backend
 *  dailyMacroRoutes.mjs). Kept as an extension type because the base hook
 *  interface predates them. */
export interface MacroSummaryStreakFields {
  currentLogStreak?: unknown;
}

export const STREAK_MILESTONES: readonly number[] = [3, 7, 30];

/** Safe read of summary.currentLogStreak — 0 for anything non-numeric,
 *  non-finite, or negative. Fractions floor to whole days. */
export const readCurrentLogStreak = (
  summary: (MacroSummary & MacroSummaryStreakFields) | null | undefined,
): number => {
  const raw = summary?.currentLogStreak;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return 0;
  return Math.floor(raw);
};

/**
 * Highest milestone crossed when the streak moves from previous → next.
 * Returns null when nothing was crossed or the streak did not increase
 * (never celebrates a reset — ED-safe).
 */
export const detectStreakMilestone = (previous: number, next: number): number | null => {
  if (!Number.isFinite(previous) || !Number.isFinite(next) || next <= previous) return null;
  const crossed = STREAK_MILESTONES.filter(
    (milestone) => previous < milestone && next >= milestone,
  );
  return crossed.length > 0 ? crossed[crossed.length - 1] : null;
};

/** Next milestone ahead of the streak (null past the last one). Drives the
 *  StreakRing progress arc. */
export const nextStreakMilestone = (streak: number): number | null =>
  STREAK_MILESTONES.find((milestone) => streak < milestone) ?? null;

const MILESTONE_MESSAGES: Record<number, string> = {
  3: '3 days strong — your wings are warming up 🦢',
  7: 'A full week of logging — wings spread 🦢',
  30: '30 days — legendary consistency 🦢',
};

export const streakMilestoneMessage = (milestone: number): string =>
  MILESTONE_MESSAGES[milestone] || `${milestone}-day logging streak 🦢`;
