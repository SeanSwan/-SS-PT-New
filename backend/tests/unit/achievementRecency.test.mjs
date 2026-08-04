/**
 * achievementRecency contract
 * ===========================
 * "New achievement" has now been defined wrong TWICE in production, and neither version threw —
 * both produced a plausible wrong NUMBER, which is why neither was noticed:
 *
 *   v1  `achievement.isNew`            → no such column → undefined → count ALWAYS 0
 *   v2  `!notificationSent`            → nothing ever sets that flag → count ALWAYS all-completed
 *
 * This locks the third definition to data that actually exists (`earnedAt`), and — critically —
 * asserts that the count DISCRIMINATES. A test that only checks "some number came back" would have
 * passed against both broken versions.
 */
import { describe, expect, it } from 'vitest';
import {
  NEW_ACHIEVEMENT_WINDOW_DAYS,
  isNewAchievement,
  newAchievementCutoff,
} from '../../services/ai/dispatchers/achievementRecency.mjs';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 4, 12, 0, 0);

describe('isNewAchievement', () => {
  it('counts a completion earned inside the window', () => {
    expect(isNewAchievement({ isCompleted: true, earnedAt: new Date(NOW - 1 * DAY) }, NOW)).toBe(true);
  });

  it('EXCLUDES a completion earned outside the window — the discrimination that was missing', () => {
    expect(isNewAchievement({ isCompleted: true, earnedAt: new Date(NOW - 30 * DAY) }, NOW)).toBe(false);
  });

  it('excludes incomplete rows regardless of recency', () => {
    expect(isNewAchievement({ isCompleted: false, earnedAt: new Date(NOW) }, NOW)).toBe(false);
  });

  it('treats a missing or unparseable earnedAt as NOT new rather than guessing yes', () => {
    // Guessing "yes" here would silently reintroduce the over-count this definition replaced.
    expect(isNewAchievement({ isCompleted: true, earnedAt: null }, NOW)).toBe(false);
    expect(isNewAchievement({ isCompleted: true }, NOW)).toBe(false);
    expect(isNewAchievement({ isCompleted: true, earnedAt: 'not-a-date' }, NOW)).toBe(false);
  });

  it('survives null/undefined rows', () => {
    expect(isNewAchievement(null, NOW)).toBe(false);
    expect(isNewAchievement(undefined, NOW)).toBe(false);
  });

  it('accepts an ISO string as well as a Date — Sequelize returns either depending on raw mode', () => {
    expect(isNewAchievement({ isCompleted: true, earnedAt: new Date(NOW - DAY).toISOString() }, NOW)).toBe(true);
  });

  it('is inclusive exactly at the boundary, so a row cannot fall through the gap', () => {
    const edge = NOW - NEW_ACHIEVEMENT_WINDOW_DAYS * DAY;
    expect(isNewAchievement({ isCompleted: true, earnedAt: new Date(edge) }, NOW)).toBe(true);
    expect(isNewAchievement({ isCompleted: true, earnedAt: new Date(edge - 1000) }, NOW)).toBe(false);
  });
});

describe('newAchievementCutoff', () => {
  it('returns the window start and agrees with isNewAchievement', () => {
    const cutoff = newAchievementCutoff(NOW);
    expect(cutoff.getTime()).toBe(NOW - NEW_ACHIEVEMENT_WINDOW_DAYS * DAY);
    // The SQL predicate (earnedAt >= cutoff) and the in-memory predicate must agree, or the two
    // Coach reads would disagree about the same client.
    expect(isNewAchievement({ isCompleted: true, earnedAt: cutoff }, NOW)).toBe(true);
  });

  it('recomputes per call — a long-lived process must not pin a stale cutoff', () => {
    expect(newAchievementCutoff(NOW).getTime())
      .not.toBe(newAchievementCutoff(NOW + 5 * DAY).getTime());
  });
});
