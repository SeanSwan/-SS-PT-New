import { describe, expect, it } from 'vitest';

import {
  buildCommandRouteContext,
  buildRouteContext,
  buildThreadSelectionSearchParams,
  buildWorkflowReturnLabel,
  getScheduledSessionRouteContextFromSearchParams,
  normalizeCommandCenterReturnTo,
  parseRouteClientId,
  parseRouteThreadId,
} from './CoachCommandCenter.routeContext';

describe('CoachCommandCenter route client parsing', () => {
  it('accepts only complete positive integer client ids', () => {
    expect(parseRouteClientId('424242')).toBe(424242);
    expect(parseRouteClientId(' 424242 ')).toBe(424242);
    expect(parseRouteClientId('424242junk')).toBeNull();
    expect(parseRouteClientId('0')).toBeNull();
    expect(parseRouteClientId('')).toBeNull();
    expect(parseRouteClientId(null)).toBeNull();
  });
});

describe('CoachCommandCenter return route normalization', () => {
  it('accepts dashboard-local return routes and rejects external exits', () => {
    expect(normalizeCommandCenterReturnTo('/dashboard/admin/client-management?clientId=424242'))
      .toBe('/dashboard/admin/client-management?clientId=424242');
    expect(normalizeCommandCenterReturnTo('//evil.example/dashboard/admin')).toBeNull();
    expect(normalizeCommandCenterReturnTo('https://evil.example/dashboard/admin')).toBeNull();
    expect(normalizeCommandCenterReturnTo('/dashboard/admin/client-management\n?clientId=424242')).toBeNull();
    expect(normalizeCommandCenterReturnTo('/dashboard/admin/client-management\t?clientId=424242')).toBeNull();
    expect(normalizeCommandCenterReturnTo('/dashboard/admin\\client-management')).toBeNull();
    expect(normalizeCommandCenterReturnTo('/store')).toBeNull();
    expect(normalizeCommandCenterReturnTo(null)).toBeNull();
  });

  it('uses workflow-specific return labels for known origins', () => {
    expect(buildWorkflowReturnLabel('/dashboard/admin/client-management', 'clients-team')).toBe('Back to Client Hub');
    expect(buildWorkflowReturnLabel('/dashboard/admin/schedule', 'master-schedule')).toBe('Back to Schedule');
    expect(buildWorkflowReturnLabel('/dashboard/admin/log-my-workout?loadPlan=today', 'admin-workout-logger')).toBe('Back to Workout Logger');
    expect(buildWorkflowReturnLabel('/dashboard/trainer/log-workout?clientId=42', 'trainer-workout-logger')).toBe('Back to Workout Logger');
    expect(buildWorkflowReturnLabel('/dashboard/client/log-workout?loadPlan=today', 'client-workout-logger')).toBe('Back to Workout Logger');
    expect(buildWorkflowReturnLabel('/dashboard/admin', null)).toBe('Back to Dashboard');
    expect(buildWorkflowReturnLabel(null, 'clients-team')).toBeNull();
  });
});

describe('CoachCommandCenter route workout context parsing', () => {
  it('keeps workoutDate and zero-credit booked-session hints for Coach requests', () => {
    const params = new URLSearchParams({
      workoutDate: '2026-06-15',
      sessionId: '314',
      sessionDate: '2026-06-15T17:00:00.000Z',
      sessionCredits: '0',
    });

    expect(getScheduledSessionRouteContextFromSearchParams(params)).toEqual({
      workoutDate: '2026-06-15',
      scheduledSessionId: '314',
      scheduledSessionDate: '2026-06-15',
      scheduledSessionCredits: 0,
    });
  });
});

describe('CoachCommandCenter thread selection route binding', () => {
  it('moves the route client to the selected thread and strips stale handoff context', () => {
    const params = new URLSearchParams({
      clientId: '42',
      intent: 'log_workout',
      source: 'clients-team',
      returnTo: '/dashboard/admin/client-management?clientId=42',
      teachPrompt: 'Old client prompt',
      sessionId: '314',
      sessionDate: '2026-06-15',
      sessionCredits: '0',
      workoutDate: '2026-06-15',
      workspace: 'plaud',
    });

    const next = buildThreadSelectionSearchParams(params, 424242, 9001);

    expect(next.get('clientId')).toBe('424242');
    expect(next.get('threadId')).toBe('9001');
    expect(next.get('intent')).toBeNull();
    expect(next.get('source')).toBeNull();
    expect(next.get('returnTo')).toBeNull();
    expect(next.get('teachPrompt')).toBeNull();
    expect(next.get('sessionId')).toBeNull();
    expect(next.get('sessionDate')).toBeNull();
    expect(next.get('sessionCredits')).toBeNull();
    expect(next.get('workoutDate')).toBeNull();
    expect(next.get('workspace')).toBe('plaud');
  });

  it('clears route client context when the selected thread has no safe target client', () => {
    const next = buildThreadSelectionSearchParams(new URLSearchParams('clientId=42&intent=log_workout&threadId=9'), null, null);

    expect(next.get('clientId')).toBeNull();
    expect(next.get('threadId')).toBeNull();
    expect(next.get('intent')).toBeNull();
  });

  it('accepts only complete positive integer thread ids', () => {
    expect(parseRouteThreadId('102')).toBe(102);
    expect(parseRouteThreadId(' 102 ')).toBe(102);
    expect(parseRouteThreadId('102junk')).toBeNull();
    expect(parseRouteThreadId('0')).toBeNull();
    expect(parseRouteThreadId(null)).toBeNull();
  });
});

describe('CoachCommandCenter route context copy', () => {
  it('uses selected-client onboarding activation copy when client context is present', () => {
    const context = buildRouteContext('client_onboarding', 'Ava Client');

    expect(context.prompt).toContain('Selected paid client onboarding activation');
    expect(context.prompt).toContain('selectedClientId');
    expect(context.prompt).not.toContain('New client onboarding intake');
    expect(context.status).toBe('Ava Client onboarding context loaded');
  });

  it('uses self-workout copy without inventing a selected client', () => {
    const context = buildRouteContext('log_self_workout', null, { workoutDate: '2026-06-18' });

    expect(context.prompt).toContain('My 2026-06-18 workout log');
    expect(context.prompt).toContain('Workout Logger');
    expect(context.prompt).not.toContain('selected client');
    expect(context.status).toBe('My 2026-06-18 workout context loaded');
  });

  it('loads message-summary copy without embedding private thread text', () => {
    const context = buildRouteContext('summarize_messages', null);

    expect(context.prompt).toContain('Message thread summary');
    expect(context.prompt).toContain('selected thread route context');
    expect(context.prompt).toContain('read-only summary');
    expect(context.prompt).toContain('draft suggested replies only after I ask');
    expect(context.prompt).not.toContain('knee');
    expect(context.prompt).not.toContain('squats');
    expect(context.status).toBe('Message thread summary context loaded');
  });
});

describe('CoachCommandCenter message action route context', () => {
  it.each([
    ['create_task_from_message', 'Create a review-gated task draft from the selected message context'],
    ['schedule_from_message', 'Prepare a review-gated schedule follow-up from the selected message context'],
    ['log_workout_from_message', 'Prepare a review-gated workout log draft from the selected message context'],
  ])('loads %s copy without embedding private message text', (intent, expectedCopy) => {
    const context = buildRouteContext(intent, null);

    expect(context.prompt).toContain(expectedCopy);
    expect(context.prompt).toContain('selected thread route context');
    expect(context.prompt).toContain('selected message reference');
    expect(context.prompt).toContain('approval');
    expect(context.prompt).not.toContain('knee');
    expect(context.prompt).not.toContain('squats');
    expect(context.status).toContain('Message action context loaded');
  });

  it('preserves only safe message identifiers in command-lane route context', () => {
    const context = buildCommandRouteContext('create_task_from_message', null, {
      threadId: '7',
      sourceMessageId: 'm-injury',
      messageText: 'knee pain after squats',
    } as any);

    expect(context).toMatchObject({
      source: 'coach-command-center',
      intent: 'create_task_from_message',
      threadId: '7',
      sourceMessageId: 'm-injury',
    });
    expect(context).not.toHaveProperty('messageText');
  });
});