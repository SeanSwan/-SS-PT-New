import { describe, expect, it } from 'vitest';
import { buildCoachRouteContext } from './CoachRouteContext';

describe('CoachRouteContext', () => {
  it('binds client progress to read and approval-gated draft actions', () => {
    const context = buildCoachRouteContext('/dashboard/client/progress');

    expect(context).toMatchObject({
      route: '/dashboard/client/progress',
      scope: 'client',
      surface: 'progress',
      writeBackPolicy: 'approval_required',
    });
    expect(context.allowedActions).toContainEqual({
      key: 'summarize_progress',
      mode: 'ask',
      requiresApproval: false,
    });
    expect(context.allowedActions).toContainEqual({
      key: 'draft_workout_plan_delta',
      mode: 'draft',
      requiresApproval: true,
    });
  });

  it('honors a sourcePath query when Coach is opened from another dashboard surface', () => {
    const context = buildCoachRouteContext(
      '/dashboard/client/coach-assistant',
      '?sourcePath=%2Fdashboard%2Fclient%2Fcommunity',
    );

    expect(context.route).toBe('/dashboard/client/community');
    expect(context.surface).toBe('community');
    expect(context.allowedActions.every(action => action.mode !== 'act' || action.requiresApproval)).toBe(true);
  });
});
