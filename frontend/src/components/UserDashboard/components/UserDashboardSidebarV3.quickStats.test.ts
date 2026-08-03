/**
 * Sidebar Quick Stats truth — data-truth regression.
 *
 * UserDashboard.V3 mounts this panel on every non-Home tab but passed only
 * `displayStats` + `canonicalLevel`. `streakDays`, `progressPercent`,
 * `pointsToNext` and `trainingProof` fell to their 0/null defaults, so the
 * panel rendered "Streak 0d", "Level Progress 0%", "XP to Next 0",
 * "This Week 0" and "Training Time 0m" as constants — the same member saw
 * different numbers on Home than on any other tab.
 *
 * A tile must show a real number or not exist. It must never show 0 to mean
 * "not loaded".
 */
import { describe, expect, it } from 'vitest';
import { buildSidebarQuickStats } from './UserDashboardSidebarV3';

const displayStats = {
  posts: 4,
  followers: 10,
  following: 7,
  workouts: 22,
  points: 1240,
  level: 7,
};

const ids = (stats: ReturnType<typeof buildSidebarQuickStats>) => stats.map((stat) => stat.id);
const byId = (stats: ReturnType<typeof buildSidebarQuickStats>, id: string) =>
  stats.find((stat) => stat.id === id);

describe('buildSidebarQuickStats', () => {
  it('omits the training-proof tiles when the proof has not loaded', () => {
    const stats = buildSidebarQuickStats({
      displayStats,
      canonicalLevel: 7,
      trainingProof: null,
    });

    expect(ids(stats)).not.toContain('this-week');
    expect(ids(stats)).not.toContain('training-time');
  });

  it('renders the training-proof tiles once real proof exists', () => {
    const stats = buildSidebarQuickStats({
      displayStats,
      canonicalLevel: 7,
      trainingProof: {
        thisWeekCount: 3,
        minutesThisWeek: 135,
        weeklyCounts: [1, 2, 2, 3],
        weekDelta: 1,
        lastSession: null,
        latestSessionId: null,
        shareLine: null,
      },
    });

    expect(byId(stats, 'this-week')?.value).toBe('3');
    expect(byId(stats, 'training-time')?.value).toBe('135m');
  });

  it('keeps a real zero week visible — 0 logged is a fact, not a gap', () => {
    const stats = buildSidebarQuickStats({
      displayStats,
      canonicalLevel: 7,
      trainingProof: {
        thisWeekCount: 0,
        minutesThisWeek: 0,
        weeklyCounts: [0, 0, 0, 0],
        weekDelta: null,
        lastSession: null,
        latestSessionId: null,
        shareLine: null,
      },
    });

    expect(byId(stats, 'this-week')?.value).toBe('0');
    expect(byId(stats, 'training-time')?.value).toBe('0m');
  });

  it('reports the gamification values it is given', () => {
    const stats = buildSidebarQuickStats({
      displayStats,
      canonicalLevel: 7,
      streakDays: 5,
      progressPercent: 64,
      pointsToNext: 260,
      trainingProof: null,
    });

    expect(byId(stats, 'streak')?.value).toBe('5d');
    expect(byId(stats, 'level-progress')?.value).toBe('64%');
    expect(byId(stats, 'xp-to-next')?.value).toBe('260');
  });
});
