/**
 * Goal command registry source contracts
 * ======================================
 * Locks Coach goal commands to the mounted client-progress goal surface and
 * the real Goal model field shape.
 */
import { describe, expect, it } from 'vitest';
import goalCommands from '../../services/ai/commandRegistry/goalCommands.mjs';

const byType = (type) => goalCommands.find((command) => command.type === type);

describe('goal command registry contracts', () => {
  it('targets selected-client goal routes, not authenticated-user-only /api/goals', () => {
    expect(byType('view_goals')).toMatchObject({
      method: 'GET',
      endpoint: '/api/client-progress/:clientId/goals',
      destructive: false,
      requiresConfirmation: false,
    });
    expect(byType('create_goal')).toMatchObject({
      method: 'POST',
      endpoint: '/api/client-progress/:clientId/goals',
      destructive: false,
      requiresConfirmation: true,
    });
    expect(byType('update_goal_progress')).toMatchObject({
      method: 'PUT',
      endpoint: '/api/client-progress/:clientId/goals/:goalId',
      destructive: false,
      requiresConfirmation: true,
    });
  });

  it('validates create_goal against real Goal model required fields', () => {
    const parsed = byType('create_goal').inputSchema.parse({
      clientId: 42,
      title: 'Pushup volume',
      targetValue: '50',
      currentValue: '10',
      unit: 'reps',
      category: 'strength',
      priority: 'high',
      deadline: '2026-07-01T00:00:00.000Z',
    });

    expect(parsed).toMatchObject({
      clientId: 42,
      title: 'Pushup volume',
      targetValue: 50,
      currentValue: 10,
      unit: 'reps',
      category: 'strength',
      priority: 'high',
    });
    expect(() => byType('create_goal').inputSchema.parse({
      clientId: 42,
      title: 'No',
      targetDate: '2026-07-01T00:00:00.000Z',
    })).toThrow();
  });

  it('uses UUID/string goal ids and supports progress percentage shorthand', () => {
    const parsed = byType('update_goal_progress').inputSchema.parse({
      clientId: 42,
      goalId: 'goal-uuid-1',
      progress: 60,
      notes: 'Strong week',
    });

    expect(parsed).toEqual({
      clientId: 42,
      goalId: 'goal-uuid-1',
      progress: 60,
      notes: 'Strong week',
    });
  });

  it('targets selected-client gamification routes with UUID achievements and filters', () => {
    expect(byType('view_leaderboard')).toMatchObject({
      method: 'GET',
      endpoint: '/api/gamification/leaderboard',
      destructive: false,
      requiresConfirmation: false,
    });
    expect(byType('view_xp_streaks')).toMatchObject({
      method: 'GET',
      endpoint: '/api/gamification/users/:userId/profile',
      destructive: false,
      requiresConfirmation: false,
    });
    expect(byType('award_badge')).toMatchObject({
      method: 'POST',
      endpoint: '/api/gamification/users/:userId/achievements/:achievementId',
      destructive: false,
      requiresConfirmation: true,
    });

    expect(byType('view_leaderboard').inputSchema.parse({
      limit: '25',
      page: '2',
      tier: 'bronze_forge',
    })).toEqual({ limit: 25, page: 2, tier: 'bronze_forge' });

    expect(byType('view_xp_streaks').inputSchema.parse({ clientId: 42 })).toEqual({ clientId: 42 });
    expect(byType('award_badge').inputSchema.parse({
      clientId: 42,
      achievementId: 'achievement-uuid-1',
    })).toEqual({
      clientId: 42,
      achievementId: 'achievement-uuid-1',
    });
  });
});
