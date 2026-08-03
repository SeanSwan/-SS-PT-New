/**
 * Quick Stats gamification gate — behavioral, not source-grep.
 *
 * The earlier contract test read HomeTab.tsx as a string, so defeating the gate
 * at the CALL SITE (`gamificationKnown={true}`) passed every assertion. The gate
 * therefore lives inside the builder itself, and this pins it there: the tiles
 * cannot be emitted with unknown data no matter what a caller passes, short of
 * lying outright.
 *
 * Why it matters: all five of these tiles derive from the gamification profile,
 * and `levelProgress` is fabricated from `?? 0` upstream — so on total failure
 * the builder receives a complete, plausible, entirely false record.
 */
import { describe, expect, it } from 'vitest';
import { buildSidebarQuickStats } from './UserDashboardSidebarV3';

const displayStats = {
  posts: 4,
  followers: 10,
  following: 7,
  workouts: 22,
  points: 0,
  level: 0,
};

const GAMIFICATION_TILES = ['level', 'points', 'streak', 'level-progress', 'xp-to-next'];

const ids = (stats: ReturnType<typeof buildSidebarQuickStats>) => stats.map((s) => s.id);

describe('Quick Stats gamification gate', () => {
  it('omits every gamification tile when the record is not known', () => {
    const stats = buildSidebarQuickStats({
      displayStats,
      canonicalLevel: 0,
      streakDays: 0,
      progressPercent: 0,
      pointsToNext: 0,
      gamificationKnown: false,
      profileStatsKnown: true,
    });

    for (const tile of GAMIFICATION_TILES) {
      expect(ids(stats)).not.toContain(tile);
    }
  });

  it('never renders a zero-streak or zero-level claim while unknown', () => {
    const stats = buildSidebarQuickStats({
      displayStats,
      canonicalLevel: 0,
      gamificationKnown: false,
      profileStatsKnown: true,
    });

    const rendered = stats.map((s) => `${s.label} ${s.value}`).join(' | ');
    expect(rendered).not.toMatch(/Streak 0d/);
    expect(rendered).not.toMatch(/Level Progress 0%/);
    expect(rendered).not.toMatch(/XP to Next 0/);
  });

  it('still shows non-gamification tiles, which come from a different query', () => {
    const stats = buildSidebarQuickStats({
      displayStats,
      canonicalLevel: 0,
      gamificationKnown: false,
      profileStatsKnown: true,
    });

    expect(ids(stats)).toContain('workouts');
    expect(ids(stats)).toContain('posts');
  });

  it('emits the gamification tiles once the record IS known', () => {
    const stats = buildSidebarQuickStats({
      displayStats: { ...displayStats, points: 1240, level: 7 },
      canonicalLevel: 7,
      streakDays: 5,
      progressPercent: 64,
      pointsToNext: 260,
      gamificationKnown: true,
      profileStatsKnown: true,
    });

    for (const tile of GAMIFICATION_TILES) {
      expect(ids(stats)).toContain(tile);
    }
    expect(stats.find((s) => s.id === 'streak')?.value).toBe('5d');
  });

  it('a real zero still renders — 0 is a fact once the record is known', () => {
    const stats = buildSidebarQuickStats({
      displayStats,
      canonicalLevel: 1,
      streakDays: 0,
      progressPercent: 0,
      pointsToNext: 0,
      gamificationKnown: true,
      profileStatsKnown: true,
    });

    expect(stats.find((s) => s.id === 'streak')?.value).toBe('0d');
  });
});
