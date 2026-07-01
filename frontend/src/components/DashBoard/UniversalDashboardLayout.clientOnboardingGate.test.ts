import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CLIENT_ONBOARDING_ROUTE,
  shouldRedirectClientToOnboarding,
} from './UniversalDashboardLayout.logic';

const routeComponentsSource = readFileSync(resolve(__dirname, './UniversalDashboardLayout.routeComponents.tsx'), 'utf8');

describe('UniversalDashboardLayout client onboarding gate', () => {
  it('redirects real client users with incomplete onboarding into the self-onboarding flow', () => {
    expect(shouldRedirectClientToOnboarding({
      activeRole: 'client',
      userRole: 'client',
      isOnboardingComplete: false,
      pathname: '/dashboard/client/overview',
    })).toBe(true);
  });

  it('does not loop while the incomplete client is already on onboarding', () => {
    expect(shouldRedirectClientToOnboarding({
      activeRole: 'client',
      userRole: 'client',
      isOnboardingComplete: false,
      pathname: CLIENT_ONBOARDING_ROUTE,
    })).toBe(false);
  });

  it('does not redirect admins or trainers viewing client dashboard surfaces', () => {
    expect(shouldRedirectClientToOnboarding({
      activeRole: 'client',
      userRole: 'admin',
      isOnboardingComplete: false,
      pathname: '/dashboard/client/overview',
    })).toBe(false);

    expect(shouldRedirectClientToOnboarding({
      activeRole: 'client',
      userRole: 'trainer',
      isOnboardingComplete: false,
      pathname: '/dashboard/client/overview',
    })).toBe(false);
  });

  it('treats unknown onboarding state as no redirect so stale clients refresh normally', () => {
    expect(shouldRedirectClientToOnboarding({
      activeRole: 'client',
      userRole: 'client',
      isOnboardingComplete: undefined,
      pathname: '/dashboard/client/overview',
    })).toBe(false);
  });

  it('refreshes the auth user before leaving self-onboarding to avoid a stale redirect loop', () => {
    const start = routeComponentsSource.indexOf('export const ClientSelfOnboardingPage');
    const end = routeComponentsSource.indexOf('export const AdminClientDetailsRedirect', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const wrapperBlock = routeComponentsSource.slice(start, end);
    expect(wrapperBlock).toContain('const { refreshUser } = useAuth();');
    expect(wrapperBlock).toContain('await refreshUser();');
    expect(wrapperBlock).toContain('onComplete={handleComplete}');
  });
});
