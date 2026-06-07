import { describe, expect, it } from 'vitest';
import {
  buildLoggerCompletionResult,
  buildLoggerRouteContext,
  normalizeDashboardReturnTo,
  parseLoggerClientId,
  parseLoggerSessionId,
  toLoggerClientFromInfoResponse,
} from './EnhancedWorkoutLogger.logic';

describe('EnhancedWorkoutLogger return path normalization', () => {
  it('keeps dashboard-local return paths', () => {
    expect(normalizeDashboardReturnTo('/dashboard/admin/client-management?clientId=61'))
      .toBe('/dashboard/admin/client-management?clientId=61');
  });

  it('rejects empty, external, and protocol-relative values', () => {
    expect(normalizeDashboardReturnTo(null)).toBeNull();
    expect(normalizeDashboardReturnTo('https://evil.example/dashboard/admin')).toBeNull();
    expect(normalizeDashboardReturnTo('//evil.example/dashboard/admin')).toBeNull();
    expect(normalizeDashboardReturnTo('/marketing')).toBeNull();
  });

  it('rejects dashboard-looking paths with control characters or backslashes', () => {
    expect(normalizeDashboardReturnTo('/dashboard/admin/client-management\n?clientId=61')).toBeNull();
    expect(normalizeDashboardReturnTo('/dashboard/admin/client-management\t?clientId=61')).toBeNull();
    expect(normalizeDashboardReturnTo('/dashboard\\admin\\client-management')).toBeNull();
  });
});

describe('EnhancedWorkoutLogger client identity parsing', () => {
  it('accepts only complete positive integer client ids', () => {
    expect(parseLoggerClientId('61')).toBe(61);
    expect(parseLoggerClientId(' 61 ')).toBe(61);
    expect(parseLoggerClientId(61)).toBe(61);
    expect(parseLoggerClientId('61junk')).toBeNull();
    expect(parseLoggerClientId('0')).toBeNull();
    expect(parseLoggerClientId(null)).toBeNull();
  });
});

describe('EnhancedWorkoutLogger scheduled session identity parsing', () => {
  it('keeps only complete positive integer scheduled session ids', () => {
    expect(parseLoggerSessionId('314')).toBe('314');
    expect(parseLoggerSessionId(' 314 ')).toBe('314');
    expect(parseLoggerSessionId('314junk')).toBeNull();
    expect(parseLoggerSessionId('0')).toBeNull();
    expect(parseLoggerSessionId(null)).toBeNull();
  });
});

describe('EnhancedWorkoutLogger route context', () => {
  it('redirects stale admin Client Hub full-page logging into the embedded logger', () => {
    expect(buildLoggerRouteContext({
      requestedReturnTo: '/dashboard/admin/client-management?clientId=61',
      routeClientId: 61,
      scheduledSessionId: null,
      source: 'clients-team',
      userRole: 'admin',
    })).toMatchObject({
      backToClientsLabel: 'Back to Client Hub',
      clientHubRedirectPath: '/dashboard/admin/client-management?clientId=61&tab=training&trainingSection=logger&loadPlan=today',
      isClientHubOrigin: true,
      workflowReturnPath: '/dashboard/admin/client-management?clientId=61',
    });
  });

  it('redirects bare admin clientId logging URLs into the embedded Client Hub logger', () => {
    expect(buildLoggerRouteContext({
      requestedReturnTo: null,
      routeClientId: 61,
      scheduledSessionId: null,
      source: null,
      userRole: 'admin',
    })).toMatchObject({
      backToClientsLabel: 'Back to Client Hub',
      clientHubRedirectPath: '/dashboard/admin/client-management?clientId=61&tab=training&trainingSection=logger&loadPlan=today',
      isClientHubOrigin: false,
      workflowReturnPath: '/dashboard/admin/client-management',
    });
  });

  it('redirects stale scheduled-session admin logging into the embedded Client Hub logger', () => {
    expect(buildLoggerRouteContext({
      requestedReturnTo: '/dashboard/admin/master-schedule?sessionId=314',
      routeClientId: 61,
      scheduledSessionDate: '2026-06-07',
      scheduledSessionId: '314',
      source: 'master-schedule',
      userRole: 'admin',
    })).toMatchObject({
      backToClientsLabel: 'Back to Schedule',
      clientHubRedirectPath: '/dashboard/admin/client-management?clientId=61&tab=training&trainingSection=logger&loadPlan=today&sessionId=314&sessionDate=2026-06-07',
      isClientHubOrigin: false,
      workflowReturnPath: '/dashboard/admin/master-schedule?sessionId=314',
    });
  });
});

describe('EnhancedWorkoutLogger completion feedback', () => {
  it('returns Client Hub completions to embedded history with a trimmed client name', () => {
    expect(buildLoggerCompletionResult({
      client: {
        id: 61,
        firstName: 'Jackie',
        lastName: '',
        email: '',
        availableSessions: 12,
        totalSessionsCompleted: 0,
        membershipLevel: 'basic',
      },
      isClientHubOrigin: true,
      workflowReturnPath: '/dashboard/admin/client-management?clientId=61',
    })).toEqual({
      returnPath: '/dashboard/admin/client-management?clientId=61&tab=training&trainingSection=history',
      navigationState: {
        workoutCompleted: true,
        clientName: 'Jackie',
      },
      toast: {
        title: 'Workout Completed!',
        description: 'Workout logged for Jackie. Workout saved and progress updated.',
        variant: 'default',
      },
    });
  });

  it('preserves scheduled-session return paths and includes the full client name', () => {
    expect(buildLoggerCompletionResult({
      client: {
        id: 61,
        firstName: 'Jackie',
        lastName: 'Client',
        email: '',
        availableSessions: 12,
        totalSessionsCompleted: 0,
        membershipLevel: 'basic',
      },
      isClientHubOrigin: false,
      workflowReturnPath: '/dashboard/admin/master-schedule?sessionId=314',
    })).toMatchObject({
      returnPath: '/dashboard/admin/master-schedule?sessionId=314',
      navigationState: {
        workoutCompleted: true,
        clientName: 'Jackie Client',
      },
    });
  });
});

describe('EnhancedWorkoutLogger client info mapping', () => {
  it('maps the canonical /info client payload into logger client state', () => {
    expect(toLoggerClientFromInfoResponse({
      success: true,
      client: {
        id: 61,
        firstName: 'Jackie',
        lastName: 'Client',
        email: 'jackie@example.test',
        phone: null,
        availableSessions: 12,
      },
    }, 61)).toEqual({
      id: 61,
      firstName: 'Jackie',
      lastName: 'Client',
      email: 'jackie@example.test',
      phone: undefined,
      availableSessions: 12,
      totalSessionsCompleted: 0,
      lastSessionDate: undefined,
      membershipLevel: 'basic',
    });
  });

  it('rejects missing clients and identity mismatches', () => {
    expect(() => toLoggerClientFromInfoResponse({ success: false }, 61))
      .toThrow(/client not found/i);
    expect(() => toLoggerClientFromInfoResponse({ success: true, client: { id: 62 } }, 61))
      .toThrow(/identity mismatch/i);
  });
});
