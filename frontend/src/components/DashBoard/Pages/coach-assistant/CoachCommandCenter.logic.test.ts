import { describe, expect, it } from 'vitest';

import {
  buildRouteContext,
  readHistoricalImportRouteDraft,
  buildThreadSelectionSearchParams,
  buildWorkflowReturnLabel,
  getScheduledSessionRouteContextFromSearchParams,
  normalizeCommandCenterReturnTo,
  parseRouteClientId,
  parseRouteThreadId,
} from './CoachCommandCenter.routeContext';
import { normalizeCoachCommandRole } from './CoachCommandCenter.roleConfig';

describe('CoachCommandCenter role normalization', () => {
  it('treats legacy raw user accounts as client-mode Coach users', () => {
    expect(normalizeCoachCommandRole('user')).toBe('client');
    expect(normalizeCoachCommandRole('client')).toBe('client');
    expect(normalizeCoachCommandRole('trainer')).toBe('trainer');
    expect(normalizeCoachCommandRole('admin')).toBe('admin');
  });
});

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
    expect(normalizeCommandCenterReturnTo('/dashboard/trainer/%2e%2e/admin/client-management')).toBeNull();
    expect(normalizeCommandCenterReturnTo('/dashboard/trainer/log-workout%2f..%2fadmin')).toBeNull();
    expect(normalizeCommandCenterReturnTo('/dashboard/trainer/%5cadmin/client-management')).toBeNull();
    expect(normalizeCommandCenterReturnTo('/dashboard/trainer/../admin/client-management')).toBeNull();
    expect(normalizeCommandCenterReturnTo('/store')).toBeNull();
    expect(normalizeCommandCenterReturnTo(null)).toBeNull();
  });

  it('role-scopes workflow return routes when the dashboard role is known', () => {
    expect(normalizeCommandCenterReturnTo('/dashboard/admin/client-management?clientId=42', 'admin'))
      .toBe('/dashboard/admin/client-management?clientId=42');
    expect(normalizeCommandCenterReturnTo('/dashboard/trainer/overview', 'trainer'))
      .toBe('/dashboard/trainer/overview');
    expect(normalizeCommandCenterReturnTo('/dashboard/client/overview', 'client'))
      .toBe('/dashboard/client/overview');
    expect(normalizeCommandCenterReturnTo('/dashboard/admin/client-management?clientId=42', 'trainer')).toBeNull();
    expect(normalizeCommandCenterReturnTo('/dashboard/admin/client-management?clientId=42', 'client')).toBeNull();
    expect(normalizeCommandCenterReturnTo('/dashboard/trainer/overview', 'admin')).toBeNull();
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

  it('falls back to the safe return path when source is missing or unknown', () => {
    expect(buildWorkflowReturnLabel('/dashboard/trainer/log-workout?clientId=42', null))
      .toBe('Back to Workout Logger');
    expect(buildWorkflowReturnLabel('/dashboard/admin/workout-planner?clientId=42', 'swan-coach'))
      .toBe('Back to Workout Planner');
    expect(buildWorkflowReturnLabel('/dashboard/admin/client-management?clientId=42', 'unknown-source'))
      .toBe('Back to Client Hub');
    expect(buildWorkflowReturnLabel('/dashboard/admin/schedule?date=2026-06-30', null))
      .toBe('Back to Schedule');
    expect(buildWorkflowReturnLabel('/dashboard/admin/reporting/schedule', null))
      .toBe('Back to Dashboard');
    expect(buildWorkflowReturnLabel('/dashboard/trainer/overview', null))
      .toBe('Back to Trainer Home');
    expect(buildWorkflowReturnLabel('/dashboard/admin', null)).toBe('Back to Dashboard');
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

describe('CoachCommandCenter historical import draft handoff', () => {
  it('reads TTL-bound historical import drafts and drops expired drafts', () => {
    const activeKey = 'swan-historical-import-42-123';
    const expiredKey = 'swan-historical-import-42-456';
    window.sessionStorage.setItem(activeKey, JSON.stringify({ prompt: 'Backfill client #42.', expiresAt: Date.now() + 60_000 }));
    window.sessionStorage.setItem(expiredKey, JSON.stringify({ prompt: 'Expired draft.', expiresAt: Date.now() - 1 }));

    expect(readHistoricalImportRouteDraft('historical_import', activeKey)).toBe('Backfill client #42.');
    expect(readHistoricalImportRouteDraft('historical_import', expiredKey)).toBeNull();
    expect(window.sessionStorage.getItem(expiredKey)).toBeNull();
    expect(readHistoricalImportRouteDraft('log_workout', activeKey)).toBeNull();
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
  it('keeps new-client onboarding route prompts off contact fields', () => {
    const context = buildRouteContext('client_onboarding', null);

    expect(context.prompt).toContain('New client onboarding intake');
    expect(context.prompt).toContain('client source');
    expect(context.prompt).toContain('secure access handoff stays deterministic');
    expect(context.prompt).not.toMatch(/contact details/i);
    expect(context.prompt).not.toMatch(/email|phone|claim link|reset link|password/i);
  });
  it('routes selected-client onboarding intents to existing-client coverage copy', () => {
    const context = buildRouteContext('client_onboarding', 'Ava Client');

    expect(context.prompt).toContain('Selected client onboarding coverage update');
    expect(context.prompt).toContain('existing-client context');
    expect(context.prompt).toContain('selectedClientId');
    expect(context.prompt).toContain('client_profile_coverage_update proposal');
    expect(context.prompt).not.toMatch(/paid client/i);
    expect(context.prompt).not.toContain('New client onboarding intake');
    expect(context.prompt).not.toContain('client_onboarding proposal');
    expect(context.status).toBe('Ava Client profile coverage context loaded');
  });

  it('uses existing-client coverage copy for selected-client activation onboarding', () => {
    const context = buildRouteContext('client_profile_coverage_update', 'Ava Client');

    expect(context.prompt).toContain('Selected client onboarding coverage update');
    expect(context.prompt).toContain('existing-client context');
    expect(context.prompt).toContain('client_profile_coverage_update proposal');
    expect(context.prompt).toContain('Workout logging remains available');
    expect(context.prompt).not.toContain('New client onboarding intake');
    expect(context.prompt).not.toContain('client_onboarding proposal');
    expect(context.status).toBe('Ava Client profile coverage context loaded');
  });

  it('uses self-workout copy without inventing a selected client', () => {
    const context = buildRouteContext('log_self_workout', null, { workoutDate: '2026-06-18' });

    expect(context.prompt).toContain('My 2026-06-18 workout log');
    expect(context.prompt).toContain('Workout Logger');
    expect(context.prompt).not.toContain('selected client');
    expect(context.status).toBe('My 2026-06-18 workout context loaded');
  });
});
