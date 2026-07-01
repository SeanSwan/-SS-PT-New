import { describe, expect, it } from 'vitest';
import { buildCoachRouteContext } from './CoachRouteContext';
import { buildRouteRequestContext } from './hooks/useCoachAssistantMessageUtils';

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

  it('falls back to the mounted route when sourcePath crosses dashboard roles', () => {
    const context = buildCoachRouteContext(
      '/dashboard/trainer/coach-assistant',
      '?sourcePath=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42',
    );

    expect(context.route).toBe('/dashboard/trainer/coach-assistant');
    expect(context.scope).toBe('trainer');
    expect(context.surface).toBe('coach_command_center');
  });

  it('falls back to the mounted route when sourcePath carries encoded traversal', () => {
    const context = buildCoachRouteContext(
      '/dashboard/client/coach-assistant',
      '?sourcePath=%2Fdashboard%2Fclient%2F%252e%252e%2Fadmin%2Fclient-management',
    );

    expect(context.route).toBe('/dashboard/client/coach-assistant');
    expect(context.scope).toBe('client');
    expect(context.surface).toBe('coach_command_center');
  });

  it('preserves safe scheduled-session context when Coach is opened from the schedule', () => {
    const context = buildCoachRouteContext(
      '/dashboard/trainer/coach-assistant',
      '?source=master-schedule&intent=log_workout&sourcePath=%2Fdashboard%2Ftrainer%2Fschedule&sessionId=88&sessionDate=2026-05-31T16%3A00%3A00.000Z&sessionCredits=2&scheduledSessionNotes=private',
    );

    expect(context).toMatchObject({
      route: '/dashboard/trainer/schedule',
      scope: 'trainer',
      surface: 'schedule',
      source: 'master-schedule',
      intent: 'log_workout',
      scheduledSessionId: '88',
      scheduledSessionDate: '2026-05-31',
      scheduledSessionCredits: 2,
      writeBackPolicy: 'approval_required',
    });
    expect(context).not.toHaveProperty('scheduledSessionNotes');
  });
  it('preserves zero-credit scheduled-session context for free-tracking Coach requests', () => {
    const context = buildCoachRouteContext(
      '/dashboard/trainer/coach-assistant',
      '?source=master-schedule&intent=log_workout&sourcePath=%2Fdashboard%2Ftrainer%2Fschedule&sessionId=89&sessionDate=2026-05-31&sessionCredits=0',
    );

    expect(context).toMatchObject({
      route: '/dashboard/trainer/schedule',
      scope: 'trainer',
      source: 'master-schedule',
      intent: 'log_workout',
      scheduledSessionId: '89',
      scheduledSessionDate: '2026-05-31',
      scheduledSessionCredits: 0,
    });
    expect(buildRouteRequestContext(context)).toEqual({
      source: 'master-schedule',
      intent: 'log_workout',
      scheduledSessionId: '89',
      scheduledSessionDate: '2026-05-31',
      scheduledSessionCredits: 0,
    });
  });

  it('forwards safe historical-import route context to backend Coach proposals', () => {
    const context = buildCoachRouteContext(
      '/dashboard/admin/coach-assistant',
      '?clientId=42&intent=historical_import&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management&draftKey=swan-historical-import-42-123',
    );

    expect(context).toMatchObject({
      source: 'clients-team',
      intent: 'historical_import',
    });
    expect(buildRouteRequestContext(context)).toEqual({
      source: 'clients-team',
      intent: 'historical_import',
    });
  });
});