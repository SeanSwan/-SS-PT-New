/**
 * Quick Stats under total outage — the gate's FALSE branch.
 *
 * Every prior test passed `gamificationKnown: true` / `profileStatsKnown: true`.
 * The false branch — the entire reason the gate exists — had zero coverage, and
 * that is exactly how the `followers` tile survived: it was emitted
 * unconditionally from the same failed stats payload while its siblings
 * `workouts` and `posts` were gated.
 *
 * Under total outage the ticker must render NO fabricated number at all.
 */
import { describe, expect, it } from 'vitest';
import { buildSidebarQuickStats } from './UserDashboardSidebarV3';

/** What useProfile substitutes on failure: zeros, plus level 1 / bronze. */
const substitutedZeros = {
  posts: 0,
  followers: 0,
  following: 0,
  workouts: 0,
  points: 0,
  level: 1,
};

describe('Quick Stats under a total outage', () => {
  it('emits nothing at all when neither query is known', () => {
    const stats = buildSidebarQuickStats({
      displayStats: substitutedZeros,
      canonicalLevel: 0,
      streakDays: 0,
      progressPercent: 0,
      pointsToNext: 0,
      trainingProof: null,
      gamificationKnown: false,
      profileStatsKnown: false,
    });

    expect(stats).toEqual([]);
  });

  it('renders no zero-valued tile when the profile stats failed', () => {
    const stats = buildSidebarQuickStats({
      displayStats: substitutedZeros,
      canonicalLevel: 0,
      trainingProof: null,
      gamificationKnown: false,
      profileStatsKnown: false,
    });

    const zeroish = stats.filter((stat) => /^0/.test(String(stat.value)));
    expect(zeroish).toEqual([]);
  });

  it('gates followers with its siblings — same query, same failure', () => {
    const stats = buildSidebarQuickStats({
      displayStats: substitutedZeros,
      canonicalLevel: 0,
      trainingProof: null,
      gamificationKnown: true,
      profileStatsKnown: false,
    });

    const ids = stats.map((stat) => stat.id);
    expect(ids).not.toContain('workouts');
    expect(ids).not.toContain('posts');
    expect(ids).not.toContain('followers');
  });

  it('still shows the gamification tiles when only the profile stats failed', () => {
    const stats = buildSidebarQuickStats({
      displayStats: { ...substitutedZeros, level: 7 },
      canonicalLevel: 7,
      streakDays: 5,
      progressPercent: 64,
      pointsToNext: 260,
      trainingProof: null,
      gamificationKnown: true,
      profileStatsKnown: false,
    });

    expect(stats.map((stat) => stat.id)).toContain('streak');
    expect(stats.find((stat) => stat.id === 'streak')?.value).toBe('5d');
  });
});
