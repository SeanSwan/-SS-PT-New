/**
 * Leaderboard truth — data-truth regression.
 *
 * buildHomeBadgeShowcase used to substitute a synthetic row for the current
 * user whenever `/api/v1/gamification/leaderboard` returned empty or errored
 * (the hook swallows failures and yields []). The right rail then rendered
 * that row at position 1 in gold, and ClientDashboardHome's findClientRank
 * matched it at index 0 and reported "#1" — to every user, forever.
 *
 * An unknown rank must read as unknown.
 */
import { describe, expect, it } from 'vitest';
import { buildHomeBadgeShowcase } from './HomeTabLiveWidgetViewModel';
import { findClientRank } from './ClientDashboardHome.viewModel';

const forUser = (leaderboard: unknown[] | null) =>
  buildHomeBadgeShowcase({ achievements: [], leaderboard });

describe('buildHomeBadgeShowcase leaderboard rows', () => {
  it('returns no rows when the leaderboard is empty', () => {
    expect(forUser([]).leaderboardRows).toEqual([]);
  });

  it('returns no rows when the leaderboard request failed (null)', () => {
    expect(forUser(null).leaderboardRows).toEqual([]);
  });

  it('never invents a row naming the current user', () => {
    const rows = forUser([]).leaderboardRows;

    expect(rows.some((row) => row.name === 'Test Member')).toBe(false);
    expect(rows.some((row) => row.id === 'current-user')).toBe(false);
  });

  it('still maps real leaderboard entries', () => {
    const rows = forUser([
      { id: '1', firstName: 'Ada', points: 900 },
      { id: '2', firstName: 'Grace', points: 700 },
    ]).leaderboardRows;

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: 'Ada', points: 900 });
  });
});

describe('rank label derived from those rows', () => {
  it('reads Unranked instead of #1 when the leaderboard is unavailable', () => {
    const { leaderboardRows } = forUser([]);

    expect(findClientRank(leaderboardRows, 120, 'Test Member')).toBe('Unranked');
  });

  it('still reports a real placement when the member is on the board', () => {
    // Asserted via the NAME match deliberately. findClientRank also matches on
    // `row.points === points` (ClientDashboardHome.viewModel.ts:231), which
    // reports a member at a STRANGER's rank whenever their XP totals happen to
    // coincide. That heuristic is Lane 3's to fix — this test must not cement
    // it, so the fixture gives the member a distinct point total.
    const { leaderboardRows } = forUser([
      { id: '1', firstName: 'Ada', points: 900 },
      { id: '2', firstName: 'Test Member', points: 641 },
    ]);

    // 640 !== 641, so the points disjunct cannot fire and only the name match
    // can produce this result. (An earlier version of this test used 640 on
    // both sides and silently exercised the points branch it claimed to avoid.)
    expect(findClientRank(leaderboardRows, 640, 'Test Member')).toBe('#2');
  });
});
