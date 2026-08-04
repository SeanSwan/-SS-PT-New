/**
 * ============================================================================
 * FILE: achievementRecency.mjs
 * PURPOSE: ONE definition of "a new achievement", shared by every Coach read.
 * ADDED: 2026-08-04 (hostile review of SWA-87)
 * ============================================================================
 *
 * WHY THIS EXISTS — two wrong answers, in sequence:
 *
 *   1. `view_xp_streaks` filtered `achievement.isNew`. There is no `isNew` column, so the read was
 *      `undefined` on every row and the count was ALWAYS 0. Fixed 2026-07-30.
 *   2. That fix used `isCompleted && !notificationSent`, which is the RIGHT semantic for a design
 *      where something marks achievements as notified — but a hostile review found that **nothing
 *      in the entire runtime ever sets `notificationSent = true`.** The column is declared
 *      `defaultValue: false` and no create or update path touches it. So the count silently became
 *      "every completed achievement, forever" — a different wrong answer, and arguably worse
 *      because a plausible non-zero number invites trust.
 *
 * Neither version was caught by a test, because both are *wrong values*, not errors.
 *
 * THE FIX: define "new" using data that actually exists. `earnedAt` is written on every completion
 * path, so recency is answerable today. The 7-day window matches the one `socialController` already
 * uses for recent achievement unlocks (`:666`) — adopting it keeps the product's notion of "recent"
 * consistent rather than inventing a second one.
 *
 * WHEN A NOTIFY PATH LANDS: `notificationSent` becomes the better signal (it tracks whether the
 * user actually SAW the achievement, which recency only approximates). Change it here and both
 * callers follow — that is the point of this module. Do not re-inline the predicate.
 */

/** Matches socialController's existing "recent unlocks" window. */
export const NEW_ACHIEVEMENT_WINDOW_DAYS = 7;

const WINDOW_MS = NEW_ACHIEVEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Cutoff instant for "new". Computed per call so a long-lived process cannot pin a stale date. */
export function newAchievementCutoff(now = Date.now()) {
  return new Date(now - WINDOW_MS);
}

/**
 * Is this row a "new" achievement? Completed, and earned inside the window.
 *
 * Tolerates a null/absent `earnedAt` by answering false: a completed row with no earned timestamp
 * cannot be shown to be recent, and guessing "yes" would reintroduce the over-count this replaced.
 */
export function isNewAchievement(row, now = Date.now()) {
  if (!row?.isCompleted) return false;
  const earned = row.earnedAt ? new Date(row.earnedAt).getTime() : NaN;
  if (!Number.isFinite(earned)) return false;
  return earned >= now - WINDOW_MS;
}
