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


  it('preserves safe message-origin context as approval-gated Coach draft actions', () => {
    const context = buildCoachRouteContext(
      '/dashboard/trainer/coach-assistant',
      '?source=messages&intent=log_workout_from_message&threadId=7&sourceMessageId=m-injury&sourcePath=%2Fdashboard%2Ftrainer%2Fmessages&messageText=knee%20pain',
    );

    expect(context).toMatchObject({
      route: '/dashboard/trainer/messages',
      scope: 'trainer',
      surface: 'messages',
      source: 'messages',
      intent: 'log_workout_from_message',
      threadId: '7',
      sourceMessageId: 'm-injury',
      writeBackPolicy: 'approval_required',
    });
    expect(context).not.toHaveProperty('messageText');
    expect(context.allowedActions).toEqual(expect.arrayContaining([
      { key: 'create_task_from_message', mode: 'draft', requiresApproval: true },
      { key: 'schedule_from_message', mode: 'draft', requiresApproval: true },
      { key: 'log_workout_from_message', mode: 'draft', requiresApproval: true },
    ]));
    expect(context.allowedActions.every(action => action.mode !== 'act' && action.requiresApproval !== false || action.key === 'summarize_messages')).toBe(true);
  });  it('preserves safe scheduled-session context when Coach is opened from the schedule', () => {
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
});
