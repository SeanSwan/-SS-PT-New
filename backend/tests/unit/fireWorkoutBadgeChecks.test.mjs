/**
 * fireWorkoutBadgeChecks contract (Workout-OS C3).
 * The post-commit badge sweep must: fire workout_completion + streak_update
 * always (milestone_reached only with milestones), carry the PERSISTED stats,
 * skip idempotently on sameDay/alreadyAwarded/null results, and never throw.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCheckBadgeEarnings = vi.fn();
vi.mock('../../services/badgeService.mjs', () => ({
  default: { checkBadgeEarnings: (...args) => mockCheckBadgeEarnings(...args) },
}));
vi.mock('../../utils/monitoring/piiSafeLogging.mjs', () => ({
  piiSafeLogger: { warn: vi.fn() },
}));

const { fireWorkoutBadgeChecks } = await import('../../services/badgeGamificationBridge.mjs');

const XP_RESULT = {
  pointsAwarded: 50,
  newBalance: 1200,
  streakDays: 7,
  totalWorkouts: 12,
  awardedMilestones: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckBadgeEarnings.mockResolvedValue([]);
});

describe('fireWorkoutBadgeChecks', () => {
  it('fires workout_completion and streak_update with persisted stats', async () => {
    await fireWorkoutBadgeChecks({ userId: 11, xpResult: XP_RESULT, exerciseCount: 6 });

    expect(mockCheckBadgeEarnings).toHaveBeenCalledTimes(2);
    const types = mockCheckBadgeEarnings.mock.calls.map(([, activity]) => activity.type).sort();
    expect(types).toEqual(['streak_update', 'workout_completion']);
    const [, activity] = mockCheckBadgeEarnings.mock.calls[0];
    expect(activity).toMatchObject({
      streakDays: 7,
      currentStreak: 7,
      totalWorkouts: 12,
      exerciseCount: 6,
      count: 6,
      points: 1200,
      completed: true,
    });
  });

  it('adds milestone_reached only when milestones were awarded', async () => {
    await fireWorkoutBadgeChecks({
      userId: 11,
      xpResult: { ...XP_RESULT, awardedMilestones: [{ id: 'm1', name: 'Momentum' }] },
      exerciseCount: 3,
    });

    const types = mockCheckBadgeEarnings.mock.calls.map(([, activity]) => activity.type).sort();
    expect(types).toEqual(['milestone_reached', 'streak_update', 'workout_completion']);
    const milestoneCall = mockCheckBadgeEarnings.mock.calls.find(([, a]) => a.type === 'milestone_reached');
    expect(milestoneCall[1].milestoneNames).toEqual(['Momentum']);
    expect(milestoneCall[1].milestoneIds).toEqual(['m1']);
  });

  it.each([
    ['null xpResult', null],
    ['sameDay', { ...XP_RESULT, sameDay: true }],
    ['alreadyAwarded', { ...XP_RESULT, alreadyAwarded: true }],
  ])('returns [] without firing on %s', async (_label, xpResult) => {
    const earned = await fireWorkoutBadgeChecks({ userId: 11, xpResult });
    expect(earned).toEqual([]);
    expect(mockCheckBadgeEarnings).not.toHaveBeenCalled();
  });

  it('returns the flattened earned badges and swallows service failures', async () => {
    mockCheckBadgeEarnings
      .mockResolvedValueOnce([{ name: '7-Day Wingbeat' }])
      .mockRejectedValueOnce(new Error('badge store down'));

    const earned = await fireWorkoutBadgeChecks({ userId: 11, xpResult: XP_RESULT, exerciseCount: 2 });

    expect(earned).toEqual([{ name: '7-Day Wingbeat' }]);
  });
});
