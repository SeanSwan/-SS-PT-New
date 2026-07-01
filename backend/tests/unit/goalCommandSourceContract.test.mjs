/**
 * Goal command registry source contracts
 * ======================================
 * Locks Coach goal commands to the mounted client-progress goal surface and
 * the real Goal model field shape.
 */
import { describe, expect, it } from 'vitest';
import goalCommands from '../../services/ai/commandRegistry/goalCommands.mjs';
import {
  buildCommandSummaryForClassifier,
  getCommandsForRole,
  initializeRegistry,
} from '../../services/ai/commandRegistry/index.mjs';

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

  it('exposes only no-client-ref gamification reads to raw user accounts', () => {
    initializeRegistry();

    const leaderboard = byType('view_leaderboard');
    const xpStreaks = byType('view_xp_streaks');
    const userCommandTypes = new Set(getCommandsForRole('user').map((command) => command.type));
    const classifierSummary = buildCommandSummaryForClassifier('user');

    expect(leaderboard).toMatchObject({
      destructive: false,
      requiresConfirmation: false,
      requiresClientRef: false,
    });
    expect(leaderboard.roleRequired).toEqual(expect.arrayContaining(['admin', 'trainer', 'client', 'user']));
    expect(userCommandTypes).toContain('view_leaderboard');
    expect(classifierSummary).toContain('view_leaderboard:');

    expect(xpStreaks.requiresClientRef).toBe(true);
    expect(userCommandTypes).not.toContain('view_xp_streaks');
    expect(userCommandTypes).not.toContain('award_badge');
    expect(classifierSummary).not.toContain('view_xp_streaks:');
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
