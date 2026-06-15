import { describe, expect, it } from 'vitest';

import {
  buildRouteContext,
  buildThreadSelectionSearchParams,
  buildWorkflowReturnLabel,
  getScheduledSessionRouteContextFromSearchParams,
  normalizeCommandCenterReturnTo,
  parseRouteClientId,
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

    const next = buildThreadSelectionSearchParams(params, 424242);

    expect(next.get('clientId')).toBe('424242');
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
    const next = buildThreadSelectionSearchParams(new URLSearchParams('clientId=42&intent=log_workout'), null);

    expect(next.get('clientId')).toBeNull();
    expect(next.get('intent')).toBeNull();
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
});
