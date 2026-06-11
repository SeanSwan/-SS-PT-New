/**
 * ============================================================================
 * FILE: milestoneResolver.ts
 * PURPOSE: Pure "what's shareable right now" resolver over the real
 *          gamification profile (D2c).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Turns the user's REAL gamification numbers (streak,
 * level, points — all derived from logged workouts) into at most one
 * shareable milestone with a Coach-drafted post. Returns null when nothing
 * clears a threshold — it never invents a milestone (data-truth rule).
 *
 * HOW IT FITS IN THE APP: Consumed by InlineMilestoneShare in the social
 * Coach dock. Deliberately a pure, dependency-free module so workstream C
 * (proactive briefings/nudges) can reuse the identical signal — one
 * resolver, two consumers (grill-me doc 2026-06-11, Suggestions #1).
 *
 * KEY DECISIONS:
 * - Priority: streak > level > points. A live streak is the most
 *   motivating social proof; level and points are fallbacks.
 * - Thresholds are honest minimums (3-day streak, level 2, 100 points) —
 *   below them the Coach says "nothing fresh yet" instead of padding.
 * - PR/workout-record milestones are deliberately deferred until the
 *   workout-records API surface is audited; not faked from profile data.
 */

export type MilestoneKind = 'streak' | 'level' | 'points';

export interface ShareableMilestone {
  kind: MilestoneKind;
  /** Short label for the panel header, e.g. "7-day streak". */
  headline: string;
  /** Coach-drafted post content, ready to publish as-is. */
  draft: string;
}

export interface MilestoneProfileInput {
  streakDays?: number | null;
  level?: number | null;
  points?: number | null;
}

const STREAK_MIN_DAYS = 3;
const LEVEL_MIN = 2;
const POINTS_MIN = 100;

export function resolveShareableMilestone(
  profile: MilestoneProfileInput,
): ShareableMilestone | null {
  const streakDays = profile.streakDays ?? 0;
  const level = profile.level ?? 0;
  const points = profile.points ?? 0;

  if (streakDays >= STREAK_MIN_DAYS) {
    return {
      kind: 'streak',
      headline: `${streakDays}-day streak`,
      draft:
        `🔥 ${streakDays}-day training streak at SwanStudios. ` +
        `Showing up is the whole game. #StreakClub #SwanStudios`,
    };
  }

  if (level >= LEVEL_MIN) {
    return {
      kind: 'level',
      headline: `Level ${level}`,
      draft: `Just hit Level ${level} at SwanStudios 🦢 The work is working. #LevelUp #SwanStudios`,
    };
  }

  if (points >= POINTS_MIN) {
    return {
      kind: 'points',
      headline: `${points} points`,
      draft: `${points} points of logged work at SwanStudios — every rep counted. #SwanStudios`,
    };
  }

  return null;
}
