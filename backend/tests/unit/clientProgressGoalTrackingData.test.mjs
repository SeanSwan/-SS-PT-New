import { describe, expect, it } from 'vitest';
import { buildGoalTrackingData } from '../../services/clientProgress/goalTrackingReadModel.mjs';

// The active goal's forward-looking dates are RELATIVE to the test run —
// hardcoded deadlines turned into time bombs (a '2026-07-01' deadline made
// this suite start failing on 2026-07-02 with the goal counted overdue).
const daysFromNow = (days) => new Date(Date.now() + days * 86_400_000).toISOString();

describe('client progress goal tracking builder', () => {
  it('maps real Goal rows into trainer goal tracking data without seeded stories', () => {
    const result = buildGoalTrackingData({
      goals: [
        {
          id: 101,
          title: 'Pushup volume',
          category: 'strength',
          status: 'active',
          priority: 'critical',
          progressPercentage: 40,
          currentValue: 20,
          targetValue: 50,
          unit: 'reps',
          startDate: daysFromNow(-180),
          deadline: daysFromNow(30),
          estimatedCompletionDate: daysFromNow(20),
          confidenceLevel: 8,
          averageProgressPerWeek: 4,
          milestones: [
            { id: 'm1', title: 'First 20', target: 20, current: 20, achieved: true, achievedAt: '2026-02-01T00:00:00.000Z' },
          ],
          progressHistory: [
            { date: '2026-02-01T00:00:00.000Z', value: 20 },
          ],
        },
        {
          id: 102,
          title: 'Mobility consistency',
          category: 'flexibility',
          status: 'completed',
          priority: 'low',
          progressPercentage: 100,
          currentValue: 12,
          targetValue: 12,
          unit: 'sessions',
          startDate: '2026-01-01T00:00:00.000Z',
          deadline: '2026-03-01T00:00:00.000Z',
          completedAt: '2026-02-25T00:00:00.000Z',
          confidenceLevel: 10,
        },
      ],
    });

    expect(result.summary).toMatchObject({
      totalGoals: 2,
      activeGoals: 1,
      completedGoals: 1,
      overdueGoals: 0,
      averageProgress: 70,
      onTrackGoals: 1,
    });
    expect(result.goals[0]).toMatchObject({
      id: '101',
      title: 'Pushup volume',
      type: 'performance',
      priority: 'high',
      progress: 40,
      currentValue: 20,
      targetValue: 50,
    });
    expect(result.goals[0].milestones[0]).toMatchObject({
      id: 'm1',
      title: 'First 20',
      completed: true,
    });
    expect(result.achievements[0]).toMatchObject({
      id: 'completed-goal-recorded',
      title: 'Completed Goal Recorded',
      earned: true,
    });
    expect(JSON.stringify(result)).not.toMatch(/Lose 15 lbs|Bench Press 100kg|Run 5K under 25 minutes|First Milestone Master|Goal Crusher/);
  });

  it('returns honest empty data when a client has no saved goals', () => {
    const result = buildGoalTrackingData({ goals: [] });

    expect(result.summary).toMatchObject({
      totalGoals: 0,
      activeGoals: 0,
      completedGoals: 0,
      overdueGoals: 0,
      averageProgress: 0,
      onTrackGoals: 0,
    });
    expect(result.goals).toEqual([]);
    expect(result.achievements).toEqual([]);
  });
});
